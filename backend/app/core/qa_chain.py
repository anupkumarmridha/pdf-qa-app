from typing import Any, Dict, List, Tuple
from langchain_core.runnables import RunnableMap, RunnableLambda, RunnablePassthrough
from langchain.prompts import PromptTemplate
from langchain_openai import AzureChatOpenAI  # Updated import
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

    def _setup_qa_chain(self):
        try:
            logger.info("Setting up QA chain...")
            def create_context(docs):
                return "\n\n".join([f"{doc.page_content}\nSource: {doc.metadata.get('source', 'unknown')}" for doc in docs])

            qa_prompt_template = (
                "You are a helpful AI assistant that answers questions based on provided documents.\n\n"
                "Use ONLY the following retrieved context to answer the question. "
                "If the context does not contain the answer, simply say you don't know.\n\n"
                "Question: {question}\n\n"
                "Context:\n{context}\n\n"
                "Answer:"
            )
            qa_prompt = PromptTemplate(
                template=qa_prompt_template,
                input_variables=["question", "context"]
            )

            retriever = self.search_service.create_langchain_retriever(top_k=5)

            self.qa_chain = RunnableMap({
                "answer": RunnableMap({
                    "context": retriever | RunnableLambda(create_context),
                    "question": RunnablePassthrough(),
                }) | qa_prompt | self.llm,
                "source_documents": retriever,
            })
        except Exception as e:
            logger.error(f"Error setting up QA chain: {e}")
            raise e

    def answer_question(self, question: str) -> Tuple[str, List[Dict[str, Any]]]:
        """
        Answer a question by retrieving relevant documents and using the LLM.
        Returns the answer along with a list of source documents.
        """
        try:
            logger.info(f"Answering question: {question}")
            result = self.qa_chain.invoke({"question": question})
            answer = result["answer"]
            sources = [{"text": doc.page_content, "metadata": doc.metadata} for doc in result["source_documents"]]
            return answer, sources
        except Exception as e:
            logger.error(f"Error answering question: {e}")
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