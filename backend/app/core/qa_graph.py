from langgraph.graph import StateGraph, END
from langchain_core.documents import Document
from typing import List, Tuple, TypedDict, Callable, Any
import logging

logger = logging.getLogger(__name__)

class QAGraphRunner:
    def __init__(
        self,
        question: str,
        chat_history: str,
        retriever: Any,
        prompt_template: Any,
        llm: Any,
        create_context_fn: Callable[[List[Document]], str]
    ):
        self.question = question
        self.chat_history = chat_history
        self.retriever = retriever
        self.prompt_template = prompt_template
        self.llm = llm
        self.create_context = create_context_fn

    class QAState(TypedDict):
        question: str
        chat_history: str
        docs: List[Document]
        context: str
        answer: str

    def run_sync(self) -> Tuple[str, List[Document]]:
        try:
            def retrieve_docs(state: QAGraphRunner.QAState):
                docs = self.retriever.invoke(state["question"])
                logger.info(f"Retrieved {len(docs)} docs from retriever.")
                return {"docs": docs}

            def build_context(state: QAGraphRunner.QAState):
                try:
                    context = self.create_context(state["docs"])
                except Exception as e:
                    logger.warning(f"Failed to build context from docs: {e}. Using fallback.")
                    context = self.create_context(docs=None, question=state["question"])
                return {"context": context}

            def run_llm(state: QAGraphRunner.QAState):
                inputs = {
                    "chat_history": state["chat_history"],
                    "question": state["question"],
                    "context": state["context"]
                }
                result = self.llm.invoke(self.prompt_template.format(**inputs))
                return {"answer": result.content}

            graph = StateGraph(QAGraphRunner.QAState)
            graph.add_node("retrieve_docs", retrieve_docs)
            graph.add_node("build_context", build_context)
            graph.add_node("run_llm", run_llm)

            graph.add_edge("retrieve_docs", "build_context")
            graph.add_edge("build_context", "run_llm")
            graph.add_edge("run_llm", END)
            graph.set_entry_point("retrieve_docs")

            app = graph.compile()

            initial_state = {
                "question": self.question,
                "chat_history": self.chat_history,
                "docs": [],
                "context": "",
                "answer": "",
            }

            result = app.invoke(initial_state)
            return result["answer"], result["docs"]

        except Exception as e:
            logger.error(f"QAGraph execution failed: {e}")
            raise
