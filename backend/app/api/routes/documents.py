from asyncio.log import logger
import os
import shutil
import tempfile
import uuid
from typing import List, Dict, Any
from fastapi import APIRouter, UploadFile, File, Form, HTTPException, Depends, BackgroundTasks
from fastapi.responses import JSONResponse
from pydantic import BaseModel
import uuid

from app.config import settings
from app.core.document_processor import DocumentProcessor
from app.core.azure_search import AzureSearchService
from app.core.qa_chain import QAService
from app.core.s3_storage import S3StorageService
from app.api.models.document import DocumentResponse, DocumentListResponse, DocumentListUploadResponse

router = APIRouter()

# Create instances of required services
document_processor = DocumentProcessor()
azure_search_service = AzureSearchService()
qa_service = QAService()

# Initialize S3 storage service if enabled
s3_storage = S3StorageService() if settings.USE_S3_STORAGE else None

# In-memory document storage (in a real app, use a database)
documents_db = {}

class DocumentListUploadResponse(BaseModel):
    documents: List[DocumentResponse]
    failed_uploads: List[Dict[str, str]] = []
    
    

@router.get("/{document_id}/status")
async def get_document_status(document_id: str):
    """Get the processing status of a document."""
    if document_id not in documents_db:
        raise HTTPException(status_code=404, detail="Document not found")
    
    doc = documents_db[document_id]
    return {
        "document_id": document_id,
        "status": doc.get("status", "unknown"),
        "error_message": doc.get("error_message", None)
    }

async def update_document_status(document_id: str, chunks: List[Dict[str, Any]]):
    """Background task to upload chunks and update document status."""
    try:
        # Upload chunks to Azure Search
        await azure_search_service.upload_chunks(chunks)
        
        # Update document status to ready
        if document_id in documents_db:
            documents_db[document_id]["status"] = "ready"
            logger.info(f"Document {document_id} processing completed.")
    except Exception as e:
        # Set status to error if upload fails
        if document_id in documents_db:
            documents_db[document_id]["status"] = "error"
            documents_db[document_id]["error_message"] = str(e)
        logger.error(f"Error processing document {document_id}: {str(e)}")

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
        
        # Generate a unique filename
        unique_id = str(uuid.uuid4())
        unique_filename = f"{unique_id}{file_ext}"
        
        # Temporary file for processing
        temp_file_path = ""
        s3_key = ""
        
        try:
            if settings.USE_S3_STORAGE:
                # Create a temporary file to save the upload
                with tempfile.NamedTemporaryFile(delete=False, suffix=file_ext) as temp_file:
                    temp_file_path = temp_file.name
                    shutil.copyfileobj(file.file, temp_file)
                
                # Upload to S3
                s3_key = s3_storage.get_s3_key(unique_filename)
                s3_storage.upload_file(temp_file_path, s3_key)
                file_path = s3_key  # Pass S3 key as file path for metadata
            else:
                # Save to local file system
                file_path = os.path.join(settings.UPLOAD_DIR, unique_filename)
                with open(file_path, "wb") as buffer:
                    shutil.copyfileobj(file.file, buffer)
            
            # Process document
            chunks, metadata = document_processor.process_file(temp_file_path if settings.USE_S3_STORAGE else file_path)
            
            # Add storage info to metadata
            metadata["storage_type"] = "s3" if settings.USE_S3_STORAGE else "local"
            metadata["storage_path"] = s3_key if settings.USE_S3_STORAGE else file_path
            
            # Generate document summary
            summary = document_processor.summarize_document(chunks, metadata)
            
            # Store document metadata
            document_id = metadata["id"]
            documents_db[document_id] = {
                "id": document_id,
                "filename": file.filename,
                "path": s3_key if settings.USE_S3_STORAGE else file_path,
                "storage_type": "s3" if settings.USE_S3_STORAGE else "local",
                "type": metadata["type"],
                "metadata": metadata,
                "summary": summary,
                "status": "processing"
            }
            
            # Upload chunks to Azure Search (in background)
            background_tasks.add_task(update_document_status, document_id, chunks)
            
            # Add to processed documents list
            processed_documents.append(
                DocumentResponse(
                    id=document_id,
                    filename=file.filename,
                    type=metadata["type"],
                    summary=summary,
                    metadata=metadata,
                    status="processing" 
                )
            )
            
        except Exception as e:
            # Clean up the file if it was saved
            if settings.USE_S3_STORAGE:
                if s3_key and s3_storage.file_exists(s3_key):
                    s3_storage.delete_file(s3_key)
                if temp_file_path and os.path.exists(temp_file_path):
                    os.remove(temp_file_path)
            else:
                file_path = os.path.join(settings.UPLOAD_DIR, unique_filename)
                if os.path.exists(file_path):
                    os.remove(file_path)
            
            # Add to failed uploads
            failed_uploads.append({
                "filename": file.filename,
                "reason": f"Error processing document: {str(e)}"
            })
        finally:
            # Clean up temporary file if it exists
            if settings.USE_S3_STORAGE and temp_file_path and os.path.exists(temp_file_path):
                os.remove(temp_file_path)
    
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
    
    doc = documents_db[document_id]
    
    # Delete the file based on storage type
    if doc.get("storage_type") == "s3" and settings.USE_S3_STORAGE:
        s3_key = doc["path"]
        if s3_storage.file_exists(s3_key):
            s3_storage.delete_file(s3_key)
    else:
        # Local file
        file_path = doc["path"]
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