import logging
from typing import Dict, List, Any, Tuple
from langchain_openai import AzureChatOpenAI
from langchain.prompts import PromptTemplate
from langchain.chains import RetrievalQA
from langchain.chains.question_answering import load_qa_chain
from app.config import settings
from app.core.azure_search import AzureSearchService

logger = logging.getLogger(__name__)

class QAService:
    """Service for document-based question answering."""
    
    def __init__(self):
        # Initialize Azure search service
        self.search_service = AzureSearchService()
        
        # Initialize the language model
        self.llm = AzureChatOpenAI(
            azure_deployment=settings.AZURE_OPENAI_CHAT_DEPLOYMENT,
            api_key=settings.AZURE_OPENAI_API_KEY,
            azure_endpoint=settings.AZURE_OPENAI_ENDPOINT,
            api_version=settings.AZURE_OPENAI_API_VERSION,
        )
        
        # Create the retriever
        self.retriever = self.search_service.create_langchain_retriever(top_k=5)
        
        # Setup QA chain
        self.qa_chain = self._setup_qa_chain()
    
    def _setup_qa_chain(self) -> RetrievalQA:
        """
        Set up the question answering chain with custom prompts.
        
        Returns:
            LangChain QA chain
        """
        # Define prompt for the QA chain
        prompt_template = """
        You are a helpful AI assistant that answers questions based on provided documents.
        
        CONTEXT:
        {context}
        
        QUESTION:
        {question}
        
        INSTRUCTIONS:
        1. Answer the question based ONLY on the information provided in the CONTEXT.
        2. If the CONTEXT doesn't contain the information needed to answer the question, say "I don't have enough information to answer this question."
        3. Be concise, clear, and factual.
        4. Don't make up information not present in the CONTEXT.
        5. Base your answer strictly on the content of the CONTEXT.
        
        ANSWER:
        """
        
        prompt = PromptTemplate(
            template=prompt_template,
            input_variables=["context", "question"]
        )
        
        # Create chain
        chain_type_kwargs = {"prompt": prompt}
        qa = RetrievalQA.from_chain_type(
            llm=self.llm,
            chain_type="stuff",
            retriever=self.retriever,
            chain_type_kwargs=chain_type_kwargs,
            return_source_documents=True,
        )
        
        return qa
    
    def answer_question(self, question: str) -> Tuple[str, List[Dict[str, Any]]]:
        """
        Answer a question based on the documents in the vector store.
        
        Args:
            question: The question to answer
            
        Returns:
            Tuple containing:
            - Answer text
            - List of source documents with text and metadata
        """
        try:
            # Run the QA chain
            result = self.qa_chain({"query": question})
            
            # Extract answer and source documents
            answer = result.get("result", "")
            sources = []
            
            # Process source documents
            for doc in result.get("source_documents", []):
                source = {
                    "text": doc.page_content,
                    "metadata": doc.metadata
                }
                sources.append(source)
            
            return answer, sources
            
        except Exception as e:
            logger.error(f"Error answering question: {str(e)}")
            raise
    
    def generate_summary(self, document_id: str) -> str:
        """
        Generate a summary for a document based on its chunks in the vector store.
        
        Args:
            document_id: ID of the document to summarize
            
        Returns:
            Document summary
        """
        try:
            # In a real implementation, you would retrieve all chunks for the 
            # document and use the LLM to generate a summary based on those chunks.
            
            # For simplicity, we'll use a custom search to get document chunks
            # and then use the LLM to generate a summary
            
            # This simplified implementation uses a predetermined query to retrieve
            # document chunks and then generates a summary from them
            
            summary_prompt = f"""
            Generate a comprehensive summary of this document with ID {document_id}.
            The summary should capture the main topics, key points, and important details.
            
            Organize the summary in a clear structure with sections if appropriate.
            
            Document chunks:
            """
            
            # In a real implementation, you would use something like:
            # document_chunks = self.search_service.search_client.search(
            #     search_text="*",
            #     filter=f"metadata/document_id eq '{document_id}'",
            #     select=["text"],
            #     top=100
            # )
            
            # For simplicity, we'll just use a placeholder and direct generation via LLM
            summary = "This is a placeholder summary. In a real implementation, the summary would be generated by analyzing the document chunks and using an LLM to create a coherent summary."
            
            return summary
            
        except Exception as e:
            logger.error(f"Error generating summary: {str(e)}")
            raise