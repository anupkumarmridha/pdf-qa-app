import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { FiArrowLeft, FiLoader, FiMessageSquare } from 'react-icons/fi';
import DocumentSummary from '../components/DocumentSummary';
import QuestionForm from '../components/QuestionForm';
import ConversationHistory from '../components/ConversationHistory';
import SourcesList from '../components/SourcesList';
import NewChatButton from '../components/NewChatButton';
import { getDocument, checkDocumentStatus } from '../services/documentService';
import { askDocumentQuestion } from '../services/qaService';
import { useConversation } from '../services/conversationService';

const DocumentPage = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  
  const [document, setDocument] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  
  const [isAsking, setIsAsking] = useState(false);
  const [qaError, setQaError] = useState('');
  
  // For displaying sources in the sidebar
  const [currentSources, setCurrentSources] = useState([]);
  
  // Conversation state
  const {
    messages,
    addUserMessage,
    addAssistantMessage,
    clearConversation,
    hasConversation
  } = useConversation(id);
  
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
  }, []);

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
    
    // Add user message to conversation
    addUserMessage(questionText);
    
    try {
      const response = await askDocumentQuestion(id, questionText);
      
      // Update current sources for the sidebar
      setCurrentSources(response.sources);
      
      // Add assistant response to conversation
      addAssistantMessage(response.answer, response.sources);
    } catch (err) {
      console.error('Error asking question:', err);
      setQaError('Failed to get an answer. Please try again.');
    } finally {
      setIsAsking(false);
    }
  };

  const handleNewChat = () => {
    // Clear conversation and reset sources
    clearConversation();
    setCurrentSources([]);
  };

  if (loading) {
    return (
      <div className="flex justify-center items-center min-h-screen-minus-nav">
        <FiLoader className="animate-spin h-8 w-8 text-primary-500 mr-2" />
        <span className="text-xl">Loading document...</span>
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
    <div>
      <div className="mb-6">
        <button
          onClick={() => navigate('/')}
          className="inline-flex items-center text-gray-600 hover:text-gray-900"
        >
          <FiArrowLeft className="mr-1" />
          Back to Documents
        </button>
      </div>

      {isProcessing && (
        <div className="mb-6 bg-blue-50 p-4 rounded-lg flex items-center">
          <FiLoader className="animate-spin h-5 w-5 text-blue-600 mr-3" />
          <p className="text-blue-700">
            This document is being processed. 
            Search functionality will be available once processing is complete.
          </p>
        </div>
      )}

      <div className="grid gap-8 lg:grid-cols-4">
        {/* Main conversation area - takes up more space */}
        <div className="lg:col-span-3 space-y-4">
          {/* Only show conversation history when there are messages */}
          {hasConversation ? (
            <>
              <div className="flex justify-between items-center mb-2">
                <h2 className="text-lg font-semibold text-gray-800">
                  Conversation about: {document.filename}
                </h2>
                <NewChatButton onClick={handleNewChat} />
              </div>
              <ConversationHistory 
                messages={messages} 
                onClearConversation={clearConversation} 
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
          
          {qaError && (
            <div className="bg-red-50 text-red-600 p-4 rounded-lg mb-6 animate-fade-in">
              <p>{qaError}</p>
            </div>
          )}
        </div>
        
        {/* Side panel for document info and sources */}
        <div className="space-y-6">
          <DocumentSummary document={document} />
          
          {currentSources.length > 0 && (
            <SourcesList sources={currentSources} />
          )}
        </div>
      </div>
    </div>
  );
};

export default DocumentPage;