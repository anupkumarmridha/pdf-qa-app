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
    try:
        if not question or question.strip() == "":
            raise HTTPException(status_code=400, detail="Question cannot be empty")
        
        answer, sources = qa_service.answer_document_question(question, document_id)
        
        formatted_sources = [
            SourceDocument(text=source["text"], metadata=source["metadata"])
            for source in sources
        ]
        
        return AnswerResponse(answer=answer, sources=formatted_sources)
        
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Error answering question: {str(e)}")