from typing import Any, Dict, List, Tuple
from langchain_core.runnables import RunnableParallel, RunnablePassthrough, RunnableLambda
from langchain.prompts import PromptTemplate
from langchain_openai import AzureChatOpenAI
from langchain.memory import ConversationBufferMemory
from app.config import settings
from app.core.azure_search import AzureSearchService
import logging

logger = logging.getLogger(__name__)

class QAService:
    """
    Service for answering questions based on documents retrieved from Azure Cognitive Search.
    Uses a retrieval augmented generation (RAG) chain with memory for generating answers.
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
        # Initialize memory to store conversation history
        self.memory = ConversationBufferMemory(memory_key="chat_history")
        self._setup_qa_chain()

    def create_context(self, docs):
        """Helper method to create context from retrieved documents."""
        return "\n\n".join([f"{doc.page_content}\nSource: {doc.metadata.get('source', 'unknown')}" for doc in docs])

    def _setup_qa_chain(self):
        try:
            logger.info("Setting up QA chain...")
            # Updated prompt template with memory and flexible instructions
            qa_prompt_template = (
                "You are a helpful AI assistant. Answer the user's question based on the conversation history and the provided context.\n\n"
                "- If the question is clear and you have enough information, provide a direct answer.\n"
                "- If the question is incomplete or ambiguous, ask a follow-up question to clarify.\n"
                "- If you cannot answer based on the available information, say you don't know.\n\n"
                "Conversation History: {chat_history}\n\n"
                "Question: {question}\n\n"
                "Context: {context}\n\n"
                "Answer:"
            )
            self.qa_prompt = PromptTemplate(
                template=qa_prompt_template,
                input_variables=["chat_history", "question", "context"]
            )
        except Exception as e:
            logger.error(f"Error setting up QA chain: {e}")
            raise e

    def answer_question(self, question: str) -> Tuple[str, List[Dict[str, Any]]]:
        """
        Answer a question by retrieving relevant documents and using the LLM with memory.
        Returns the answer as a string along with a list of source documents.
        """
        try:
            logger.info(f"Answering question: {question}")
            general_retriever = self.search_service.create_langchain_retriever(top_k=5)

            # Define the chain with memory using RunnableParallel
            self.qa_chain = RunnableParallel({
                "answer": RunnableParallel({
                    "chat_history": lambda x: self.memory.load_memory_variables({})["chat_history"],
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
            # Save the question and answer to memory
            self.memory.save_context({"question": question}, {"answer": answer})
            return answer, sources
        except Exception as e:
            logger.error(f"Error answering question: {e}")
            raise

    def answer_document_question(self, question: str, document_id: str) -> Tuple[str, List[Dict[str, Any]]]:
        """
        Answer a question for a specific document by retrieving relevant documents and using the LLM with memory.
        Returns the answer as a string along with a list of source documents.
        """
        try:
            logger.info(f"Answering question for document {document_id}: {question}")
            retriever = self.search_service.create_langchain_retriever(top_k=5, document_id=document_id)
            # Define the chain with memory using RunnableParallel
            chain = RunnableParallel({
                "answer": RunnableParallel({
                    "chat_history": lambda x: self.memory.load_memory_variables({})["chat_history"],
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
            # Save the question and answer to memory
            self.memory.save_context({"question": question}, {"answer": answer})
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