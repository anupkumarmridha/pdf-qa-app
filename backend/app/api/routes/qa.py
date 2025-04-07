from typing import List, Dict, Any, Optional
from fastapi import APIRouter, HTTPException, Depends, Query
from pydantic import BaseModel

from app.core.qa_chain import QAService
from app.api.models.qa import QuestionRequest, SourceDocument, AnswerResponse
from app.api.models.chat import Chat, Message

router = APIRouter()

# Initialize QA service
qa_service = QAService()

class QuestionWithChatRequest(BaseModel):
    """Model for question request with optional chat ID."""
    question: str
    chat_id: Optional[str] = None
    is_regeneration: Optional[bool] = False

@router.post("/ask", response_model=AnswerResponse)
async def ask_question(question_request: QuestionWithChatRequest):
    """
    Answer a question based on the uploaded documents.
    Optionally use a chat_id to maintain conversation context.
    """
    try:
        question = question_request.question
        chat_id = question_request.chat_id
        
        # Check that the question is not empty
        if not question or question.strip() == "":
            raise HTTPException(status_code=400, detail="Question cannot be empty")
        
        # If chat_id is provided, load the chat history synchronously first
        chat_history = None
        if chat_id:
            # Get messages for this chat from MongoDB
            messages = await Message.find({"chat_id": chat_id}).sort("+timestamp").to_list()
            
            # Format messages for the prompt
            if messages:
                chat_history = "\n\n".join([
                    f"{'User' if msg.role == 'user' else 'Assistant'}: {msg.content}"
                    for msg in messages
                ])
        
        # Get answer from QA service, passing chat history directly
        answer, sources = qa_service.answer_question(question, chat_id, chat_history)
        
        # Convert sources to the expected format
        formatted_sources = [
            SourceDocument(text=source["text"], metadata=source["metadata"])
            for source in sources
        ]
        
        return AnswerResponse(answer=answer, sources=formatted_sources)
        
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Error answering question: {str(e)}")

@router.get("/documents/{document_id}/ask", response_model=AnswerResponse)
async def ask_document_question(
    document_id: str, 
    question: str = Query(..., description="The question to ask"),
    chat_id: Optional[str] = Query(None, description="Optional chat ID for conversation context")
):
    """
    Answer a question about a specific document.
    Optionally use a chat_id to maintain conversation context.
    """
    try:
        if not question or question.strip() == "":
            raise HTTPException(status_code=400, detail="Question cannot be empty")
        
        # If chat_id is provided, load the chat history synchronously first
        chat_history = None
        if chat_id:
            # Get messages for this chat from MongoDB
            messages = await Message.find({"chat_id": chat_id}).sort("+timestamp").to_list()
            
            # Format messages for the prompt
            if messages:
                chat_history = "\n\n".join([
                    f"{'User' if msg.role == 'user' else 'Assistant'}: {msg.content}"
                    for msg in messages
                ])
        
        # Get answer from QA service, passing document_id and chat history directly
        answer, sources = qa_service.answer_document_question(question, document_id, chat_id, chat_history)
        
        formatted_sources = [
            SourceDocument(text=source["text"], metadata=source["metadata"])
            for source in sources
        ]
        
        return AnswerResponse(answer=answer, sources=formatted_sources)
        
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Error answering question: {str(e)}")

@router.post("/clear-memory")
async def clear_qa_memory():
    """
    Clear the QA service's conversation memory.
    Useful for testing or when starting fresh conversations.
    """
    try:
        qa_service.clear_memory()
        return {"message": "Conversation memory cleared successfully"}
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Error clearing memory: {str(e)}")