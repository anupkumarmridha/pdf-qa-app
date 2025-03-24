from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from app.config import settings
from app.api.routes import documents, qa, chats
from app.core.mongodb import init_mongodb

# Create FastAPI app
app = FastAPI(
    title=settings.APP_NAME,
    description=settings.APP_DESCRIPTION,
    version=settings.APP_VERSION,
)

# Add CORS middleware for frontend integration
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],  # In production, restrict this to your frontend domain
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Include API routes
app.include_router(documents.router, prefix="/api/documents", tags=["Documents"])
app.include_router(qa.router, prefix="/api/qa", tags=["Question Answering"])
app.include_router(chats.router, prefix="/api/chats", tags=["Chat History"])

@app.get("/")
async def root():
    """Root endpoint to check if the API is running."""
    return {"message": "Document Q&A API is running", "version": settings.APP_VERSION}

@app.get("/health")
async def health_check():
    """Health check endpoint."""
    return {"status": "healthy"}

@app.on_event("startup")
async def startup_db_client():
    """Initialize MongoDB connection on startup."""
    await init_mongodb()

if __name__ == "__main__":
    import uvicorn
    uvicorn.run("app.main:app", host="0.0.0.0", port=8000, reload=True)