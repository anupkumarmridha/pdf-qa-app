import logging
from typing import List, Dict, Any
from langchain_openai import AzureChatOpenAI
from langchain.chains.summarize import load_summarize_chain
from langchain.prompts import PromptTemplate
from langchain.docstore.document import Document as LangchainDocument
from app.config import settings

logger = logging.getLogger(__name__)

class DocumentSummarizer:
    """Class for generating summaries of documents."""
    
    def __init__(self):
        # Initialize the language model
        self.llm = AzureChatOpenAI(
            azure_deployment=settings.AZURE_OPENAI_CHAT_DEPLOYMENT,
            api_key=settings.AZURE_OPENAI_API_KEY,
            azure_endpoint=settings.AZURE_OPENAI_ENDPOINT,
            api_version=settings.AZURE_OPENAI_API_VERSION,
        )
        
        # Set up the summary chain
        self.summary_chain = self._setup_summary_chain()
    
    def _setup_summary_chain(self):
        """
        Set up the summarization chain with custom prompts.
        
        Returns:
            LangChain summarization chain
        """
        # Define prompt for the summarization chain
        map_prompt_template = """
        You are a helpful AI assistant tasked with summarizing documents.
        
        CHUNK OF TEXT TO SUMMARIZE:
        {text}
        
        INSTRUCTIONS:
        1. Identify the key points and information in this text chunk.
        2. Create a concise summary of this specific chunk only.
        3. Focus on extracting factual information rather than opinions.
        4. If the chunk contains data, tables, or statistics, be sure to include them.
        5. Write in a clear, factual tone.
        
        SUMMARY OF THIS CHUNK:
        """
        
        map_prompt = PromptTemplate(
            template=map_prompt_template,
            input_variables=["text"]
        )
        
        combine_prompt_template = """
        You are a helpful AI assistant tasked with creating a comprehensive document summary.
        
        INDIVIDUAL CHUNK SUMMARIES:
        {text}
        
        INSTRUCTIONS:
        1. Combine the above chunk summaries into one coherent document summary.
        2. Organize the information logically, with the most important points first.
        3. Eliminate redundancies while preserving all important information.
        4. Structure the summary with appropriate headings if the document has clear sections.
        5. If the document is a PDF, include information about its structure and content.
        6. If the document is a CSV, include information about the data structure, key columns, and findings.
        7. Keep the summary concise yet comprehensive.
        
        COMPREHENSIVE DOCUMENT SUMMARY:
        """
        
        combine_prompt = PromptTemplate(
            template=combine_prompt_template,
            input_variables=["text"]
        )
        
        # Create the summary chain
        chain = load_summarize_chain(
            llm=self.llm,
            chain_type="map_reduce",
            map_prompt=map_prompt,
            combine_prompt=combine_prompt,
            verbose=True
        )
        
        return chain
    
    def generate_summary(self, chunks: List[Dict[str, Any]], metadata: Dict[str, Any]) -> str:
        """
        Generate a summary of a document based on its content chunks.
        
        Args:
            chunks: List of text chunks from the document
            metadata: Document metadata
            
        Returns:
            Document summary
        """
        try:
            logger.info(f"Generating summary for document {metadata.get('id', 'unknown')}")
            
            # Convert chunks to LangChain document format
            langchain_docs = []
            for chunk in chunks:
                langchain_docs.append(
                    LangchainDocument(
                        page_content=chunk["text"],
                        metadata=chunk["metadata"]
                    )
                )
            
            # Run the summarization chain
            summary_result = self.summary_chain.run(langchain_docs)
            
            # Post-process the summary
            summary = self._enhance_summary_with_metadata(summary_result, metadata)
            
            logger.info(f"Summary generated successfully for document {metadata.get('id', 'unknown')}")
            
            return summary
            
        except Exception as e:
            logger.error(f"Error generating summary: {str(e)}")
            # Fallback to a basic summary based on metadata
            return self._create_fallback_summary(metadata)
    
    def _enhance_summary_with_metadata(self, summary: str, metadata: Dict[str, Any]) -> str:
        """
        Enhance the generated summary with document metadata.
        
        Args:
            summary: Generated summary text
            metadata: Document metadata
            
        Returns:
            Enhanced summary
        """
        # Ensure summary is a string
        if not summary:
            summary = ""
        
        # Add document type specific information
        doc_type = metadata.get("type", "")
        
        if doc_type == "pdf":
            title = metadata.get("title", "Untitled")
            author = metadata.get("author", "Unknown")
            pages = metadata.get("pages", "Unknown")
            
            # Add metadata information at the end
            metadata_info = f"\n\nDocument Information:\n"
            if title != "Untitled":
                metadata_info += f"- Title: {title}\n"
            if author != "Unknown":
                metadata_info += f"- Author: {author}\n"
            metadata_info += f"- Pages: {pages}\n"
            metadata_info += f"- Document Type: PDF"
            
            return summary + metadata_info
            
        elif doc_type == "csv":
            rows = metadata.get("rows", "Unknown")
            columns = metadata.get("columns", [])
            
            # Add metadata information at the end
            metadata_info = f"\n\nDocument Information:\n"
            metadata_info += f"- Rows: {rows}\n"
            metadata_info += f"- Columns: {', '.join(columns)}\n"
            metadata_info += f"- Document Type: CSV"
            
            return summary + metadata_info
            
        return summary
    
    def _create_fallback_summary(self, metadata: Dict[str, Any]) -> str:
        """
        Create a basic fallback summary based on document metadata.
        
        Args:
            metadata: Document metadata
            
        Returns:
            Basic summary
        """
        doc_type = metadata.get("type", "")
        
        if doc_type == "pdf":
            title = metadata.get("title", "Untitled")
            author = metadata.get("author", "Unknown")
            pages = metadata.get("pages", "Unknown")
            
            summary = f"This is a {pages}-page PDF document"
            if title != "Untitled":
                summary += f" titled '{title}'"
            if author != "Unknown":
                summary += f" by {author}"
            summary += "."
            
        elif doc_type == "csv":
            rows = metadata.get("rows", "Unknown")
            columns = metadata.get("columns", [])
            
            summary = f"This is a CSV file with {rows} rows and {len(columns)} columns"
            if columns:
                summary += f": {', '.join(columns)}"
            summary += "."
            
        else:
            summary = f"This is a document of type '{doc_type}'."
        
        return summary + "\n\nA detailed summary could not be generated."