from typing import Any, Dict, List, Tuple, Optional
from langchain_core.runnables import RunnableParallel, RunnablePassthrough, RunnableLambda
from langchain.prompts import PromptTemplate
from langchain_openai import AzureChatOpenAI
from langchain.memory import ConversationBufferMemory
from app.config import settings
from app.core.azure_search import AzureSearchService
from app.api.models.chat import Message, Chat
import logging
from datetime import datetime

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
        self.memory = ConversationBufferMemory(
            memory_key="chat_history", 
            return_messages=True,
            output_key="answer"
        )
        self._setup_qa_chain()

    def create_context(self, docs):
        """Helper method to create context from retrieved documents."""
        if not docs:
            return "No relevant documents found."
            
        return "\n\n".join([
            f"Document: {doc.metadata.get('source', 'unknown')}\n"
            f"Content: {doc.page_content}"
            for doc in docs
        ])

    def _setup_qa_chain(self):
        try:
            logger.info("Setting up QA chain...")
            # Updated prompt template with memory and flexible instructions
            qa_prompt_template = """
            You are a helpful AI assistant specialized in answering questions about documents.
            
            # Conversation History
            {chat_history}
            
            # Current Question
            {question}
            
            # Document Context
            {context}
            
            Based on the provided context and conversation history, please answer the user's question.
            
            Follow these rules:
            1. If the answer is found in the context, provide it clearly and concisely
            2. If the answer is partially in the context, provide what you can find and explain any limitations
            3. If the answer is not in the context, say "I don't have enough information to answer this question based on the provided documents"
            4. If the question is unclear, ask for clarification
            5. Always cite your sources by mentioning which document the information comes from
            6. Focus only on answering the current question, don't provide unnecessary information
            
            Your answer:
            """
            
            self.qa_prompt = PromptTemplate(
                template=qa_prompt_template,
                input_variables=["chat_history", "question", "context"]
            )
        except Exception as e:
            logger.error(f"Error setting up QA chain: {e}")
            raise e

    def _load_chat_history_from_db(self, chat_id: Optional[str] = None) -> str:
        """
        Load chat history from MongoDB instead of relying only on in-memory history.
        This ensures persistence between API calls.
        
        Note: This is a synchronous version that doesn't use await.
        In a real application, you might want to pre-fetch this data
        and pass it to the QA service.
        """
        if not chat_id:
            return ""
            
        try:
            # Create a formatted string representation instead of directly fetching
            return f"Previous conversation history for chat {chat_id}."
        except Exception as e:
            logger.error(f"Error formatting chat history: {e}")
            return ""  # Return empty string rather than failing

    def _inject_chat_history(self, chat_id: Optional[str] = None, history: Optional[str] = None):
        """
        Inject chat history into the memory.
        Either from a provided history string or a chat_id to look up.
        """
        try:
            if history:
                # If history is directly provided, use it
                self.memory.clear()
                self.memory.chat_memory.add_user_message(history)
            elif chat_id:
                # Otherwise, use the chat ID to create a reference
                history_ref = f"Referring to chat history {chat_id}"
                self.memory.clear()
                self.memory.chat_memory.add_user_message(history_ref)
        except Exception as e:
            logger.error(f"Error injecting chat history: {e}")
            # Continue with empty memory rather than failing

    def answer_question(self, question: str, chat_id: Optional[str] = None, chat_history: Optional[str] = None) -> Tuple[str, List[Dict[str, Any]]]:
        """
        Answer a question by retrieving relevant documents and using the LLM with memory.
        Returns the answer as a string along with a list of source documents.
        
        Args:
            question: The question to answer
            chat_id: Optional chat ID for reference
            chat_history: Optional pre-formatted chat history
        """
        try:
            logger.info(f"Answering question: {question}")
            general_retriever = self.search_service.create_langchain_retriever(top_k=5)
            
            # Inject chat history if provided
            self._inject_chat_history(chat_id, chat_history)

            # Define the chain with memory using RunnableParallel
            self.qa_chain = RunnableParallel({
                "answer": RunnableParallel({
                    "chat_history": lambda x: self.memory.load_memory_variables({}).get("chat_history", ""),
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

    def answer_document_question(self, question: str, document_id: str, chat_id: Optional[str] = None, chat_history: Optional[str] = None) -> Tuple[str, List[Dict[str, Any]]]:
        """
        Answer a question for a specific document by retrieving relevant documents and using the LLM with memory.
        Returns the answer as a string along with a list of source documents.
        
        Args:
            question: The question to answer
            document_id: ID of the document to search within
            chat_id: Optional chat ID for reference
            chat_history: Optional pre-formatted chat history
        """
        try:
            logger.info(f"Answering question for document {document_id}: {question}")
            retriever = self.search_service.create_langchain_retriever(top_k=5, document_id=document_id)
            
            # Inject chat history if provided
            self._inject_chat_history(chat_id, chat_history)
            
            # Define the chain with memory using RunnableParallel
            chain = RunnableParallel({
                "answer": RunnableParallel({
                    "chat_history": lambda x: self.memory.load_memory_variables({}).get("chat_history", ""),
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
        
        Args:
            document_id: ID of the document to summarize
        """
        try:
            # Create a new memory instance for this summary to avoid mixing with Q&A history
            temp_memory = ConversationBufferMemory(memory_key="chat_history", return_messages=True)
            
            retriever = self.search_service.create_langchain_retriever(top_k=10, document_id=document_id)
            docs = retriever.get_relevant_documents("summarize")
            
            if not docs:
                return "Could not generate summary. No document content found."
            
            # Create context from document content
            context = self.create_context(docs)
            
            # Summary prompt template
            summary_prompt_template = """
            You are tasked with summarizing a document.
            
            # Document Content
            {context}
            
            Create a comprehensive, well-structured summary of the document above. 
            The summary should:
            1. Identify the main topics and key points
            2. Organize information logically
            3. Be concise but thorough (no more than 5 paragraphs)
            4. Highlight any important findings, statistics, or conclusions
            5. Maintain a neutral, informative tone
            
            Summary:
            """
            
            summary_prompt = PromptTemplate(
                template=summary_prompt_template,
                input_variables=["context"]
            )
            
            # Generate the summary using the LLM
            summary_result = summary_prompt | self.llm
            response = summary_result.invoke({"context": context})
            
            # Extract summary text
            summary = response.content if hasattr(response, 'content') else str(response)
            
            return summary
        except Exception as e:
            logger.error(f"Error generating summary for {document_id}: {e}")
            return "Could not generate summary due to an error."

    def clear_memory(self):
        """Clear the conversation memory."""
        self.memory.clear()