import React, { useState, useEffect } from 'react';
import QuestionForm from '../components/QuestionForm';
import ConversationHistory from '../components/ConversationHistory';
import SourcesList from '../components/SourcesList';
import NewChatButton from '../components/NewChatButton';
import { getDocuments } from '../services/documentService';
import { askQuestion } from '../services/qaService';
import { useConversation } from '../services/conversationService';
import { FiAlertCircle, FiMessageSquare, FiFileText, FiDatabase } from 'react-icons/fi';

const QAPage = () => {
  const [documents, setDocuments] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  
  const [isAsking, setIsAsking] = useState(false);
  const [qaError, setQaError] = useState('');
  
  // Current sources shown in the sidebar
  const [currentSources, setCurrentSources] = useState([]);
  
  // Conversation state
  const {
    messages,
    addUserMessage,
    addAssistantMessage,
    clearConversation,
    hasConversation
  } = useConversation();

  useEffect(() => {
    fetchDocuments();
  }, []);

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

  const handleQuestionSubmit = async (questionText) => {
    if (documents.length === 0) {
      setQaError('You need to upload documents first before asking questions.');
      return;
    }
    
    setIsAsking(true);
    setQaError('');
    
    // Add user message to conversation
    addUserMessage(questionText);
    
    try {
      const response = await askQuestion(questionText);
      
      // Update the current sources for the sidebar
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
    // Clear the conversation and reset sources
    clearConversation();
    setCurrentSources([]);
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

  return (
    <div>
      <div className="text-center mb-8">
        <h1 className="text-3xl font-bold text-gray-900">
          Document Q&A
        </h1>
        <p className="mt-3 text-xl text-gray-600">
          Ask questions about all your uploaded documents
        </p>
      </div>

      {loading ? (
        <div className="card p-8 text-center animate-pulse-subtle">
          <p className="text-gray-600">Loading your documents...</p>
        </div>
      ) : error ? (
        <div className="bg-red-50 text-red-600 p-4 rounded-lg mb-6">
          <p>{error}</p>
        </div>
      ) : documents.length === 0 ? (
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
      ) : (
        <div className="grid gap-8 lg:grid-cols-4">
          {/* Main conversation area */}
          <div className="lg:col-span-3 space-y-4">
            {/* Only show conversation history when there are messages */}
            {hasConversation ? (
              <>
                <div className="flex justify-between items-center mb-2">
                  <h2 className="text-lg font-semibold text-gray-800">Conversation</h2>
                  <NewChatButton onClick={handleNewChat} />
                </div>
                <ConversationHistory 
                  messages={messages} 
                  onClearConversation={clearConversation} 
                />
                <QuestionForm 
                  onSubmit={handleQuestionSubmit} 
                  isLoading={isAsking}
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
          </div>
          
          {/* Side panel for sources */}
          <div>
            {currentSources.length > 0 ? (
              <SourcesList sources={currentSources} />
            ) : (
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
        </div>
      )}
    </div>
  );
};

export default QAPage;