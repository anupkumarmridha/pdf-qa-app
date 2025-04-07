import operator
import logging
from typing import Annotated, List, Literal, TypedDict, Any

from langchain_core.output_parsers import StrOutputParser
from langchain_core.prompts import ChatPromptTemplate
from langchain_core.documents import Document
from langchain_core.language_models import BaseChatModel
from langchain.chains.combine_documents.reduce import (
    acollapse_docs,
    split_list_of_docs,
)
from langgraph.graph import END, START, StateGraph
from langgraph.constants import Send

logger = logging.getLogger(__name__)

class MapReduceSummarizer:
    """
    Document summarizer using LangGraph's map-reduce pattern.
    
    Uses Azure OpenAI to generate summaries in a hierarchical fashion,
    allowing for summarization of documents of any length.
    """
    
    def __init__(self, llm: BaseChatModel, token_max: int = 4000):
        """
        Initialize the summarizer.
        
        Args:
            llm: The language model to use for summarization
            token_max: Maximum tokens for each summarization step
        """
        self.llm = llm
        self.token_max = token_max
        
        # Define map and reduce prompts
        map_prompt = ChatPromptTemplate.from_messages([
            ("human", "Write a concise summary of the following:\n\n{context}")
        ])
        self.map_chain = map_prompt | self.llm | StrOutputParser()
        
        reduce_template = """
        The following is a set of summaries:
        {docs}
        Take these and distill it into a final, consolidated summary 
        of the main themes.
        """
        reduce_prompt = ChatPromptTemplate.from_messages([
            ("human", reduce_template)
        ])
        self.reduce_chain = reduce_prompt | self.llm | StrOutputParser()
    
    def _length_function(self, documents: List[Document]) -> int:
        """Get number of tokens for input contents."""
        return sum(len(doc.page_content.split()) * 1.3 for doc in documents)  # Rough token estimate
    
    async def generate_summary(self, documents: List[Document]) -> str:
        """
        Generate a summary for a list of documents.
        
        Args:
            documents: List of Document objects to summarize
            
        Returns:
            A summarized string
        """
        if not documents:
            return "No documents provided for summarization."
        
        # Set up the graph states
        class OverallState(TypedDict):
            contents: List[str]
            summaries: Annotated[list, operator.add]
            collapsed_summaries: List[Document]
            final_summary: str
            
        class SummaryState(TypedDict):
            content: str
        
        # Graph node functions
        async def generate_chunk_summary(state: SummaryState):
            response = await self.map_chain.ainvoke({"context": state["content"]})
            return {"summaries": [response]}
            
        def map_summaries(state: OverallState):
            return [
                Send("generate_chunk_summary", {"content": content}) 
                for content in state["contents"]
            ]
            
        def collect_summaries(state: OverallState):
            return {
                "collapsed_summaries": [Document(page_content=summary) for summary in state["summaries"]]
            }
            
        async def collapse_summaries(state: OverallState):
            doc_lists = split_list_of_docs(
                state["collapsed_summaries"], self._length_function, self.token_max
            )
            results = []
            for doc_list in doc_lists:
                content = "\n".join([doc.page_content for doc in doc_list])
                result = await self.reduce_chain.ainvoke({"docs": content})
                results.append(Document(page_content=result))
            return {"collapsed_summaries": results}
            
        def should_collapse(state: OverallState) -> Literal["collapse_summaries", "generate_final_summary"]:
            num_tokens = self._length_function(state["collapsed_summaries"])
            if num_tokens > self.token_max:
                return "collapse_summaries"
            else:
                return "generate_final_summary"
            
        async def generate_final_summary(state: OverallState):
            content = "\n".join([doc.page_content for doc in state["collapsed_summaries"]])
            response = await self.reduce_chain.ainvoke({"docs": content})
            return {"final_summary": response}
        
        try:
            # Build the graph
            graph = StateGraph(OverallState)
            graph.add_node("generate_chunk_summary", generate_chunk_summary)
            graph.add_node("collect_summaries", collect_summaries)
            graph.add_node("collapse_summaries", collapse_summaries)
            graph.add_node("generate_final_summary", generate_final_summary)
            
            # Add edges
            graph.add_conditional_edges(START, map_summaries, ["generate_chunk_summary"])
            graph.add_edge("generate_chunk_summary", "collect_summaries")
            graph.add_conditional_edges("collect_summaries", should_collapse)
            graph.add_conditional_edges("collapse_summaries", should_collapse)
            graph.add_edge("generate_final_summary", END)
            
            app = graph.compile()
            
            # Run the graph
            initial_state = {
                "contents": [doc.page_content for doc in documents],
                "summaries": [],
                "collapsed_summaries": [],
                "final_summary": ""
            }
            
            result = await app.ainvoke(initial_state, {"recursion_limit": 10})
            return result["final_summary"]
            
        except Exception as e:
            logger.error(f"Error generating summary: {e}")
            return f"Could not generate summary due to an error: {str(e)}"