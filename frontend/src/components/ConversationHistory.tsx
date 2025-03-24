import React, { useState, useRef, useEffect } from 'react';
import { FiUser, FiMessageSquare, FiChevronDown, FiChevronUp, FiClock, FiTrash2, FiX } from 'react-icons/fi';
import { marked } from 'marked';
import DOMPurify from 'dompurify';

interface Message {
  role: 'user' | 'assistant';
  content: string;
  timestamp: Date;
  sources?: any[];
}

interface ConversationHistoryProps {
  messages: Message[];
  onClearConversation: () => void;
}

const ConversationHistory: React.FC<ConversationHistoryProps> = ({ messages, onClearConversation }) => {
  const [expandedMessage, setExpandedMessage] = useState<number | null>(null);
  const conversationEndRef = useRef<HTMLDivElement>(null);
  
  // Automatically scroll to the bottom of conversation when new messages are added
  useEffect(() => {
    if (conversationEndRef.current) {
      conversationEndRef.current.scrollIntoView({ behavior: 'smooth' });
    }
  }, [messages]);
  
  if (!messages || messages.length === 0) {
    return null;
  }

  // Parse Markdown in the answer
  const createMarkup = (text: string) => {
    const sanitizedHtml = DOMPurify.sanitize(marked.parse(text));
    return { __html: sanitizedHtml };
  };
  
  const toggleSourcesForMessage = (messageIndex: number) => {
    if (expandedMessage === messageIndex) {
      setExpandedMessage(null);
    } else {
      setExpandedMessage(messageIndex);
    }
  };
  
  const handleClearConversation = () => {
    if (window.confirm("Are you sure you want to clear the entire conversation history?")) {
      onClearConversation();
    }
  };

  return (
    <div className="rounded-lg overflow-hidden bg-gray-50 border border-gray-200 mb-6 shadow-sm">
      <div className="flex justify-between items-center bg-white px-6 py-3 border-b border-gray-200 sticky top-0 z-10">
        <h2 className="text-lg font-semibold text-gray-800">Conversation</h2>
        
        <button 
          onClick={handleClearConversation}
          className="text-sm text-gray-500 hover:text-red-500 transition-colors flex items-center"
        >
          <FiTrash2 className="mr-1" />
          Clear Chat
        </button>
      </div>

      <div className="px-4 py-6 space-y-6 max-h-[calc(80vh-200px)] overflow-y-auto">
        {messages.map((message, index) => (
          <div 
            key={index} 
            className={`animate-fade-in flex ${message.role === 'user' ? 'justify-end' : 'justify-start'}`}
          >
            <div className={`
              relative max-w-3xl rounded-2xl py-3 px-4 shadow-sm
              ${message.role === 'user' 
                ? 'bg-primary-600 text-white ml-12' 
                : 'bg-white border border-gray-200 mr-12'
              }
            `}>
              {/* Avatar */}
              <div className={`
                absolute top-2 ${message.role === 'user' ? 'right-0 translate-x-10' : 'left-0 -translate-x-10'}
                w-8 h-8 flex items-center justify-center rounded-full
                ${message.role === 'user' ? 'bg-primary-700' : 'bg-white border border-gray-200'}
              `}>
                {message.role === 'user' ? (
                  <FiUser className="h-4 w-4 text-white" />
                ) : (
                  <FiMessageSquare className="h-4 w-4 text-primary-600" />
                )}
              </div>
              
              <div>
                {/* Name and timestamp */}
                <div className="flex justify-between items-center mb-2">
                  <span className={`text-sm font-medium ${message.role === 'user' ? 'text-primary-100' : 'text-gray-600'}`}>
                    {message.role === 'user' ? 'You' : 'AI Assistant'}
                  </span>
                  <span className={`text-xs ${message.role === 'user' ? 'text-primary-200' : 'text-gray-400'} flex items-center ml-2`}>
                    <FiClock className="mr-1 h-3 w-3" />
                    {message.timestamp.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                  </span>
                </div>
                
                {/* Message content */}
                {message.role === 'user' ? (
                  <p className="text-white">{message.content}</p>
                ) : (
                  <div>
                    <div 
                      className="prose max-w-none text-gray-700"
                      dangerouslySetInnerHTML={createMarkup(message.content)}
                    />
                    
                    {/* Sources section */}
                    {message.sources && message.sources.length > 0 && (
                      <div className="mt-3 border-t border-gray-100 pt-2">
                        <button
                          onClick={() => toggleSourcesForMessage(index)}
                          className="text-sm flex items-center text-primary-600 hover:text-primary-800 transition-colors"
                        >
                          {expandedMessage === index ? (
                            <>
                              <FiChevronUp className="mr-1" />
                              Hide sources
                            </>
                          ) : (
                            <>
                              <FiChevronDown className="mr-1" />
                              Show sources ({message.sources.length})
                            </>
                          )}
                        </button>
                        
                        {expandedMessage === index && (
                          <div className="mt-2 space-y-2 animate-slide-in">
                            {message.sources.map((source, sourceIndex) => (
                              <div key={sourceIndex} className="text-sm bg-gray-50 p-3 rounded-lg border border-gray-100">
                                <div className="font-medium text-gray-700 mb-1">
                                  {source.metadata?.source && `Source: ${source.metadata.source}`}
                                </div>
                                <div className="text-gray-600 text-xs">
                                  <div className="max-h-32 overflow-y-auto scrollbar-thin scrollbar-thumb-gray-300 scrollbar-track-gray-100 pr-1">
                                    {source.text}
                                  </div>
                                </div>
                              </div>
                            ))}
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                )}
              </div>
            </div>
          </div>
        ))}
        <div ref={conversationEndRef} />
      </div>
    </div>
  );
};

export default ConversationHistory;