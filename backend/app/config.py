import os
from pydantic_settings import BaseSettings
from dotenv import load_dotenv

load_dotenv()  # Load environment variables from .env file

class Settings(BaseSettings):
    # Application Settings
    APP_NAME: str = os.getenv("APP_NAME", "Document Q&A API")
    APP_VERSION: str = os.getenv("APP_VERSION", "0.1.0")
    APP_DESCRIPTION: str = os.getenv("APP_DESCRIPTION", "API for document-based question answering using Azure AI Search")
    
    # Azure AI Search Settings
    AZURE_SEARCH_SERVICE: str = os.getenv("AZURE_SEARCH_SERVICE", "")
    AZURE_SEARCH_KEY: str = os.getenv("AZURE_SEARCH_KEY", "")
    AZURE_SEARCH_INDEX_NAME: str = os.getenv("AZURE_SEARCH_INDEX_NAME", "documents-index")
    
    # Azure OpenAI Settings
    AZURE_OPENAI_API_KEY: str = os.getenv("AZURE_OPENAI_API_KEY", "")
    AZURE_OPENAI_ENDPOINT: str = os.getenv("AZURE_OPENAI_ENDPOINT", "")
    AZURE_OPENAI_API_VERSION: str = os.getenv("AZURE_OPENAI_API_VERSION", "2024-02-15-preview")
    AZURE_OPENAI_EMBEDDING_API_VERSION: str = os.getenv("AZURE_OPENAI_EMBEDDING_API_VERSION", "2023-05-15")
    AZURE_OPENAI_EMBEDDING_DEPLOYMENT: str = os.getenv("AZURE_OPENAI_EMBEDDING_DEPLOYMENT", "text-embedding-3-large")
    AZURE_OPENAI_CHAT_DEPLOYMENT: str = os.getenv("AZURE_OPENAI_CHAT_DEPLOYMENT", "gpt-4o-mini")
    
    # File Upload Settings
    UPLOAD_DIR: str = os.getenv("UPLOAD_DIR", "uploads")
    MAX_UPLOAD_SIZE: int = int(os.getenv("MAX_UPLOAD_SIZE", 10 * 1024 * 1024))  # 10MB default
    
    # Document Storage
    DOCUMENT_STORAGE_PATH: str = os.getenv("DOCUMENT_STORAGE_PATH", "document_storage.json")
    
    # S3 Storage Settings
    USE_S3_STORAGE: bool = os.getenv("USE_S3_STORAGE", "False").lower() == "true"
    AWS_ACCESS_KEY_ID: str = os.getenv("AWS_ACCESS_KEY_ID", "")
    AWS_SECRET_ACCESS_KEY: str = os.getenv("AWS_SECRET_ACCESS_KEY", "")
    AWS_REGION: str = os.getenv("AWS_REGION", "us-east-1")
    S3_BUCKET_NAME: str = os.getenv("S3_BUCKET_NAME", "")
    S3_PREFIX: str = os.getenv("S3_PREFIX", "documents/")
    
    # Chunking Settings
    CHUNK_SIZE: int = int(os.getenv("CHUNK_SIZE", 1000))
    CHUNK_OVERLAP: int = int(os.getenv("CHUNK_OVERLAP", 200))
    
    class Config:
        env_file = ".env"
        case_sensitive = True
        extra = "ignore"  # This will ignore any extra fields not defined in the model

settings = Settings()

# Ensure upload directory exists (for local storage)
if not settings.USE_S3_STORAGE:
    os.makedirs(settings.UPLOAD_DIR, exist_ok=True)