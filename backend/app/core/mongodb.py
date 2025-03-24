import logging
from motor.motor_asyncio import AsyncIOMotorClient
from beanie import init_beanie
from app.config import settings
from app.api.models.chat import Chat, Message, SessionMetadata

logger = logging.getLogger(__name__)

async def init_mongodb():
    """Initialize MongoDB connection and register document models."""
    try:
        # Create Motor client
        client = AsyncIOMotorClient(settings.MONGODB_URI)
        
        # Initialize Beanie with the document models
        await init_beanie(
            database=client[settings.MONGODB_DB_NAME],
            document_models=[Chat, Message, SessionMetadata]
        )
        
        logger.info(f"MongoDB initialized successfully - connected to database: {settings.MONGODB_DB_NAME}")
        return client
    except Exception as e:
        logger.error(f"Failed to initialize MongoDB: {str(e)}")
        raise