from typing import Any, Dict, List, Tuple, Optional
from langchain.prompts import PromptTemplate
from langchain_openai import AzureChatOpenAI
from langchain.memory import ConversationBufferMemory
from app.config import settings
from app.core.azure_search import AzureSearchService
from .summarizer import MapReduceSummarizer
from app.core.qa_graph import QAGraphRunner
import logging

logger = logging.getLogger(__name__)

class QAService:
    def __init__(self):
        self.search_service = AzureSearchService()
        self.llm = AzureChatOpenAI(
            deployment_name=settings.AZURE_OPENAI_CHAT_DEPLOYMENT,
            openai_api_key=settings.AZURE_OPENAI_API_KEY,
            azure_endpoint=settings.AZURE_OPENAI_ENDPOINT,
            openai_api_version=settings.AZURE_OPENAI_API_VERSION,
            temperature=0.3,
        )
        self.memory = ConversationBufferMemory(
            memory_key="chat_history", 
            return_messages=True,
            output_key="answer"
        )
        self._setup_qa_chain()
        self.summarizer = MapReduceSummarizer(llm=self.llm, token_max=4000)

    def create_context(self, docs=None, question: Optional[str] = None):
        if docs and isinstance(docs[0], dict):
            sorted_docs = sorted(docs, key=lambda x: x["score"], reverse=True)
            top_n = 3
            relevant_docs = sorted_docs[:top_n]
            return "\n\n".join([
                f"Document: {doc['metadata'].get('source', 'unknown')}\nContent: {doc['content']}"
                for doc in relevant_docs
            ])

        elif docs and hasattr(docs[0], "page_content"):
            return "\n\n".join([
                f"Document: {doc.metadata.get('source', 'unknown')}\nContent: {doc.page_content}"
                for doc in docs[:3]
            ])

        elif question:
            fallback_results = self.search_service.search_documents(query=question, top_k=3)
            return self.create_context(docs=fallback_results)

        return "No relevant documents found."

    def _setup_qa_chain(self):
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

    def _inject_chat_history(self, chat_id: Optional[str] = None, history: Optional[str] = None):
        try:
            self.memory.clear()
            if history:
                self.memory.chat_memory.add_user_message(history)
            elif chat_id:
                history_ref = f"Referring to chat history {chat_id}"
                self.memory.chat_memory.add_user_message(history_ref)
        except Exception as e:
            logger.error(f"Error injecting chat history: {e}")

    def answer_question(self, question: str, chat_id: Optional[str] = None, chat_history: Optional[str] = None) -> Tuple[str, List[Dict[str, Any]]]:
        self._inject_chat_history(chat_id, chat_history)
        chat_mem = self.memory.load_memory_variables({}).get("chat_history", "")
        retriever = self.search_service.create_langchain_retriever(top_k=5)

        graph_runner = QAGraphRunner(
            question=question,
            chat_history=chat_mem,
            retriever=retriever,
            prompt_template=self.qa_prompt,
            llm=self.llm,
            create_context_fn=self.create_context
        )
        answer, docs = graph_runner.run_sync()
        self.memory.save_context({"question": question}, {"answer": answer})
        sources = [{"text": doc.page_content, "metadata": doc.metadata} for doc in docs]
        return answer, sources

    def answer_document_question(self, question: str, document_id: str, chat_id: Optional[str] = None, chat_history: Optional[str] = None) -> Tuple[str, List[Dict[str, Any]]]:
        self._inject_chat_history(chat_id, chat_history)
        chat_mem = self.memory.load_memory_variables({}).get("chat_history", "")
        retriever = self.search_service.create_langchain_retriever(top_k=5, document_id=document_id)

        graph_runner = QAGraphRunner(
            question=question,
            chat_history=chat_mem,
            retriever=retriever,
            prompt_template=self.qa_prompt,
            llm=self.llm,
            create_context_fn=self.create_context
        )
        answer, docs = graph_runner.run_sync()
        
        print(f"Answer: {answer}")
        print(f"Docs: {docs}")
        if not docs:
            logger.warning(f"No content found for document ID: {document_id}")
            return "Could not generate answer. No document content found.", []
        
        self.memory.save_context({"question": question}, {"answer": answer})
        sources = [{"text": doc.page_content, "metadata": doc.metadata} for doc in docs]
        return answer, sources

    def generate_summary(self, document_id: str) -> str:
        try:
            retriever = self.search_service.create_langchain_retriever(top_k=20, document_id=document_id)
            docs = self._fetch_documents(retriever)

            if not docs:
                logger.warning(f"No content found to summarize for document ID: {document_id}")
                return "Could not generate summary. No document content found."

            summary = self.summarizer.generate_summary(docs)
            return summary

        except Exception as e:
            logger.error(f"Error generating summary for {document_id}: {e}")
            return f"Could not generate summary due to an error: {str(e)}"

    def _fetch_documents(self, retriever) -> List[Any]:
        return retriever.invoke("summarize")

    def clear_memory(self):
        self.memory.clear()
        logger.info("Memory cleared.")
