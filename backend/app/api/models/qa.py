from typing import List, Dict, Any
from pydantic import BaseModel

class QuestionRequest(BaseModel):
    """Model for question request."""
    question: str

class SourceDocument(BaseModel):
    """Model for source document information."""
    text: str
    metadata: Dict[str, Any]

class AnswerResponse(BaseModel):
    """Model for question answer response."""
    answer: str
    sources: List[SourceDocument]