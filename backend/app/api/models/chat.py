from datetime import datetime
from typing import List, Optional, Dict, Any
from beanie import Document, Link
from pydantic import Field
import uuid

class Source(Document):
    """Model for source documents referenced in messages."""
    text: str = Field(...)
    metadata: Dict[str, Any] = Field(default_factory=dict)

class Message(Document):
    """Model for individual chat messages."""
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    chat_id: str = Field(...)
    role: str = Field(...)  # 'user' or 'assistant'
    content: str = Field(...)
    timestamp: datetime = Field(default_factory=datetime.utcnow)
    sources: List[Dict[str, Any]] = Field(default_factory=list)
    updated_at: Optional[datetime] = None
    
    class Settings:
        name = "messages"
        
class SessionMetadata(Document):
    """Model for storing session metadata."""
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    chat_id: str = Field(...)
    user_id: Optional[str] = Field(default=None)
    user_agent: Optional[str] = Field(default=None)
    ip_address: Optional[str] = Field(default=None)
    session_start: datetime = Field(default_factory=datetime.utcnow)
    session_end: Optional[datetime] = Field(default=None)
    
    class Settings:
        name = "session_metadata"

class Chat(Document):
    """Model for chat conversations."""
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    title: str = Field(...)
    document_id: Optional[str] = Field(default=None)  # If associated with a specific document
    created_at: datetime = Field(default_factory=datetime.utcnow)
    updated_at: datetime = Field(default_factory=datetime.utcnow)
    user_id: Optional[str] = Field(default=None)  # For future authentication support
    message_count: int = Field(default=0)
    preview: str = Field(default="")
    deleted: bool = Field(default=False)
    
    class Settings:
        name = "chats"
    
    @classmethod
    async def get_active_chats(cls, user_id: Optional[str] = None, document_id: Optional[str] = None):
        """Get active (non-deleted) chats for a user or document."""
        query = {"deleted": False}
        
        if user_id:
            query["user_id"] = user_id
            
        if document_id:
            query["document_id"] = document_id
            
        return await cls.find(query).sort("-updated_at").to_list()
    
    @classmethod
    async def get_chat_with_messages(cls, chat_id: str):
        """Get a chat and all its messages."""
        chat = await cls.get(chat_id)
        if not chat:
            return None
            
        messages = await Message.find({"chat_id": chat_id}).sort("+timestamp").to_list()
        return {
            "chat": chat,
            "messages": messages
        }