import json
import logging
from typing import List, Dict, Any, Optional
import requests
from app.config import settings
from azure.core.credentials import AzureKeyCredential
from azure.search.documents import SearchClient
from azure.search.documents.indexes import SearchIndexClient
from azure.search.documents.indexes.models import (
    SearchIndex,
    SearchField,
    SearchFieldDataType,
    SimpleField,
    SearchableField,
    VectorSearch,
    VectorSearchAlgorithmConfiguration,
    HnswParameters,
)
from langchain_community.vectorstores.azure_search import AzureSearch
from langchain_openai import AzureOpenAIEmbeddings
from langchain_core.documents import Document

logger = logging.getLogger(__name__)

class AzureSearchService:
    """Service for interacting with Azure AI Search."""
    
    def __init__(self):
        """Initialize the Azure Search service with config from settings."""
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
            api_version=settings.AZURE_OPENAI_API_VERSION,
        )
        
        # Ensure the index exists
        self._ensure_index_exists()
    
    def _ensure_index_exists(self) -> None:
        """
        Check if the search index exists and create it if it doesn't.
        """
        try:
            # Check if index exists
            if self.index_name not in [index.name for index in self.index_client.list_indexes()]:
                logger.info(f"Creating index: {self.index_name}")
                
                # Create index definition
                index = SearchIndex(
                    name=self.index_name,
                    fields=[
                        SimpleField(name="id", type=SearchFieldDataType.String, key=True),
                        SearchableField(name="text", type=SearchFieldDataType.String),
                        SimpleField(name="embedding", type=SearchFieldDataType.Collection(SearchFieldDataType.Single), 
                                    vector_search_dimensions=1536, vector_search_profile_name="vector-config"),
                        SimpleField(name="metadata", type=SearchFieldDataType.String),
                    ],
                    vector_search=VectorSearch(
                        algorithms=[
                            VectorSearchAlgorithmConfiguration(
                                name="vector-config",
                                kind="hnsw",
                                hnsw_parameters=HnswParameters(
                                    m=4,
                                    ef_construction=400,
                                    ef_search=500,
                                    metric="cosine"
                                )
                            )
                        ]
                    )
                )
                
                # Create the index
                self.index_client.create_index(index)
                logger.info(f"Created index: {self.index_name}")
            else:
                logger.info(f"Index already exists: {self.index_name}")
                
        except Exception as e:
            logger.error(f"Error ensuring index exists: {str(e)}")
            raise
    
    def upload_chunks(self, chunks: List[Dict[str, Any]]) -> None:
        """
        Upload document chunks to Azure AI Search.
        
        Args:
            chunks: List of dictionaries containing document chunks with text and metadata
        """
        try:
            # Convert chunks to the format expected by Azure Search
            documents = []
            
            for chunk in chunks:
                # Generate embeddings for the chunk text
                embedding = self.embeddings.embed_query(chunk["text"])
                
                # Create document
                document = {
                    "id": chunk["id"],
                    "text": chunk["text"],
                    "embedding": embedding,
                    "metadata": json.dumps(chunk["metadata"])
                }
                
                documents.append(document)
            
            # Upload documents in batches of 100 (Azure Search limit)
            for i in range(0, len(documents), 100):
                batch = documents[i:i+100]
                self.search_client.upload_documents(batch)
                
            logger.info(f"Uploaded {len(documents)} chunks to Azure AI Search")
            
        except Exception as e:
            logger.error(f"Error uploading chunks to Azure AI Search: {str(e)}")
            raise
    
    def search_documents(self, query: str, top_k: int = 5) -> List[Dict[str, Any]]:
        """
        Search for documents based on the provided query.
        
        Args:
            query: The query string
            top_k: Number of top results to return
            
        Returns:
            List of search results with text and metadata
        """
        try:
            # Generate embedding for the query
            query_embedding = self.embeddings.embed_query(query)
            
            # Perform vector search
            results = self.search_client.search(
                search_text=None,
                vector=query_embedding,
                top_k=top_k,
                vector_fields="embedding",
                select=["id", "text", "metadata"]
            )
            
            # Process results
            processed_results = []
            for result in results:
                processed_results.append({
                    "id": result["id"],
                    "text": result["text"],
                    "metadata": json.loads(result["metadata"]),
                    "score": result["@search.score"]
                })
            
            return processed_results
            
        except Exception as e:
            logger.error(f"Error searching documents: {str(e)}")
            raise
    
    def create_langchain_retriever(self, top_k: int = 5):
        """
        Create a LangChain retriever backed by Azure AI Search.
        
        Args:
            top_k: Number of documents to retrieve
            
        Returns:
            LangChain retriever object
        """
        vector_store = AzureSearch(
            azure_search_endpoint=self.service_endpoint,
            azure_search_key=settings.AZURE_SEARCH_KEY,
            index_name=self.index_name,
            embedding_function=self.embeddings.embed_query,
            search_type="similarity",
        )
        
        return vector_store.as_retriever(search_kwargs={"k": top_k})