import React, { useState, useEffect } from 'react';
import { useParams, useNavigate, useSearchParams } from 'react-router-dom';
import { FiArrowLeft, FiLoader, FiMessageSquare, FiAlertCircle } from 'react-icons/fi';
import DocumentSummary from '../components/DocumentSummary';
import QuestionForm from '../components/QuestionForm';
import ConversationHistory from '../components/ConversationHistory';
import SourcesList from '../components/SourcesList';
import ChatSidebarLayout from '../components/ChatSidebarLayout';
import { getDocument, checkDocumentStatus } from '../services/documentService';
import { askDocumentQuestion } from '../services/qaService';
import { useConversation } from '../services/conversationService';

const DocumentPage = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();
  
  // Get chat ID from URL if present
  const chatIdFromUrl = searchParams.get('chat');
  
  const [document, setDocument] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  
  const [isAsking, setIsAsking] = useState(false);
  const [qaError, setQaError] = useState('');
  
  // For displaying sources in the sidebar
  const [currentSources, setCurrentSources] = useState([]);
  
  // Conversation state - pass document ID and chat ID if we have one
  const {
    messages,
    addUserMessage,
    addAssistantMessage,
    clearConversation,
    loadChat,
    hasConversation,
    currentChatId,
    isLoading: isLoadingChat
  } = useConversation(id, chatIdFromUrl);
  
  // Add state for document processing
  const [isProcessing, setIsProcessing] = useState(false);
  const [statusPolling, setStatusPolling] = useState(null);

  useEffect(() => {
    fetchDocument();
    
    // Clean up polling on unmount
    return () => {
      if (statusPolling) {
        clearInterval(statusPolling);
      }
    };
  }, [id]);
  
  // Update URL when chat ID changes
  useEffect(() => {
    if (currentChatId && currentChatId !== chatIdFromUrl) {
      setSearchParams({ chat: currentChatId });
    }
  }, [currentChatId, chatIdFromUrl, setSearchParams]);
  
  // Effect to load the most recent sources when the component mounts
  useEffect(() => {
    if (messages.length > 0) {
      // Find the last assistant message with sources
      for (let i = messages.length - 1; i >= 0; i--) {
        if (messages[i].role === 'assistant' && messages[i].sources && messages[i].sources.length > 0) {
          setCurrentSources(messages[i].sources);
          break;
        }
      }
    }
  }, [messages]);

  const checkDocumentProcessingStatus = (doc) => {
    if (doc && doc.status === "processing") {
      setIsProcessing(true);
      
      // Start polling for status
      const interval = setInterval(async () => {
        try {
          const status = await checkDocumentStatus(doc.id);
          if (status.status === "ready") {
            // Document is ready, refresh document data
            clearInterval(interval);
            setStatusPolling(null);
            setIsProcessing(false);
            fetchDocument();
          } else if (status.status === "error") {
            // Handle error
            clearInterval(interval);
            setStatusPolling(null);
            setIsProcessing(false);
            setError(`Error processing document: ${status.error_message || "Unknown error"}`);
          }
        } catch (err) {
          console.error("Error checking document status:", err);
        }
      }, 3000);
      
      setStatusPolling(interval);
    }
  };

  const fetchDocument = async () => {
    setLoading(true);
    setError('');
    
    try {
      const documentData = await getDocument(id);
      setDocument(documentData);
      
      // Check if document is still processing
      checkDocumentProcessingStatus(documentData);
    } catch (err) {
      console.error('Error fetching document:', err);
      setError('Failed to load document. It may have been deleted or there was a server error.');
    } finally {
      setLoading(false);
    }
  };

