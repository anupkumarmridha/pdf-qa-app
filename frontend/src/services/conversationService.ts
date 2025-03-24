import { useState, useEffect } from 'react';
import { updateChatSession, createChatSession } from './chatHistoryService';

export interface Message {
  role: 'user' | 'assistant';
  content: string;
  timestamp: Date;
  sources?: any[];
}

// Local storage key for storing the conversation history
const CONVERSATION_PREFIX = 'pdf_qa_conversation_history';

/**
 * Custom hook to manage conversation history
 */
export const useConversation = (documentId?: string | null, chatId?: string | null) => {
  // State to hold conversation messages
  const [messages, setMessages] = useState<Message[]>([]);
  // Keep track of the current chat ID
  const [currentChatId, setCurrentChatId] = useState<string | null>(chatId || null);
  
  // We'll only create a chat session when the first message is actually sent
  useEffect(() => {
    if (chatId) {
      setCurrentChatId(chatId);
    }
  }, [chatId]);
  
  // Generate a storage key that's specific to the document and chat ID
  const storageKey = currentChatId ? 
    documentId ? 
      `${CONVERSATION_PREFIX}_document_${documentId}_${currentChatId}` : 
      `${CONVERSATION_PREFIX}_${currentChatId}` :
    null;
  
  // Load conversation history from localStorage on component mount
  useEffect(() => {
    if (!storageKey) return;
    
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
        
        // Update the chat session metadata
        if (currentChatId) {
          updateChatSession(currentChatId, formattedMessages);
        }
      } catch (error) {
        console.error('Error parsing stored conversation:', error);
        // If there's an error parsing, start with empty conversation
        setMessages([]);
      }
    }
  }, [storageKey, currentChatId]);
  
  // Save conversation to localStorage whenever it changes
  useEffect(() => {
    if (storageKey && messages.length > 0) {
      localStorage.setItem(storageKey, JSON.stringify(messages));
      
      // Update chat session metadata
      if (currentChatId) {
        updateChatSession(currentChatId, messages);
      }
    }
  }, [messages, storageKey, currentChatId]);
  
  /**
   * Add a user question to the conversation
   */
  const addUserMessage = (content: string) => {
    // If no current chat ID, create a new one
    if (!currentChatId) {
      const newChatId = createChatSession(documentId || undefined);
      setCurrentChatId(newChatId);
    }
    
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
    
    if (storageKey) {
      localStorage.removeItem(storageKey);
    }
    
    // Create a new chat session
    const newChatId = createChatSession(documentId || undefined);
    setCurrentChatId(newChatId);
  };
  
  /**
   * Load a specific chat by ID
   */
  const loadChat = (chatId: string) => {
    setCurrentChatId(chatId);
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
    loadChat,
    hasConversation,
    getLastExchange,
    currentChatId
  };
};

export default useConversation;