import logging
from typing import List, Dict, Any, Tuple, Optional
from langchain.chains import RetrievalQA
from langchain_core.prompts import PromptTemplate
from langchain_openai import AzureChatOpenAI

from app.config import settings
from app.core.azure_search import AzureSearchService

logger = logging.getLogger(__name__)

class QAService:
    """
    Service for answering questions based on retrieved documents.
    """
    def __init__(self):
        self.search_service = AzureSearchService()
        
        # Initialize LLM
        self.llm = AzureChatOpenAI(
            azure_deployment=settings.AZURE_OPENAI_CHAT_DEPLOYMENT,  # Corrected attribute name
            api_key=settings.AZURE_OPENAI_API_KEY,
            azure_endpoint=settings.AZURE_OPENAI_ENDPOINT,
            api_version=settings.AZURE_OPENAI_API_VERSION,
            temperature=0.3,
        )
        
        # Initialize QA chain
        self._setup_qa_chain()

    def _setup_qa_chain(self):
        """Set up the QA chain with appropriate prompts and settings"""
        # QA Prompt
        prompt_template = """
        You are a helpful AI assistant that answers questions based on provided documents.
        
        Use ONLY the following pieces of retrieved context to answer the question. 
        Don't try to make up an answer if the context doesn't contain the information.
        If you don't know the answer, just say that you don't know.
        
        Question: {question}
        
        Context:
        {context}
        
        Answer:
        """
        
        qa_prompt = PromptTemplate(
            template=prompt_template,
            input_variables=["context", "question"]
        )
        
        # Create retriever - don't specify k in both places
        retriever = self.search_service.create_langchain_retriever(top_k=5)
        
        # Create QA chain
        self.qa_chain = RetrievalQA.from_chain_type(
            llm=self.llm,
            chain_type="stuff",
            retriever=retriever,
            chain_type_kwargs={"prompt": qa_prompt},
            return_source_documents=True
        )

    def answer_question(self, question: str) -> Tuple[str, List[Dict[str, Any]]]:
        """
        Answer a question using the QA chain and return sources.
        
        Args:
            question: The question to answer
            
        Returns:
            Tuple of (answer, sources)
        """
        try:
            logger.info(f"Answering question: {question}")
            
            # Use invoke instead of __call__
            result = self.qa_chain.invoke({"question": question})
            
            # Extract answer and sources
            answer = result.get("result", "")
            
            # Format source documents
            sources = []
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
        Generate a summary for a specific document.
        
        Args:
            document_id: ID of the document to summarize
            
        Returns:
            Summary text
        """
        try:
            # Use a specific question to generate a summary
            answer, _ = self.answer_question(
                f"Please provide a concise summary of document {document_id}."
            )
            return answer
        except Exception as e:
            logger.error(f"Error generating summary: {str(e)}")
            return "Could not generate summary due to an error."