const handleQuestionSubmit = async (questionText) => {
  // Don't allow questions if document is still processing
  if (isProcessing) return;
  
  setIsAsking(true);
  setQaError('');
  
  try {
    // Add user message to conversation and get the chat ID that was used
    const { chatId } = await addUserMessage(questionText);
    
    // Now use that specific chat ID when asking the question to maintain continuity
    const response = await askDocumentQuestion(id, questionText, chatId);
    
    // Update current sources for the sidebar
    setCurrentSources(response.sources);
    
    // Add assistant response to the SAME chat
    await addAssistantMessage(response.answer, response.sources, chatId);
  } catch (err) {
    console.error('Error asking question:', err);
    setQaError('Failed to get an answer. Please try again.');
  } finally {
    setIsAsking(false);
  }
};

  const handleNewChat = async () => {
    // Clear conversation and reset sources
    await clearConversation();
    setCurrentSources([]);
    
    // Remove chat ID from URL
    setSearchParams({});
  };
  
  const handleSelectChat = async (chatId) => {
    await loadChat(chatId);
    
    // Reflect the chat ID in the URL
    setSearchParams({ chat: chatId });
  };

  // Render content for inside the chat sidebar layout
  const renderContent = () => {
    if (loading || isLoadingChat) {
      return (
        <div className="h-full flex justify-center items-center">
          <div className="text-center animate-pulse-subtle">
            <FiLoader className="h-12 w-12 mx-auto mb-4 text-gray-300 animate-spin" />
            <p className="text-gray-600">Loading document and conversations...</p>
          </div>
        </div>
      );
    }
    
    if (error) {
      return (
        <div className="text-center">
          <div className="bg-red-50 text-red-600 p-4 rounded-md mb-4">
            <p>{error}</p>
          </div>
          <button
            onClick={() => navigate('/')}
            className="btn btn-primary inline-flex items-center"
          >
            <FiArrowLeft className="mr-2" />
            Back to Home
          </button>
        </div>
      );
    }
    
    if (!document) {
      return (
        <div className="text-center">
          <div className="bg-yellow-50 text-yellow-700 p-4 rounded-md mb-4">
            <p>Document not found.</p>
          </div>
          <button
            onClick={() => navigate('/')}
            className="btn btn-primary inline-flex items-center"
          >
            <FiArrowLeft className="mr-2" />
            Back to Home
          </button>
        </div>
      );
    }

    return (
      <div className="space-y-6 max-w-4xl mx-auto w-full">
        {isProcessing && (
          <div className="bg-blue-50 p-4 rounded-lg flex items-center">
            <FiLoader className="animate-spin h-5 w-5 text-blue-600 mr-3" />
            <p className="text-blue-700">
              This document is being processed. 
              Search functionality will be available once processing is complete.
            </p>
          </div>
        )}
        
        {qaError && (
          <div className="bg-red-50 text-red-600 p-4 rounded-lg mb-6 animate-fade-in flex items-center">
            <FiAlertCircle className="h-5 w-5 mr-2" />
            <p>{qaError}</p>
          </div>
        )}
        
        {/* Conversation section */}
        {hasConversation ? (
          <>
            <ConversationHistory 
              messages={messages} 
              onClearConversation={handleNewChat} 
            />
            <QuestionForm 
              onSubmit={handleQuestionSubmit} 
              documentId={id}
              isLoading={isAsking}
              disabled={isProcessing}
              hasConversationHistory={hasConversation}
              isFollowUpQuestion={hasConversation}
            />
          </>
        ) : (
          <div className="bg-white rounded-xl shadow-md border border-gray-200 overflow-hidden">
            <div className="p-8 text-center">
              <div className="w-16 h-16 bg-primary-100 rounded-full flex items-center justify-center mx-auto mb-4">
                <FiMessageSquare className="h-8 w-8 text-primary-600" />
              </div>
              <h2 className="text-2xl font-semibold text-gray-800 mb-2">Ask About This Document</h2>
              <p className="text-gray-600 mb-6 max-w-lg mx-auto">
                Ask questions about "{document.filename}" and get AI-powered answers based on the document's content.
              </p>
              <QuestionForm 
                onSubmit={handleQuestionSubmit} 
                documentId={id}
                isLoading={isAsking}
                disabled={isProcessing}
              />
            </div>
          </div>
        )}
      </div>
    );
  };

  return (
    <div className="h-[calc(100vh-120px)] flex flex-col">
      <div className="py-4 flex items-center">
        <button
          onClick={() => navigate('/')}
          className="inline-flex items-center text-gray-600 hover:text-gray-900"
        >
          <FiArrowLeft className="mr-1" />
          Back to Documents
        </button>
        <h1 className="text-xl font-semibold text-gray-800 ml-4">{document?.filename || 'Document'}</h1>
      </div>
      
      <div className="flex-grow bg-white border border-gray-200 rounded-lg shadow-sm">
        <ChatSidebarLayout
          currentChatId={currentChatId}
          onSelectChat={handleSelectChat}
          onNewChat={handleNewChat}
          title={`${document?.filename || 'Document'} Chats`}
          documentMode={true}
          rightSidebar={currentSources.length > 0 ? <SourcesList sources={currentSources} /> : <DocumentSummary document={document} />}
          rightSidebarTitle={currentSources.length > 0 ? "Sources" : "Document Info"}
        >
          {renderContent()}
        </ChatSidebarLayout>
      </div>
    </div>
  );
};

export default DocumentPage;