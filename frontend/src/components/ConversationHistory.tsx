import React, { useState, useRef, useEffect } from 'react';
import { FiUser, FiMessageSquare, FiChevronDown, FiChevronUp, FiClock, FiTrash2, FiX, FiEdit, FiRefreshCw } from 'react-icons/fi';
import { marked } from 'marked';
import DOMPurify from 'dompurify';
import { Message } from '../services/chatService';

interface ConversationHistoryProps {
  messages: Message[];
  onClearConversation: () => void;
  onEditMessage?: (messageId: string, content: string) => void;
  onRetryAnswer?: () => void;
  lastUserMessageId?: string | null;
}

const ConversationHistory: React.FC<ConversationHistoryProps> = ({ 
  messages, 
  onClearConversation, 
  onEditMessage,
  onRetryAnswer,
  lastUserMessageId
}) => {
  const [expandedMessage, setExpandedMessage] = useState<number | null>(null);
  const [editingMessageId, setEditingMessageId] = useState<string | null>(null);
  const [editedContent, setEditedContent] = useState<string>('');
  const conversationEndRef = useRef<HTMLDivElement>(null);
  const editTextareaRef = useRef<HTMLTextAreaElement>(null);
  
  // Automatically scroll to the bottom of conversation when new messages are added
  useEffect(() => {
    if (conversationEndRef.current) {
      conversationEndRef.current.scrollIntoView({ behavior: 'smooth' });
    }
  }, [messages]);
  
  // Focus the textarea when editing starts
  useEffect(() => {
    if (editingMessageId && editTextareaRef.current) {
      editTextareaRef.current.focus();
      // Place cursor at the end
      editTextareaRef.current.selectionStart = editTextareaRef.current.value.length;
    }
  }, [editingMessageId]);
  
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

  const startEditing = (message: Message) => {
    if (onEditMessage) {
      setEditingMessageId(message.id);
      setEditedContent(message.content);
    }
  };

  const cancelEditing = () => {
    setEditingMessageId(null);
    setEditedContent('');
  };

  const saveEdit = (messageId: string) => {
    if (onEditMessage && editedContent.trim()) {
      onEditMessage(messageId, editedContent);
      setEditingMessageId(null);
      setEditedContent('');
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent, messageId: string) => {
    // Submit on Ctrl+Enter or Command+Enter
    if ((e.ctrlKey || e.metaKey) && e.key === 'Enter') {
      e.preventDefault();
      saveEdit(messageId);
    }
    // Cancel on Escape
    else if (e.key === 'Escape') {
      e.preventDefault();
      cancelEditing();
    }
  };

  // Check if a message is the last one from its role
  const isLastMessageOfType = (index: number, role: 'user' | 'assistant'): boolean => {
    const reversedIndex = messages.length - 1 - index;
    for (let i = reversedIndex; i >= 0; i--) {
      if (messages[i].role === role) {
        return messages[i].id === messages[index].id;
      }
    }
    return false;
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
            key={message.id || index} 
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
                  <div className="flex items-center">
                    <span className={`text-xs ${message.role === 'user' ? 'text-primary-200' : 'text-gray-400'} flex items-center ml-2`}>
                      <FiClock className="mr-1 h-3 w-3" />
                      {new Date(message.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                    </span>
                    
                    {/* Edit button for user messages */}
                    {message.role === 'user' && onEditMessage && !editingMessageId && (
                      <button 
                        onClick={() => startEditing(message)}
                        className="ml-2 text-primary-200 hover:text-white transition-colors"
                        title="Edit message"
                      >
                        <FiEdit className="h-3 w-3" />
                      </button>
                    )}
                    
                    {/* Retry button for assistant messages */}
                    {message.role === 'assistant' && onRetryAnswer && isLastMessageOfType(index, 'assistant') && (
                      <button 
                        onClick={onRetryAnswer}
                        className="ml-2 text-gray-400 hover:text-primary-600 transition-colors"
                        title="Regenerate response"
                      >
                        <FiRefreshCw className="h-3 w-3" />
                      </button>
                    )}
                  </div>
                </div>
                
                {/* Message content - with edit mode for user messages */}
                {message.role === 'user' && editingMessageId === message.id ? (
                  <div className="edit-message-container">
                    <textarea
                      ref={editTextareaRef}
                      value={editedContent}
                      onChange={(e) => setEditedContent(e.target.value)}
                      onKeyDown={(e) => handleKeyDown(e, message.id)}
                      className="w-full p-2 text-gray-800 bg-white border border-primary-300 rounded resize-none focus:outline-none focus:ring-2 focus:ring-primary-500"
                      rows={3}
                    />
                    <div className="flex justify-end space-x-2 mt-2">
                      <button
                        onClick={cancelEditing}
                        className="px-3 py-1 text-xs bg-gray-200 text-gray-700 rounded hover:bg-gray-300"
                      >
                        Cancel
                      </button>
                      <button
                        onClick={() => saveEdit(message.id)}
                        className="px-3 py-1 text-xs bg-primary-700 text-white rounded hover:bg-primary-800"
                      >
                        Save
                      </button>
                    </div>
                  </div>
                ) : message.role === 'user' ? (
                  <p className="text-white">{message.content}</p>
                ) : (
                  <div>
                    <div 
                      className="prose max-w-none text-gray-700"
                      dangerouslySetInnerHTML={createMarkup(message.content)}
                    />

                    {/* Regeneration indicator */}
                    {message.updated_at && (
                      <div className="text-xs italic text-gray-400 mt-1">
                        <span>Regenerated</span>
                      </div>
                    )}
                    
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