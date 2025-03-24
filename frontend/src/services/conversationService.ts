import { useState, useEffect } from 'react';
import * as chatService from './chatService';

export interface Message {
  id?: string;
  role: 'user' | 'assistant';
  content: string;
  timestamp: Date;
  sources?: any[];
}

/**
 * Custom hook to manage conversation history using MongoDB API
 */
export const useConversation = (documentId?: string | null, chatId?: string | null) => {
  // State to hold conversation messages
  const [messages, setMessages] = useState<Message[]>([]);
  // Current chat ID
  const [currentChatId, setCurrentChatId] = useState<string | null>(chatId || null);
  // Loading state
  const [isLoading, setIsLoading] = useState(false);
  // Error state
  const [error, setError] = useState<string | null>(null);

  // Load messages when chat ID changes
  useEffect(() => {
    if (currentChatId) {
      loadMessages(currentChatId);
    } else {
      setMessages([]);
    }
  }, [currentChatId]);

  // Create a new chat if one wasn't provided
  useEffect(() => {
    if (chatId) {
      setCurrentChatId(chatId);
    }
  }, [chatId]);

  /**
   * Load messages for a specific chat
   */
  const loadMessages = async (chatId: string) => {
    setIsLoading(true);
    setError(null);
    
    try {
      const response = await chatService.getChat(chatId);
      setMessages(response.messages);
    } catch (err) {
      console.error('Error loading chat messages:', err);
      setError('Failed to load conversation history');
      setMessages([]);
    } finally {
      setIsLoading(false);
    }
  };

  /**
   * Add a user question to the conversation
   */
  const addUserMessage = async (content: string) => {
    setError(null);
    
    try {
      // If no current chat ID, create a new chat
      if (!currentChatId) {
        const newChat = await chatService.createChat(
          content.length > 30 ? content.substring(0, 27) + '...' : content,
          documentId || undefined
        );
        setCurrentChatId(newChat.id);
        
        // Add message to the new chat
        const message = await chatService.addMessage(newChat.id, 'user', content);
        setMessages(prev => [...prev, message]);
        return message;
      } else {
        // Add message to existing chat
        const message = await chatService.addMessage(currentChatId, 'user', content);
        setMessages(prev => [...prev, message]);
        return message;
      }
    } catch (err) {
      console.error('Error adding user message:', err);
      setError('Failed to send message');
      // Still add the message to the UI to maintain consistency
      const tempMessage: Message = {
        id: `temp-${Date.now()}`,
        role: 'user',
        content,
        timestamp: new Date()
      };
      setMessages(prev => [...prev, tempMessage]);
      return tempMessage;
    }
  };

  /**
   * Add an assistant response to the conversation
   */
  const addAssistantMessage = async (content: string, sources?: any[]) => {
    setError(null);
    
    try {
      if (!currentChatId) {
        console.error('Cannot add assistant message - no active chat');
        return null;
      }
      
      const message = await chatService.addMessage(currentChatId, 'assistant', content, sources);
      setMessages(prev => [...prev, message]);
      return message;
    } catch (err) {
      console.error('Error adding assistant message:', err);
      setError('Failed to receive response');
      // Still add the message to the UI to maintain consistency
      const tempMessage: Message = {
        id: `temp-${Date.now()}`,
        role: 'assistant',
        content,
        timestamp: new Date(),
        sources
      };
      setMessages(prev => [...prev, tempMessage]);
      return tempMessage;
    }
  };

  /**
   * Clear the entire conversation history
   */
  const clearConversation = async () => {
    setError(null);
    
    try {
      if (currentChatId) {
        await chatService.clearMessages(currentChatId);
        setMessages([]);
      }
    } catch (err) {
      console.error('Error clearing conversation:', err);
      setError('Failed to clear conversation');
    }
  };

  /**
   * Load a specific chat by ID
   */
  const loadChat = async (chatId: string) => {
    setCurrentChatId(chatId);
  };

  /**
   * Get chats for the current document or all general chats
   */
  const getChatsForDocument = async () => {
    try {
      return await chatService.getChats(documentId || undefined);
    } catch (err) {
      console.error('Error getting chats:', err);
      setError('Failed to load chat history');
      return [];
    }
  };

  /**
   * Delete a specific chat
   */
  const deleteChat = async (chatId: string) => {
    try {
      await chatService.deleteChat(chatId);
      if (currentChatId === chatId) {
        setCurrentChatId(null);
        setMessages([]);
      }
      return true;
    } catch (err) {
      console.error('Error deleting chat:', err);
      setError('Failed to delete chat');
      return false;
    }
  };

  return {
    messages,
    addUserMessage,
    addAssistantMessage,
    clearConversation,
    loadChat,
    deleteChat,
    getChatsForDocument,
    hasConversation: messages.length > 0,
    currentChatId,
    isLoading,
    error
  };
};

export default useConversation;