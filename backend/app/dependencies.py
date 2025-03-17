from fastapi import Depends, HTTPException, status
from app.core.document_processor import DocumentProcessor
from app.core.azure_search import AzureSearchService
from app.core.qa_chain import QAService

# Dependency to get document processor
def get_document_processor():
    return DocumentProcessor()

# Dependency to get Azure search service
def get_azure_search_service():
    return AzureSearchService()

# Dependency to get QA service
def get_qa_service():
    return QAService()