import React, { useState, useEffect } from 'react';
import { useSearchParams } from 'react-router-dom';
import QuestionForm from '../components/QuestionForm';
import ConversationHistory from '../components/ConversationHistory';
import SourcesList from '../components/SourcesList';
import ChatSidebarLayout from '../components/ChatSidebarLayout';
import { getDocuments } from '../services/documentService';
import { askQuestion } from '../services/qaService';
import { useConversation } from '../services/conversationService';
import { FiAlertCircle, FiMessageSquare, FiFileText, FiDatabase, FiLoader } from 'react-icons/fi';

const QAPage = () => {

  const [lastQuestion, setLastQuestion] = useState('');
  const [searchParams, setSearchParams] = useSearchParams();
  const chatIdFromUrl = searchParams.get('chat');
  
  const [documents, setDocuments] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  
  const [isAsking, setIsAsking] = useState(false);
  const [qaError, setQaError] = useState('');
  
  // Current sources shown in the sidebar
  const [currentSources, setCurrentSources] = useState([]);
  
  // Conversation state using our MongoDB API
  const {
    messages,
    addUserMessage,
    addAssistantMessage,
    clearConversation,
    loadChat,
    hasConversation,
    currentChatId,
    isLoading: isLoadingChat
  } = useConversation(null, chatIdFromUrl);

  useEffect(() => {
    fetchDocuments();
  }, []);
  
  // Update URL when chat ID changes
  useEffect(() => {
    if (currentChatId && currentChatId !== chatIdFromUrl) {
      setSearchParams({ chat: currentChatId });
    }
  }, [currentChatId, chatIdFromUrl, setSearchParams]);

  const fetchDocuments = async () => {
    setLoading(true);
    setError('');
    
    try {
      const response = await getDocuments();
      setDocuments(response.documents);
    } catch (err) {
      console.error('Error fetching documents:', err);
      setError('Failed to load documents. Please refresh the page to try again.');
    } finally {
      setLoading(false);
    }
  };


// Replace the existing handleQuestionSubmit function with this one:
const handleQuestionSubmit = async (questionText:string) => {

  setLastQuestion(questionText);
  if (documents.length === 0) {
    setQaError('You need to upload documents first before asking questions.');
    return;
  }
  
  setIsAsking(true);
  setQaError('');
  
  try {
    // Add user message and get the chat ID that was used
    const { chatId } = await addUserMessage(questionText);
    
    // Pass the same chat ID to ensure the response goes to the same chat
    const response = await askQuestion(questionText, chatId);
    
    // Update the current sources for the sidebar
    setCurrentSources(response.sources);
    
    // Add assistant response to the same chat
    await addAssistantMessage(response.answer, response.sources, chatId);
  } catch (err) {
    console.error('Error asking question:', err);
    setQaError('Failed to get an answer. Please try again.');
  } finally {
    setIsAsking(false);
  }
};

  const handleRetry = () => {
    if (lastQuestion) {
      handleQuestionSubmit(lastQuestion);
    }
  }
  
  const handleNewChat = async () => {
    // Clear the conversation using MongoDB API
    await clearConversation();
    setCurrentSources([]);
    
    // Remove chat ID from URL
    setSearchParams({});
  };
  
  const handleSelectChat = async (chatId) => {
    await loadChat(chatId);
    
    // Update URL to include chat ID
    setSearchParams({ chat: chatId });
  };
  
  // When the last message changes, update the sidebar sources
  useEffect(() => {
    if (messages.length > 0) {
      const lastMessage = messages[messages.length - 1];
      if (lastMessage.role === 'assistant' && lastMessage.sources) {
        setCurrentSources(lastMessage.sources);
      }
    }
  }, [messages]);

  // Content to render inside the sidebar layout
  const renderContent = () => {
    if (loading || isLoadingChat) {
      return (
        <div className="h-full flex justify-center items-center">
          <div className="text-center animate-pulse-subtle">
            <FiLoader className="h-12 w-12 mx-auto mb-4 text-gray-300 animate-spin" />
            <p className="text-gray-600">Loading your documents and conversations...</p>
          </div>
        </div>
      );
    }
    
    if (error) {
      return (
        <div className="bg-red-50 text-red-600 p-4 rounded-lg">
          <p>{error}</p>
          <button 
            onClick={fetchDocuments}
            className="mt-2 text-sm underline hover:no-underline"
          >
            Try again
          </button>
        </div>
      );
    }
    
    if (documents.length === 0) {
      return (
        <div className="bg-white shadow-md rounded-xl p-8 text-center border border-gray-200">
          <FiAlertCircle className="h-12 w-12 text-yellow-500 mx-auto mb-4" />
          <h2 className="text-xl font-semibold mb-2">No Documents Found</h2>
          <p className="text-gray-600 mb-4">
            You need to upload documents before you can ask questions.
          </p>
          <a href="/" className="btn btn-primary inline-block">
            Upload Documents
          </a>
        </div>
      );
    }
    
    return (
      <div className="space-y-6">
        {hasConversation ? (
          <>
            <ConversationHistory 
              messages={messages} 
              onClearConversation={handleNewChat} 
            />
            <QuestionForm 
              onSubmit={handleQuestionSubmit} 
              isLoading={isAsking}
              hasConversationHistory={hasConversation}
              isFollowUpQuestion={hasConversation}
              lastQuestion={lastQuestion}
              onRetry={handleRetry}
            />
          </>
        ) : (
          <div className="bg-white rounded-xl shadow-md border border-gray-200 overflow-hidden">
            <div className="p-8 text-center">
              <div className="w-16 h-16 bg-primary-100 rounded-full flex items-center justify-center mx-auto mb-4">
                <FiMessageSquare className="h-8 w-8 text-primary-600" />
              </div>
              <h2 className="text-2xl font-semibold text-gray-800 mb-2">Ask About Your Documents</h2>
              <p className="text-gray-600 mb-6 max-w-lg mx-auto">
                Ask any question and the AI will search through your {documents.length} uploaded document{documents.length !== 1 ? 's' : ''} to find relevant answers.
              </p>
              <QuestionForm 
                onSubmit={handleQuestionSubmit} 
                isLoading={isAsking}
              />
            </div>
          </div>
        )}
        
        {qaError && (
          <div className="bg-red-50 text-red-600 p-4 rounded-lg animate-fade-in">
            <p>{qaError}</p>
          </div>
        )}
        
        {currentSources.length > 0 && (
          <SourcesList sources={currentSources} />
        )}
        
        {!currentSources.length > 0 && (
          <div className="bg-white shadow-sm rounded-lg border border-gray-200 p-4">
            <h3 className="font-medium text-gray-700 mb-2">Available Documents</h3>
            <div className="space-y-2 max-h-[60vh] overflow-y-auto">
              {documents.map((doc, i) => (
                <div key={i} className="flex items-center p-2 text-sm border border-gray-100 rounded bg-gray-50">
                  <div className="w-8 h-8 flex-shrink-0 mr-2 bg-primary-100 rounded-full flex items-center justify-center">
                    {doc.type === 'pdf' ? (
                      <FiFileText className="h-4 w-4 text-primary-700" />
                    ) : (
                      <FiDatabase className="h-4 w-4 text-primary-700" />
                    )}
                  </div>
                  <div className="flex-1 truncate">
                    <div className="font-medium text-gray-800 truncate">{doc.filename}</div>
                    <div className="text-xs text-gray-500 truncate">
                      {doc.type.toUpperCase()} • {new Date(doc.metadata.uploadTime).toLocaleDateString()}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    );
  };

  return (
    <div className="min-h-[calc(100vh-150px)]">
      <div className="text-center mb-6">
        <h1 className="text-3xl font-bold text-gray-900">
          Document Q&A
        </h1>
        <p className="mt-2 text-xl text-gray-600">
          Ask questions about all your uploaded documents
        </p>
      </div>
      
      <div className="bg-white border border-gray-200 rounded-lg shadow-sm min-h-[calc(100vh-250px)]">
        <ChatSidebarLayout
          currentChatId={currentChatId}
          onSelectChat={handleSelectChat}
          onNewChat={handleNewChat}
          title="Conversations"
        >
          {renderContent()}
        </ChatSidebarLayout>
      </div>
    </div>
  );
};

export default QAPage;