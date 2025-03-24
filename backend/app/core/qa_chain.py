from typing import Any, Dict, List, Tuple
from langchain_core.runnables import RunnableMap, RunnableLambda, RunnablePassthrough
from langchain.prompts import PromptTemplate
from langchain_openai import AzureChatOpenAI
from app.config import settings
from app.core.azure_search import AzureSearchService
import logging

logger = logging.getLogger(__name__)

class QAService:
    """
    Service for answering questions based on documents retrieved from Azure Cognitive Search.
    Uses a retrieval augmented generation (RAG) chain for generating answers.
    """

    def __init__(self):
        self.search_service = AzureSearchService()
        self.llm = AzureChatOpenAI(
            deployment_name=settings.AZURE_OPENAI_CHAT_DEPLOYMENT,
            openai_api_key=settings.AZURE_OPENAI_API_KEY,
            azure_endpoint=settings.AZURE_OPENAI_ENDPOINT,
            openai_api_version=settings.AZURE_OPENAI_API_VERSION,
            temperature=0.3,
        )
        self._setup_qa_chain()

    def create_context(self, docs):
        """Helper method to create context from retrieved documents."""
        return "\n\n".join([f"{doc.page_content}\nSource: {doc.metadata.get('source', 'unknown')}" for doc in docs])

    def _setup_qa_chain(self):
        try:
            logger.info("Setting up QA chain...")
            qa_prompt_template = (
                "You are a helpful AI assistant that answers questions based on provided documents.\n\n"
                "Use ONLY the following retrieved context to answer the question. "
                "If the context does not contain the answer, simply say you don't know.\n\n"
                "Question: {question}\n\n"
                "Context:\n{context}\n\n"
                "Answer:"
            )
            self.qa_prompt = PromptTemplate(
                template=qa_prompt_template,
                input_variables=["question", "context"]
            )
        except Exception as e:
            logger.error(f"Error setting up QA chain: {e}")
            raise e
    def answer_question(self, question: str) -> Tuple[str, List[Dict[str, Any]]]:
        """
        Answer a question by retrieving relevant documents and using the LLM.
        Returns the answer as a string along with a list of source documents.
        """
        try:
            logger.info(f"Answering question: {question}")
            general_retriever = self.search_service.create_langchain_retriever(top_k=5)

            self.qa_chain = RunnableMap({
                "answer": RunnableMap({
                    "context": general_retriever | RunnableLambda(self.create_context),
                    "question": RunnablePassthrough(),
                }) | self.qa_prompt | self.llm,
                "source_documents": general_retriever,
            })
            result = self.qa_chain.invoke({"question": question})
            # Extract the string content from the AIMessage object
            answer_message = result["answer"]
            answer = answer_message.content if hasattr(answer_message, 'content') else str(answer_message)
            sources = [{"text": doc.page_content, "metadata": doc.metadata} for doc in result["source_documents"]]
            return answer, sources
        except Exception as e:
            logger.error(f"Error answering question: {e}")
            raise
    
    def answer_document_question(self, question: str, document_id: str) -> Tuple[str, List[Dict[str, Any]]]:
        """
        Answer a question for a specific document by retrieving relevant documents and using the LLM.
        Returns the answer as a string along with a list of source documents.
        """
        try:
            logger.info(f"Answering question for document {document_id}: {question}")
            retriever = self.search_service.create_langchain_retriever(top_k=5, document_id=document_id)
            chain = RunnableMap({
                "answer": RunnableMap({
                    "context": retriever | RunnableLambda(self.create_context),
                    "question": RunnablePassthrough(),
                }) | self.qa_prompt | self.llm,
                "source_documents": retriever,
            })
            result = chain.invoke({"question": question})
            # Extract the string content from the AIMessage object
            answer_message = result["answer"]
            answer = answer_message.content if hasattr(answer_message, 'content') else str(answer_message)
            sources = [{"text": doc.page_content, "metadata": doc.metadata} for doc in result["source_documents"]]
            return answer, sources
        except Exception as e:
            logger.error(f"Error answering question for document {document_id}: {e}")
            raise
        
    def generate_summary(self, document_id: str) -> str:
        """
        Generate a summary for a document identified by document_id.
        """
        try:
            summary, _ = self.answer_question(f"Please provide a concise summary of document {document_id}.")
            return summary
        except Exception as e:
            logger.error(f"Error generating summary for {document_id}: {e}")
            return "Could not generate summary due to an error."