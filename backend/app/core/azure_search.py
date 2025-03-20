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
    SearchFieldDataType,
    VectorSearch,
    VectorSearchAlgorithmConfiguration,
    HnswParameters,
)
from langchain_community.vectorstores import AzureSearch
from langchain_openai import AzureOpenAIEmbeddings
from app.config import settings

logger = logging.getLogger(__name__)

class SchemaConfig:
    """Configuration class for defining the search index schema"""
    def __init__(
        self,
        id_field: str = "id",
        content_field: str = "content",
        content_vector_field: str = "content_vector",
        metadata_field: str = "metadata",
        vector_dimensions: int = 3072,
        vector_search_profile_name: str = "vector-config",
        hnsw_parameters: Optional[HnswParameters] = None
    ):
        self.id_field = id_field
        self.content_field = content_field
        self.content_vector_field = content_vector_field
        self.metadata_field = metadata_field
        self.vector_dimensions = vector_dimensions
        self.vector_search_profile_name = vector_search_profile_name
        self.hnsw_parameters = hnsw_parameters or HnswParameters(
            m=4,
            ef_construction=400,
            ef_search=500,
            metric="cosine"
        )

class AzureSearchService:
    """
    Service for interacting with Azure AI Search with configurable schema.
    """
    def __init__(self, schema_config: Optional[SchemaConfig] = None):
        self.schema_config = schema_config or SchemaConfig()
        self.service_endpoint = f"https://{settings.AZURE_SEARCH_SERVICE}.search.windows.net"
        self.index_name = settings.AZURE_SEARCH_INDEX_NAME
        self.credential = AzureKeyCredential(settings.AZURE_SEARCH_KEY)

        # Initialize clients
        self.index_client = SearchIndexClient(
            endpoint=self.service_endpoint,
            credential=self.credential
        )
        self.search_client = SearchClient(
            endpoint=self.service_endpoint,
            index_name=self.index_name,
            credential=self.credential
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
        """Create SearchIndex definition based on schema configuration"""
        return SearchIndex(
            name=self.index_name,
            fields=[
                SimpleField(
                    name=self.schema_config.id_field,
                    type=SearchFieldDataType.String,
                    key=True
                ),
                SearchableField(
                    name=self.schema_config.content_field,
                    type=SearchFieldDataType.String
                ),
                SimpleField(
                    name=self.schema_config.content_vector_field,
                    type=SearchFieldDataType.Collection(SearchFieldDataType.Single),
                    vector_search_dimensions=self.schema_config.vector_dimensions,
                    vector_search_profile_name=self.schema_config.vector_search_profile_name
                ),
                SimpleField(
                    name=self.schema_config.metadata_field,
                    type=SearchFieldDataType.String
                ),
            ],
            vector_search=VectorSearch(
                algorithms=[
                    VectorSearchAlgorithmConfiguration(
                        name=self.schema_config.vector_search_profile_name,
                        kind="hnsw",
                        hnsw_parameters=self.schema_config.hnsw_parameters
                    )
                ]
            )
        )

    def _ensure_index_exists(self) -> None:
        """Create index if it doesn't exist"""
        try:
            existing_indexes = [index.name for index in self.index_client.list_indexes()]
            if self.index_name not in existing_indexes:
                logger.info(f"Creating index: {self.index_name}")
                index = self._get_index_definition()
                self.index_client.create_index(index)
                logger.info(f"Created index: {self.index_name}")
            else:
                logger.info(f"Index already exists: {self.index_name}")
        except Exception as e:
            logger.error(f"Error ensuring index exists: {str(e)}")
            raise

    def upload_chunks(self, chunks: List[Dict[str, Any]]) -> None:
        """
        Upload document chunks with schema-aware mapping.
        Chunks should contain keys matching schema_config fields.
        """
        try:
            documents = []
            for chunk in chunks:
                # Get content from either 'text' or the configured content field
                if 'text' in chunk:
                    content = chunk['text']
                elif self.schema_config.content_field in chunk:
                    content = chunk[self.schema_config.content_field]
                else:
                    logger.warning(f"Chunk missing required content field: {chunk}")
                    continue
                    
                # Generate embedding using the content field
                embedding = self.embeddings.embed_query(content)
                
                # Get ID from either 'id' or the configured id field
                chunk_id = chunk.get('id', chunk.get(self.schema_config.id_field))
                if not chunk_id:
                    logger.warning(f"Chunk missing required ID field: {chunk}")
                    continue
                
                document = {
                    self.schema_config.id_field: chunk_id,
                    self.schema_config.content_field: content,
                    self.schema_config.content_vector_field: embedding,
                    self.schema_config.metadata_field: json.dumps(
                        chunk.get('metadata', chunk.get(self.schema_config.metadata_field, {}))
                    )
                }
                documents.append(document)

            # Batch upload documents
            if documents:
                for i in range(0, len(documents), 100):
                    batch = documents[i:i+100]
                    self.search_client.upload_documents(documents=batch)
                logger.info(f"Uploaded {len(documents)} chunks")
            else:
                logger.warning("No valid documents to upload")
        except Exception as e:
            logger.error(f"Error uploading chunks: {str(e)}")
            # Re-raise for higher level error handling if needed
            raise
        
    def search_documents(self, query: str, top_k: int = 5) -> List[Dict[str, Any]]:
        """Perform vector search using configured schema"""
        try:
            query_embedding = self.embeddings.embed_query(query)
            results = self.search_client.search(
                search_text=None,
                vector=query_embedding,
                top=top_k,
                vector_fields=self.schema_config.content_vector_field,
                select=[
                    self.schema_config.id_field,
                    self.schema_config.content_field,
                    self.schema_config.metadata_field
                ]
            )

            return [{
                "id": result[self.schema_config.id_field],
                "content": result[self.schema_config.content_field],
                "metadata": json.loads(result[self.schema_config.metadata_field]),
                "score": result["@search.score"]
            } for result in results]
        except Exception as e:
            logger.error(f"Search error: {str(e)}")
            raise
        
        
    def create_langchain_retriever(self, top_k: int = 5):
        """Create LangChain retriever with schema-aware configuration"""
        vector_store = AzureSearch(
            azure_search_endpoint=self.service_endpoint,
            azure_search_key=settings.AZURE_SEARCH_KEY,
            index_name=self.index_name,
            embedding_function=self.embeddings.embed_query,
            content_field=self.schema_config.content_field,
            vector_field=self.schema_config.content_vector_field,
            metadata_field=self.schema_config.metadata_field,
            search_type="similarity",
            # Don't set a default k here, let it be controlled by search_kwargs
        )
        return vector_store.as_retriever()  # Removed search_kwargs here

    
    