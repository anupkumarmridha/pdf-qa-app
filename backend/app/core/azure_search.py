import json
import logging
from typing import List, Dict, Any, Optional

from azure.core.credentials import AzureKeyCredential
from azure.search.documents import SearchClient
from azure.search.documents.indexes import SearchIndexClient
from azure.search.documents.indexes.models import (
    SearchIndex,
    SimpleField,
    SearchableField,
    SearchField,
    SearchFieldDataType,
    VectorSearch,
    VectorSearchProfile,
    HnswAlgorithmConfiguration,
    HnswParameters,
)
from langchain_community.retrievers import AzureAISearchRetriever
from langchain_openai import AzureOpenAIEmbeddings
from app.config import settings

logger = logging.getLogger(__name__)


class SchemaConfig:
    """Configuration for the Azure AI Search index schema."""

    def __init__(
        self,
        id_field: str = "id",
        content_field: str = "content",
        content_vector_field: str = "content_vector",
        metadata_field: str = "metadata",
        vector_dimensions: int = 3072,  # Default for text-embedding-ada-002
        vector_search_profile_name: str = "my-vector-config",
        hnsw_parameters: Optional[HnswParameters] = None,
    ):
        self.id_field = id_field
        self.content_field = content_field
        self.content_vector_field = content_vector_field
        self.metadata_field = metadata_field
        self.vector_dimensions = vector_dimensions
        self.vector_search_profile_name = vector_search_profile_name
        self.hnsw_parameters = hnsw_parameters or HnswParameters(
            m=4, ef_construction=400, ef_search=500, metric="cosine"
        )


class AzureSearchService:
    """
    Service for interacting with Azure AI Search with a configurable schema.
    Supports index creation, document upload, vector search, and LangChain integration.
    """

    def __init__(self, schema_config: Optional[SchemaConfig] = None):
        """Initialize the Azure AI Search service with schema and credentials."""
        self.schema_config = schema_config or SchemaConfig()
        self.service_endpoint = f"https://{settings.AZURE_SEARCH_SERVICE}.search.windows.net"
        self.index_name = settings.AZURE_SEARCH_INDEX_NAME
        self.credential = AzureKeyCredential(settings.AZURE_SEARCH_KEY)

        # Initialize clients
        self.index_client = SearchIndexClient(
            endpoint=self.service_endpoint, credential=self.credential
        )
        self.search_client = SearchClient(
            endpoint=self.service_endpoint,
            index_name=self.index_name,
            credential=self.credential,
        )

        # Initialize embedding model
        self.embeddings = AzureOpenAIEmbeddings(
            azure_deployment=settings.AZURE_OPENAI_EMBEDDING_DEPLOYMENT,
            api_key=settings.AZURE_OPENAI_API_KEY,
            azure_endpoint=settings.AZURE_OPENAI_ENDPOINT,
            api_version=settings.AZURE_OPENAI_EMBEDDING_API_VERSION,
        )

        self._ensure_index_exists()

    def _get_index_definition(self) -> SearchIndex:
        """Build and return the SearchIndex definition based on schema configuration."""
        fields = [
            SimpleField(
                name=self.schema_config.id_field,
                type=SearchFieldDataType.String,
                key=True,
                filterable=True,
            ),
            SearchableField(
                name=self.schema_config.content_field,
                type=SearchFieldDataType.String,
                searchable=True,
            ),
            SearchField(
                name=self.schema_config.content_vector_field,
                type=SearchFieldDataType.Collection(SearchFieldDataType.Single),
                searchable=True,
                vector_search_dimensions=self.schema_config.vector_dimensions,
                vector_search_profile_name=self.schema_config.vector_search_profile_name,
            ),
            SearchableField(
                name=self.schema_config.metadata_field,
                type=SearchFieldDataType.String,
                searchable=True,
                filterable=True,
            ),
        ]

        vector_search = VectorSearch(
            profiles=[
                VectorSearchProfile(
                    name=self.schema_config.vector_search_profile_name,
                    algorithm_configuration_name="hnsw-config",
                )
            ],
            algorithms=[
                HnswAlgorithmConfiguration(
                    name="hnsw-config",
                    parameters=self.schema_config.hnsw_parameters,
                )
            ],
        )

        return SearchIndex(name=self.index_name, fields=fields, vector_search=vector_search)

    def _ensure_index_exists(self) -> None:
        try:
            self.index_client.get_index(self.index_name)
            logger.info(f"Index '{self.index_name}' already exists. Deleting and recreating...")
            self.index_client.delete_index(self.index_name)
        except Exception as e:
            logger.info(f"Creating index '{self.index_name}' due to: {e}")
        index_definition = self._get_index_definition()
        self.index_client.create_index(index_definition)
        logger.info(f"Successfully created index '{self.index_name}'.")
        
    def upload_chunks(self, chunks: List[Dict[str, Any]]) -> None:
        """Upload document chunks to Azure AI Search with computed embeddings."""
        documents = []
        for chunk in chunks:
            content = chunk.get("text") or chunk.get(self.schema_config.content_field)
            if not content:
                logger.warning(f"Chunk missing content: {chunk}")
                continue

            chunk_id = chunk.get("id") or chunk.get(self.schema_config.id_field)
            if not chunk_id:
                logger.warning(f"Chunk missing ID: {chunk}")
                continue

            embedding = self.embeddings.embed_query(content)
            document = {
                self.schema_config.id_field: str(chunk_id),  # Ensure string type for ID
                self.schema_config.content_field: content,
                self.schema_config.content_vector_field: embedding,
                self.schema_config.metadata_field: json.dumps(
                    chunk.get("metadata", {})
                ),
            }
            documents.append(document)

        if not documents:
            logger.warning("No valid documents to upload.")
            return

        # Upload in batches of 100
        batch_size = 100
        for i in range(0, len(documents), batch_size):
            batch = documents[i : i + batch_size]
            try:
                self.search_client.upload_documents(documents=batch)
                logger.info(f"Uploaded batch {i // batch_size + 1}: {len(batch)} documents.")
            except Exception as e:
                logger.error(f"Failed to upload batch starting at index {i}: {e}")
                raise

    def search_documents(self, query: str, top_k: int = 5) -> List[Dict[str, Any]]:
        """Perform a vector search using the query embedding."""
        try:
            query_embedding = self.embeddings.embed_query(query)
            results = self.search_client.search(
                search_text="*",  # Use wildcard for vector-only search
                vectors=[{
                    "value": query_embedding,
                    "fields": self.schema_config.content_vector_field,
                    "k": top_k,
                }],
                select=[
                    self.schema_config.id_field,
                    self.schema_config.content_field,
                    self.schema_config.metadata_field,
                ],
            )

            return [
                {
                    "id": result[self.schema_config.id_field],
                    "content": result[self.schema_config.content_field],
                    "metadata": json.loads(result.get(self.schema_config.metadata_field, "{}")),
                    "score": result.get("@search.score", 0.0),
                }
                for result in results
            ]
        except Exception as e:
            logger.error(f"Vector search failed: {e}")
            raise

    def create_langchain_retriever(self, top_k: int = 5) -> AzureAISearchRetriever:
        """Create a LangChain retriever for Azure AI Search."""
        retriever = AzureAISearchRetriever(
            content_key=self.schema_config.content_field,
            top_k=top_k,
            index_name=self.index_name,
            service_name=settings.AZURE_SEARCH_SERVICE,
            api_key=settings.AZURE_SEARCH_KEY,
        )
        return retriever
