from datetime import datetime
from typing import List, Optional, Dict, Any
from fastapi import APIRouter, HTTPException, Depends, Request
from pydantic import BaseModel, Field

from app.api.models.chat import Chat, Message

router = APIRouter()

class MessageCreate(BaseModel):
    """Model for creating a new message."""
    role: str
    content: str
    sources: Optional[List[Dict[str, Any]]] = None

class MessageResponse(BaseModel):
    """Model for message response."""
    id: str
    role: str
    content: str
    timestamp: datetime
    sources: Optional[List[Dict[str, Any]]] = None

class ChatCreate(BaseModel):
    """Model for creating a new chat."""
    title: str = "New Chat"
    document_id: Optional[str] = None

class ChatUpdate(BaseModel):
    """Model for updating a chat."""
    title: Optional[str] = None

class ChatResponse(BaseModel):
    """Model for chat response."""
    id: str
    title: str
    document_id: Optional[str] = None
    created_at: datetime
    updated_at: datetime
    message_count: int
    preview: str

class ChatWithMessagesResponse(BaseModel):
    """Model for chat with messages response."""
    chat: ChatResponse
    messages: List[MessageResponse]

@router.post("/", response_model=ChatResponse)
async def create_chat(chat_data: ChatCreate, request: Request):
    """Create a new chat."""
    try:
        # Create new chat
        chat = Chat(
            title=chat_data.title,
            document_id=chat_data.document_id,
            preview="No messages yet"
        )
        await chat.insert()
        
        return chat
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to create chat: {str(e)}")

@router.get("/", response_model=List[ChatResponse])
async def get_chats(document_id: Optional[str] = None):
    """Get all active chats, optionally filtered by document_id."""
    try:
        chats = await Chat.get_active_chats(document_id=document_id)
        return chats
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to retrieve chats: {str(e)}")

@router.get("/{chat_id}", response_model=ChatWithMessagesResponse)
async def get_chat(chat_id: str):
    """Get a chat by ID with its messages."""
    try:
        result = await Chat.get_chat_with_messages(chat_id)
        if not result:
            raise HTTPException(status_code=404, detail="Chat not found")
        return result
    except HTTPException as e:
        raise e
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to retrieve chat: {str(e)}")

@router.put("/{chat_id}", response_model=ChatResponse)
async def update_chat(chat_id: str, chat_data: ChatUpdate):
    """Update a chat."""
    try:
        chat = await Chat.get(chat_id)
        if not chat:
            raise HTTPException(status_code=404, detail="Chat not found")
        
        update_data = {}
        if chat_data.title is not None:
            update_data["title"] = chat_data.title
        
        update_data["updated_at"] = datetime.utcnow()
        
        await chat.update({"$set": update_data})
        return await Chat.get(chat_id)
    except HTTPException as e:
        raise e
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to update chat: {str(e)}")

@router.delete("/{chat_id}")
async def delete_chat(chat_id: str):
    """Delete a chat (mark as deleted)."""
    try:
        chat = await Chat.get(chat_id)
        if not chat:
            raise HTTPException(status_code=404, detail="Chat not found")
        
        # Soft delete
        await chat.update({"$set": {"deleted": True}})
        
        return {"message": f"Chat {chat_id} deleted successfully"}
    except HTTPException as e:
        raise e
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to delete chat: {str(e)}")

@router.post("/{chat_id}/messages", response_model=MessageResponse)
async def add_message(chat_id: str, message_data: MessageCreate):
    """Add a message to a chat."""
    try:
        chat = await Chat.get(chat_id)
        if not chat:
            raise HTTPException(status_code=404, detail="Chat not found")
        
        # Create message
        message = Message(
            chat_id=chat_id,
            role=message_data.role,
            content=message_data.content,
            sources=message_data.sources or []
        )
        await message.insert()
        
        # Update chat
        preview = message_data.content
        if len(preview) > 100:
            preview = preview[:97] + "..."
            
        await chat.update({
            "$set": {
                "updated_at": datetime.utcnow(),
                "preview": preview if message_data.role == "assistant" else chat.preview
            },
            "$inc": {"message_count": 1}
        })
        
        return message
    except HTTPException as e:
        raise e
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to add message: {str(e)}")

@router.get("/{chat_id}/messages", response_model=List[MessageResponse])
async def get_messages(chat_id: str):
    """Get all messages for a chat."""
    try:
        chat = await Chat.get(chat_id)
        if not chat:
            raise HTTPException(status_code=404, detail="Chat not found")
        
        messages = await Message.find({"chat_id": chat_id}).sort("+timestamp").to_list()
        return messages
    except HTTPException as e:
        raise e
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to retrieve messages: {str(e)}")

@router.delete("/{chat_id}/messages")
async def clear_messages(chat_id: str):
    """Delete all messages in a chat."""
    try:
        chat = await Chat.get(chat_id)
        if not chat:
            raise HTTPException(status_code=404, detail="Chat not found")
        
        # Delete all messages
        await Message.find({"chat_id": chat_id}).delete_many()
        
        # Update chat metadata
        await chat.update({
            "$set": {
                "updated_at": datetime.utcnow(),
                "message_count": 0,
                "preview": "No messages yet"
            }
        })
        
        return {"message": f"All messages in chat {chat_id} deleted successfully"}
    except HTTPException as e:
        raise e
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to clear messages: {str(e)}")