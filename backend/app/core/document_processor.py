import os
import uuid
import pandas as pd
from PyPDF2 import PdfReader
from langchain.text_splitter import RecursiveCharacterTextSplitter
from app.config import settings
from typing import List, Dict, Tuple, Optional, Union, Any

class DocumentProcessor:
    """
    Class for processing various document types (PDF, CSV) and converting them to text chunks.
    """
    
    def __init__(self):
        self.text_splitter = RecursiveCharacterTextSplitter(
            chunk_size=settings.CHUNK_SIZE,
            chunk_overlap=settings.CHUNK_OVERLAP,
            length_function=len,
        )
    
    def process_file(self, file_path: str) -> Tuple[List[Dict[str, Any]], Dict[str, Any]]:
        """
        Process a file and return text chunks with metadata.
        
        Args:
            file_path: Path to the file to process
            
        Returns:
            Tuple containing:
            - List of chunk dictionaries with text and metadata
            - Document metadata
        """
        file_ext = os.path.splitext(file_path)[1].lower()
        
        if file_ext == '.pdf':
            return self.process_pdf(file_path)
        elif file_ext == '.csv':
            return self.process_csv(file_path)
        else:
            raise ValueError(f"Unsupported file type: {file_ext}")
    
    def process_pdf(self, pdf_path: str) -> Tuple[List[Dict[str, Any]], Dict[str, Any]]:
        """
        Extract text from a PDF file and split it into chunks.
        
        Args:
            pdf_path: Path to the PDF file
            
        Returns:
            Tuple containing:
            - List of chunk dictionaries with text and metadata
            - Document metadata
        """
        # Extract text from PDF
        text = ""
        metadata = {
            "source": os.path.basename(pdf_path),
            "type": "pdf",
            "id": str(uuid.uuid4()),
            "uploadTime": str(pd.Timestamp.now())
        }
        
        try:
            pdf_reader = PdfReader(pdf_path)
            metadata["title"] = pdf_reader.metadata.title if pdf_reader.metadata and pdf_reader.metadata.title else "Untitled"
            metadata["author"] = pdf_reader.metadata.author if pdf_reader.metadata and pdf_reader.metadata.author else "Unknown"
            metadata["pages"] = len(pdf_reader.pages)
            
            # Extract text from each page
            for page_num, page in enumerate(pdf_reader.pages):
                page_text = page.extract_text()
                if page_text:
                    text += f"\n\n--- Page {page_num + 1} ---\n\n{page_text}"
        except Exception as e:
            raise ValueError(f"Error processing PDF: {str(e)}")
        
        # Split text into chunks
        chunks = self.text_splitter.create_documents([text])
        
        # Convert to list of dictionaries with metadata
        result = []
        for i, chunk in enumerate(chunks):
            result.append({
                "id": f"{metadata['id']}_chunk_{i}",
                "text": chunk.page_content,
                "metadata": {
                    "source": metadata["source"],
                    "type": metadata["type"],
                    "document_id": metadata["id"],
                    "chunk_index": i
                }
            })
        
        return result, metadata
    
    def process_csv(self, csv_path: str) -> Tuple[List[Dict[str, Any]], Dict[str, Any]]:
        """
        Process a CSV file and convert it to text chunks.
        
        Args:
            csv_path: Path to the CSV file
            
        Returns:
            Tuple containing:
            - List of chunk dictionaries with text and metadata
            - Document metadata
        """
        metadata = {
            "source": os.path.basename(csv_path),
            "type": "csv",
            "id": str(uuid.uuid4()),
            "uploadTime": str(pd.Timestamp.now())
        }
        
        try:
            # Read CSV file
            df = pd.read_csv(csv_path)
            metadata["rows"] = len(df)
            metadata["columns"] = list(df.columns)
            
            # Convert CSV to text representation
            text = f"CSV File: {os.path.basename(csv_path)}\n\n"
            
            # Add column descriptions
            text += "Columns: " + ", ".join(df.columns) + "\n\n"
            
            # Convert each row to text
            rows_text = ""
            for index, row in df.iterrows():
                rows_text += f"Row {index + 1}:\n"
                for column in df.columns:
                    rows_text += f"  {column}: {row[column]}\n"
                rows_text += "\n"
            
            # Add summary statistics for numerical columns
            text += "Summary Statistics:\n"
            for column in df.columns:
                if pd.api.types.is_numeric_dtype(df[column]):
                    text += f"  {column}:\n"
                    text += f"    Mean: {df[column].mean()}\n"
                    text += f"    Min: {df[column].min()}\n"
                    text += f"    Max: {df[column].max()}\n"
                    text += f"    Median: {df[column].median()}\n\n"
            
            # Add the rows text
            text += "\nData Rows:\n" + rows_text
            
        except Exception as e:
            raise ValueError(f"Error processing CSV: {str(e)}")
        
        # Split text into chunks
        chunks = self.text_splitter.create_documents([text])
        
        # Convert to list of dictionaries with metadata
        result = []
        for i, chunk in enumerate(chunks):
            result.append({
                "id": f"{metadata['id']}_chunk_{i}",
                "text": chunk.page_content,
                "metadata": {
                    "source": metadata["source"],
                    "type": metadata["type"],
                    "document_id": metadata["id"],
                    "chunk_index": i
                }
            })
        
        return result, metadata
    
    def summarize_document(self, chunks: List[Dict[str, Any]], metadata: Dict[str, Any]) -> str:
        """
        Create a summary of the document based on its content chunks.
        This is a placeholder method - in a real implementation, you would use 
        a language model to generate a summary based on the document content.
        
        Args:
            chunks: List of text chunks from the document
            metadata: Document metadata
            
        Returns:
            Document summary
        """
        # In a real implementation, you would:
        # 1. Select representative chunks or combine them
        # 2. Use a language model to generate a summary
        # For now, we'll return a simple metadata-based summary
        
        doc_type = metadata["type"]
        
        if doc_type == "pdf":
            num_pages = metadata.get("pages", "Unknown")
            title = metadata.get("title", "Untitled")
            author = metadata.get("author", "Unknown")
            
            summary = f"This is a {num_pages}-page PDF document"
            if title != "Untitled":
                summary += f" titled '{title}'"
            if author != "Unknown":
                summary += f" by {author}"
            summary += "."
            
        elif doc_type == "csv":
            num_rows = metadata.get("rows", "Unknown")
            columns = metadata.get("columns", [])
            
            summary = f"This is a CSV file with {num_rows} rows and {len(columns)} columns: {', '.join(columns)}."
        
        else:
            summary = f"This is a document of type '{doc_type}'."
        
        # Note: In a real application, you would use a language model here
        # to generate a proper content-based summary
        
        return summary