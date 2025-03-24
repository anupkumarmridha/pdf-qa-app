import { useState, useEffect, useCallback } from 'react';
import * as chatService from './chatService';
import { clearQAMemory } from './qaService';

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
   * Returns both the message and the chat ID that was used
   */
  const addUserMessage = async (content: string) => {
    setError(null);
    
    try {
      // Store current chat ID locally to avoid race conditions
      let chatIdToUse = currentChatId;
      
      // If no current chat ID, create a new chat first
      if (!chatIdToUse) {
        const newChat = await chatService.createChat(
          content.length > 30 ? content.substring(0, 27) + '...' : content,
          documentId || undefined
        );
        chatIdToUse = newChat.id;
        setCurrentChatId(chatIdToUse);
      }
      
      // Add message to the chat
      const message = await chatService.addMessage(chatIdToUse, 'user', content);
      
      // Update local state
      setMessages(prev => [...prev, message]);
      
      // Return both the message and the chat ID that was used
      return { message, chatId: chatIdToUse };
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
      
      // Return the temporary message and current chat ID
      return { message: tempMessage, chatId: currentChatId };
    }
  };

  /**
   * Add an assistant response to the conversation
   * The chatId parameter ensures we use the same chat as the user message
   */
  const addAssistantMessage = async (content: string, sources?: any[], specificChatId?: string | null) => {
    setError(null);
    
    try {
      // Use the specified chat ID if provided, otherwise use current chat ID
      const chatIdToUse = specificChatId || currentChatId;
      
      // Handle case where there's no active chat - create one first
      if (!chatIdToUse) {
        // First create a new chat with a default title
        const newChat = await chatService.createChat(
          "New conversation",
          documentId || undefined
        );
        const newChatId = newChat.id;
        setCurrentChatId(newChatId);
        
        // Then add the assistant message
        const message = await chatService.addMessage(newChatId, 'assistant', content, sources);
        setMessages(prev => [...prev, message]);
        return { message, chatId: newChatId };
      } else {
        // Normal case - add to existing chat
        const message = await chatService.addMessage(chatIdToUse, 'assistant', content, sources);
        setMessages(prev => [...prev, message]);
        return { message, chatId: chatIdToUse };
      }
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
      return { message: tempMessage, chatId: currentChatId };
    }
  };

  /**
   * Ensure a complete conversation is added in proper sequence
   * This helps prevent split conversations by using an atomic-like operation
   */
  const addCompleteExchange = async (question: string, answer: string, sources?: any[]) => {
    setError(null);
    
    try {
      // Store current chat ID locally to avoid race conditions
      let chatIdToUse = currentChatId;
      
      // If no current chat ID, create a new chat first
      if (!chatIdToUse) {
        const newChat = await chatService.createChat(
          question.length > 30 ? question.substring(0, 27) + '...' : question,
          documentId || undefined
        );
        chatIdToUse = newChat.id;
        setCurrentChatId(chatIdToUse);
      }
      
      // Add user message
      const userMessage = await chatService.addMessage(chatIdToUse, 'user', question);
      
      // Add assistant message to the same chat
      const assistantMessage = await chatService.addMessage(chatIdToUse, 'assistant', answer, sources);
      
      // Update local state with both messages
      setMessages(prev => [...prev, userMessage, assistantMessage]);
      
      return { userMessage, assistantMessage, chatId: chatIdToUse };
    } catch (err) {
      console.error('Error adding complete exchange:', err);
      setError('Failed to save conversation');
      
      // Still add the messages to the UI to maintain consistency
      const tempUserMessage: Message = {
        id: `temp-user-${Date.now()}`,
        role: 'user',
        content: question,
        timestamp: new Date()
      };
      
      const tempAssistantMessage: Message = {
        id: `temp-assistant-${Date.now()}`,
        role: 'assistant',
        content: answer,
        timestamp: new Date(),
        sources
      };
      
      setMessages(prev => [...prev, tempUserMessage, tempAssistantMessage]);
      
      return { 
        userMessage: tempUserMessage, 
        assistantMessage: tempAssistantMessage, 
        chatId: currentChatId 
      };
    }
  };

  /**
   * Clear the entire conversation history and QA memory
   */
  const clearConversation = useCallback(async () => {
    setError(null);
    
    try {
      // Clear the QA service memory for proper synchronization
      await clearQAMemory();
      
      if (currentChatId) {
        await chatService.clearMessages(currentChatId);
        setMessages([]);
      }
    } catch (err) {
      console.error('Error clearing conversation:', err);
      setError('Failed to clear conversation');
    }
  }, [currentChatId]);

  /**
   * Load a specific chat by ID
   */
  const loadChat = async (chatId: string) => {
    // If switching chats, clear QA memory to avoid context crossover
    if (currentChatId !== chatId) {
      try {
        await clearQAMemory();
      } catch (err) {
        console.error('Error clearing QA memory while switching chats:', err);
        // Continue anyway, it's not critical
      }
    }
    
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
        // Clear QA memory since we deleted the current chat
        await clearQAMemory();
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
    addCompleteExchange,
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