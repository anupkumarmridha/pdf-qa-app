import { useState, useEffect } from 'react';

export interface Message {
  role: 'user' | 'assistant';
  content: string;
  timestamp: Date;
  sources?: any[];
}

// Local storage key for storing the conversation history
const CONVERSATION_STORAGE_KEY = 'pdf_qa_conversation_history';

/**
 * Custom hook to manage conversation history
 */
export const useConversation = (documentId?: string | null) => {
  // State to hold conversation messages
  const [messages, setMessages] = useState<Message[]>([]);
  
  // Generate a storage key that's specific to the document if provided
  const storageKey = documentId ? 
    `${CONVERSATION_STORAGE_KEY}_document_${documentId}` : 
    CONVERSATION_STORAGE_KEY;
  
  // Load conversation history from localStorage on component mount
  useEffect(() => {
    const storedConversation = localStorage.getItem(storageKey);
    if (storedConversation) {
      try {
        // Parse the stored JSON data
        const parsedMessages = JSON.parse(storedConversation);
        
        // Convert timestamp strings back to Date objects
        const formattedMessages = parsedMessages.map((msg: any) => ({
          ...msg,
          timestamp: new Date(msg.timestamp)
        }));
        
        setMessages(formattedMessages);
      } catch (error) {
        console.error('Error parsing stored conversation:', error);
        // If there's an error parsing, start with empty conversation
        setMessages([]);
      }
    }
  }, [storageKey]);
  
  // Save conversation to localStorage whenever it changes
  useEffect(() => {
    if (messages.length > 0) {
      localStorage.setItem(storageKey, JSON.stringify(messages));
    }
  }, [messages, storageKey]);
  
  /**
   * Add a user question to the conversation
   */
  const addUserMessage = (content: string) => {
    const userMessage: Message = {
      role: 'user',
      content,
      timestamp: new Date()
    };
    
    setMessages(prevMessages => [...prevMessages, userMessage]);
    return userMessage;
  };
  
  /**
   * Add an assistant response to the conversation
   */
  const addAssistantMessage = (content: string, sources?: any[]) => {
    const assistantMessage: Message = {
      role: 'assistant',
      content,
      timestamp: new Date(),
      sources
    };
    
    setMessages(prevMessages => [...prevMessages, assistantMessage]);
    return assistantMessage;
  };
  
  /**
   * Clear the entire conversation history
   */
  const clearConversation = () => {
    setMessages([]);
    localStorage.removeItem(storageKey);
  };
  
  /**
   * Check if there is any conversation history
   */
  const hasConversation = messages.length > 0;
  
  /**
   * Get the last exchange (question/answer pair)
   */
  const getLastExchange = () => {
    if (messages.length < 2) return null;
    
    const lastIndex = messages.length - 1;
    return {
      question: messages[lastIndex - 1].content,
      answer: messages[lastIndex].content
    };
  };
  
  return {
    messages,
    addUserMessage,
    addAssistantMessage,
    clearConversation,
    hasConversation,
    getLastExchange
  };
};

export default useConversation;