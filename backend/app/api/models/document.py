from typing import List, Dict, Any, Optional
from pydantic import BaseModel, Field

class DocumentBase(BaseModel):
    """Base model for document information."""
    filename: str
    type: str  # pdf, csv, etc.

class DocumentCreate(DocumentBase):
    """Model for creating a document."""
    pass

class DocumentResponse(DocumentBase):
    """Model for document response with summary and metadata."""
    id: str
    summary: str
    metadata: Dict[str, Any]
    status: str = "ready"

class DocumentListResponse(BaseModel):
    """Model for listing multiple documents."""
    documents: List[DocumentResponse]

class DocumentListUploadResponse(BaseModel):
    """Model for response after uploading multiple documents."""
    documents: List[DocumentResponse]
    failed_uploads: List[Dict[str, str]] = []

class DocumentSummaryResponse(BaseModel):
    """Model for document summary response."""
    document_id: str
    summary: str