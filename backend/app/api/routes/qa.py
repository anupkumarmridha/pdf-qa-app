from typing import List, Dict, Any
from fastapi import APIRouter, HTTPException, Depends
from pydantic import BaseModel

from app.core.qa_chain import QAService
from app.api.models.qa import QuestionRequest, SourceDocument, AnswerResponse

router = APIRouter()

# Initialize QA service
qa_service = QAService()

@router.post("/ask", response_model=AnswerResponse)
async def ask_question(question_request: QuestionRequest):
    """
    Answer a question based on the uploaded documents.
    """
    try:
        question = question_request.question
        
        # Check that the question is not empty
        if not question or question.strip() == "":
            raise HTTPException(status_code=400, detail="Question cannot be empty")
        
        # Get answer from QA service
        answer, sources = qa_service.answer_question(question)
        
        # Convert sources to the expected format
        formatted_sources = [
            SourceDocument(text=source["text"], metadata=source["metadata"])
            for source in sources
        ]
        
        return AnswerResponse(answer=answer, sources=formatted_sources)
        
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Error answering question: {str(e)}")

@router.get("/documents/{document_id}/ask", response_model=AnswerResponse)
async def ask_document_question(document_id: str, question: str):
    """
    Answer a question about a specific document.
    """
    try:
        # This implementation doesn't filter by document_id directly
        # In a real application, you would modify the retriever to filter by document_id
        # For now, we'll use the general QA service
        
        # Check that the question is not empty
        if not question or question.strip() == "":
            raise HTTPException(status_code=400, detail="Question cannot be empty")
        
        # Get answer from QA service
        answer, sources = qa_service.answer_question(question)
        
        # Filter sources to only include those from this document
        # (This is a workaround - in a real app, you'd filter at the retrieval stage)
        filtered_sources = [
            source for source in sources 
            if source["metadata"].get("document_id") == document_id
        ]
        
        # If no sources from this document were used, return a warning
        if not filtered_sources:
            answer = "I couldn't find information about this in the specified document."
            
        # Convert sources to the expected format
        formatted_sources = [
            SourceDocument(text=source["text"], metadata=source["metadata"])
            for source in filtered_sources
        ]
        
        return AnswerResponse(answer=answer, sources=formatted_sources)
        
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Error answering question: {str(e)}")