import os
import shutil
from typing import List, Dict, Any
from fastapi import APIRouter, UploadFile, File, Form, HTTPException, Depends, BackgroundTasks
from fastapi.responses import JSONResponse
from pydantic import BaseModel
import uuid

from app.config import settings
from app.core.document_processor import DocumentProcessor
from app.core.azure_search import AzureSearchService
from app.core.qa_chain import QAService
from app.api.models.document import DocumentResponse, DocumentListResponse, DocumentListUploadResponse

router = APIRouter()

# Create instances of required services
document_processor = DocumentProcessor()
azure_search_service = AzureSearchService()
qa_service = QAService()

# In-memory document storage (in a real app, use a database)
documents_db = {}

class DocumentListUploadResponse(BaseModel):
    documents: List[DocumentResponse]
    failed_uploads: List[Dict[str, str]] = []

@router.post("/upload", response_model=DocumentListUploadResponse)
async def upload_documents(
    background_tasks: BackgroundTasks,
    files: List[UploadFile] = File(...),
):
    """
    Upload multiple documents (PDF or CSV) for processing and indexing.
    """
    if not files:
        raise HTTPException(status_code=400, detail="No files uploaded")
    
    processed_documents = []
    failed_uploads = []
    
    for file in files:
        # Check file extension
        file_ext = os.path.splitext(file.filename)[1].lower()
        if file_ext not in ['.pdf', '.csv']:
            failed_uploads.append({
                "filename": file.filename,
                "reason": "Unsupported file type. Only PDF and CSV files are supported"
            })
            continue
        
        # Generate unique filename
        unique_filename = f"{uuid.uuid4()}{file_ext}"
        file_path = os.path.join(settings.UPLOAD_DIR, unique_filename)
        
        try:
            # Save uploaded file
            with open(file_path, "wb") as buffer:
                shutil.copyfileobj(file.file, buffer)
            
            # Process document
            chunks, metadata = document_processor.process_file(file_path)
            
            # Generate document summary
            summary = document_processor.summarize_document(chunks, metadata)
            
            # Store document metadata
            document_id = metadata["id"]
            documents_db[document_id] = {
                "id": document_id,
                "filename": file.filename,
                "path": file_path,
                "type": metadata["type"],
                "metadata": metadata,
                "summary": summary
            }
            
            # Upload chunks to Azure Search (in background)
            background_tasks.add_task(azure_search_service.upload_chunks, chunks)
            
            # Add to processed documents list
            processed_documents.append(
                DocumentResponse(
                    id=document_id,
                    filename=file.filename,
                    type=metadata["type"],
                    summary=summary,
                    metadata=metadata
                )
            )
            
        except Exception as e:
            # Clean up the file if it was saved
            if os.path.exists(file_path):
                os.remove(file_path)
            
            # Add to failed uploads
            failed_uploads.append({
                "filename": file.filename,
                "reason": f"Error processing document: {str(e)}"
            })
    
    # If no documents were processed successfully, return an error
    if not processed_documents and failed_uploads:
        raise HTTPException(
            status_code=400, 
            detail="All uploads failed", 
            headers={"X-Failed-Uploads": str(failed_uploads)}
        )
    
    return DocumentListUploadResponse(
        documents=processed_documents,
        failed_uploads=failed_uploads
    )

@router.get("/", response_model=DocumentListResponse)
async def list_documents():
    """
    List all uploaded documents.
    """
    document_list = []
    for doc_id, doc in documents_db.items():
        document_list.append(DocumentResponse(
            id=doc["id"],
            filename=doc["filename"],
            type=doc["type"],
            summary=doc["summary"],
            metadata=doc["metadata"]
        ))
    
    return DocumentListResponse(documents=document_list)

@router.get("/{document_id}", response_model=DocumentResponse)
async def get_document(document_id: str):
    """
    Get document details by ID.
    """
    if document_id not in documents_db:
        raise HTTPException(status_code=404, detail="Document not found")
    
    doc = documents_db[document_id]
    return DocumentResponse(
        id=doc["id"],
        filename=doc["filename"],
        type=doc["type"],
        summary=doc["summary"],
        metadata=doc["metadata"]
    )

@router.delete("/{document_id}")
async def delete_document(document_id: str):
    """
    Delete a document by ID.
    """
    if document_id not in documents_db:
        raise HTTPException(status_code=404, detail="Document not found")
    
    # Get file path
    file_path = documents_db[document_id]["path"]
    
    # Delete file if it exists
    if os.path.exists(file_path):
        os.remove(file_path)
    
    # Remove from in-memory database
    del documents_db[document_id]
    
    # Note: In a real implementation, you would also delete the document chunks
    # from Azure Search. This would require implementing a deletion method
    # in the AzureSearchService class.
    
    return {"message": f"Document {document_id} deleted successfully"}

@router.get("/{document_id}/summary")
async def get_document_summary(document_id: str):
    """
    Get or generate a summary for a document.
    """
    if document_id not in documents_db:
        raise HTTPException(status_code=404, detail="Document not found")
    
    # Get existing summary or generate a new one
    doc = documents_db[document_id]
    if doc.get("summary"):
        summary = doc["summary"]
    else:
        # Generate summary using QA service
        summary = qa_service.generate_summary(document_id)
        # Update document with new summary
        documents_db[document_id]["summary"] = summary
    
    return {"document_id": document_id, "summary": summary}