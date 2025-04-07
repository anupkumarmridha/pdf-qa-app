import { useState, useEffect, useCallback } from 'react';
import * as chatService from './chatService';
import { clearQAMemory } from './qaService';

export interface Message {
  id?: string;
  role: 'user' | 'assistant';
  content: string;
  timestamp: Date;
  sources?: any[];
  updated_at?: Date;
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
  // Track the last user message ID for editing
  const [lastUserMessageId, setLastUserMessageId] = useState<string | null>(null);

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

  // Track the last user message ID
  useEffect(() => {
    if (messages.length > 0) {
      const userMessages = messages.filter(msg => msg.role === 'user');
      if (userMessages.length > 0) {
        setLastUserMessageId(userMessages[userMessages.length - 1].id);
      }
    } else {
      setLastUserMessageId(null);
    }
  }, [messages]);

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
      setLastUserMessageId(message.id);
      
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
      setMessages(prev => [...prev, message => message.role === 'assistant' ? tempMessage : message]);
      return { message: tempMessage, chatId: currentChatId };
    }
  };

  /**
   * Update an existing user message
   */
  const updateUserMessage = async (messageId: string, content: string) => {
    setError(null);
    
    try {
      if (!currentChatId) {
        throw new Error('No active chat to update message');
      }
      
      // Call API to update message
      const updatedMessage = await chatService.updateMessage(currentChatId, messageId, content);
      
      // Update local state
      setMessages(prev => prev.map(msg => 
        msg.id === messageId ? updatedMessage : msg
      ));
      
      return updatedMessage;
    } catch (err) {
      console.error('Error updating user message:', err);
      setError('Failed to update message');
      
      // Update the UI state directly
      setMessages(prev => prev.map(msg => 
        msg.id === messageId ? { ...msg, content } : msg
      ));
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
      setLastUserMessageId(userMessage.id);
      
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
        setLastUserMessageId(null);
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
        setLastUserMessageId(null);
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

  /**
   * Regenerate the last assistant answer
   */
  const regenerateAnswer = async (content: string, sources: any[] = []) => {
    setError(null);
    
    try {
      if (!currentChatId || messages.length === 0) {
        throw new Error("Cannot regenerate: no active conversation");
      }
      
      // Find the last assistant message index
      const lastAssistantIndex = [...messages].reverse().findIndex(msg => msg.role === 'assistant');
      
      if (lastAssistantIndex === -1) {
        throw new Error("No assistant message to regenerate");
      }
      
      // Get the actual message (adjusting for reverse index)
      const assistantMessage = messages[messages.length - 1 - lastAssistantIndex];
      
      // Call API to update the message
      const updatedMessage = await chatService.updateMessage(
        currentChatId,
        assistantMessage.id,
        content,
        sources
      );
      
      // Update local state by replacing the message
      setMessages(prev => prev.map(msg => 
        msg.id === assistantMessage.id ? updatedMessage : msg
      ));
      
      return updatedMessage;
    } catch (err) {
      console.error('Error regenerating answer:', err);
      setError('Failed to regenerate answer');
      
      // Fall back to updating the UI state directly
      setMessages(prev => {
        const newMessages = [...prev];
        const lastAssistantIndex = newMessages.map(m => m.role).lastIndexOf('assistant');
        if (lastAssistantIndex !== -1) {
          newMessages[lastAssistantIndex] = {
            ...newMessages[lastAssistantIndex],
            content,
            sources,
            updated_at: new Date()
          };
        }
        return newMessages;
      });
    }
  };

  // Get the last question for retry purposes
  const getLastQuestion = (): string => {
    if (messages.length === 0) return '';
    
    // Find the last user message
    for (let i = messages.length - 1; i >= 0; i--) {
      if (messages[i].role === 'user') {
        return messages[i].content;
      }
    }
    
    return '';
  };

  return {
    messages,
    addUserMessage,
    addAssistantMessage,
    updateUserMessage,
    regenerateAnswer,
    addCompleteExchange,
    clearConversation,
    loadChat,
    deleteChat,
    getChatsForDocument,
    getLastQuestion,
    hasConversation: messages.length > 0,
    currentChatId,
    lastUserMessageId,
    isLoading,
    error
  };
};

export default useConversation;