import os
import logging
from typing import List, Dict, Any, Optional
import json

logger = logging.getLogger(__name__)

def ensure_directory_exists(directory_path: str) -> None:
    """
    Ensure that a directory exists, creating it if it doesn't.

    Args:
        directory_path: Path to the directory to check/create
    """
    if not os.path.exists(directory_path):
        os.makedirs(directory_path)
        logger.info(f"Created directory: {directory_path}")

def clean_text(text: str) -> str:
    """
    Clean text by removing extra whitespace, etc.

    Args:
        text: Text to clean

    Returns:
        Cleaned text
    """
    # Replace multiple spaces with a single space
    text = ' '.join(text.split())
    # Replace multiple newlines with a single newline
    text = '\n'.join([line for line in text.splitlines() if line.strip()])
    return text

def format_metadata_for_display(metadata: Dict[str, Any]) -> str:
    """
    Format metadata for display in the UI.

    Args:
        metadata: Document metadata

    Returns:
        Formatted metadata string
    """
    formatted = ""
    
    # Handle different document types
    doc_type = metadata.get("type")
    
    if doc_type == "pdf":
        # Format PDF metadata
        title = metadata.get("title", "Untitled")
        author = metadata.get("author", "Unknown")
        pages = metadata.get("pages", "Unknown")
        
        formatted += f"Type: PDF\n"
        formatted += f"Title: {title}\n"
        formatted += f"Author: {author}\n"
        formatted += f"Pages: {pages}\n"
        
    elif doc_type == "csv":
        # Format CSV metadata
        rows = metadata.get("rows", "Unknown")
        columns = metadata.get("columns", [])
        
        formatted += f"Type: CSV\n"
        formatted += f"Rows: {rows}\n"
        formatted += f"Columns: {', '.join(columns)}\n"
        
    else:
        # Generic metadata formatting
        for key, value in metadata.items():
            if key not in ["id", "source"]:
                formatted += f"{key.capitalize()}: {value}\n"
    
    return formatted

def extract_filename_from_path(file_path: str) -> str:
    """
    Extract the filename from a file path.

    Args:
        file_path: File path

    Returns:
        Filename
    """
    return os.path.basename(file_path)

def safe_serialize_to_json(obj: Any) -> str:
    """
    Safely serialize an object to JSON, handling non-serializable objects.

    Args:
        obj: Object to serialize

    Returns:
        JSON string
    """
    try:
        return json.dumps(obj, default=str)
    except Exception as e:
        logger.warning(f"Error serializing object to JSON: {str(e)}")
        return json.dumps(str(obj))