import api from './api';

export interface Message {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  timestamp: Date;
  updated_at?: Date;
  sources?: any[];
}

export interface Chat {
  id: string;
  title: string;
  documentId?: string | null;
  createdAt: Date;
  updatedAt: Date;
  messageCount: number;
  preview: string;
}

/**
 * Create a new chat
 * 
 * @param title - The title of the chat
 * @param documentId - Optional document ID if chat is tied to a document
 * @returns The created chat
 */
export const createChat = async (title: string = "New Chat", documentId?: string): Promise<Chat> => {
  try {
    const response = await api.post('/chats/', {
      title,
      document_id: documentId
    });
    
    return formatChat(response);
  } catch (error) {
    console.error('Error creating chat:', error);
    throw error;
  }
};

/**
 * Get all chats, optionally filtered by document ID
 * 
 * @param documentId - Optional document ID to filter chats
 * @returns List of chats
 */
export const getChats = async (documentId?: string): Promise<Chat[]> => {
  try {
    const url = '/chats/' + (documentId ? `?document_id=${documentId}` : '');
    const response = await api.get(url);
    
    return response.map(formatChat);
  } catch (error) {
    console.error('Error fetching chats:', error);
    throw error;
  }
};

/**
 * Get a specific chat by ID with its messages
 * 
 * @param chatId - The ID of the chat to retrieve
 * @returns The chat and its messages
 */
export const getChat = async (chatId: string): Promise<{chat: Chat, messages: Message[]}> => {
  try {
    const response = await api.get(`/chats/${chatId}`);
    
    return {
      chat: formatChat(response.chat),
      messages: response.messages.map(formatMessage)
    };
  } catch (error) {
    console.error(`Error fetching chat ${chatId}:`, error);
    throw error;
  }
};

/**
 * Update a chat
 * 
 * @param chatId - The ID of the chat to update
 * @param data - The data to update
 * @returns The updated chat
 */
export const updateChat = async (chatId: string, data: {title?: string}): Promise<Chat> => {
  try {
    const response = await api.put(`/chats/${chatId}`, data);
    
    return formatChat(response);
  } catch (error) {
    console.error(`Error updating chat ${chatId}:`, error);
    throw error;
  }
};

/**
 * Delete a chat
 * 
 * @param chatId - The ID of the chat to delete
 * @returns Confirmation message
 */
export const deleteChat = async (chatId: string): Promise<{message: string}> => {
  try {
    return await api.delete(`/chats/${chatId}`);
  } catch (error) {
    console.error(`Error deleting chat ${chatId}:`, error);
    throw error;
  }
};

/**
 * Add a message to a chat
 * 
 * @param chatId - The ID of the chat
 * @param role - The role of the message sender ('user' or 'assistant')
 * @param content - The message content
 * @param sources - Optional sources array for assistant messages
 * @returns The created message
 */
export const addMessage = async (
  chatId: string, 
  role: 'user' | 'assistant', 
  content: string,
  sources?: any[]
): Promise<Message> => {
  try {
    const response = await api.post(`/chats/${chatId}/messages`, {
      role,
      content,
      sources
    });
    
    return formatMessage(response);
  } catch (error) {
    console.error(`Error adding message to chat ${chatId}:`, error);
    throw error;
  }
};

/**
 * Update a message
 * 
 * @param chatId - The ID of the chat
 * @param messageId - The ID of the message to update
 * @param content - The new content
 * @param sources - Optional updated sources
 * @returns The updated message
 */
export const updateMessage = async (
  chatId: string,
  messageId: string,
  content: string,
  sources?: any[]
): Promise<Message> => {
  try {
    const payload: { content: string, sources?: any[] } = { content };
    
    // Only include sources if they're provided
    if (sources) {
      payload.sources = sources;
    }
    
    const response = await api.put(`/chats/${chatId}/messages/${messageId}`, payload);
    
    // Ensure the response is properly formatted
    const formattedMessage = formatMessage(response);
    
    // Make sure there's an updated_at property for UI indicators
    if (!formattedMessage.updated_at && response.updated_at) {
      formattedMessage.updated_at = new Date(response.updated_at);
    } else if (!formattedMessage.updated_at) {
      formattedMessage.updated_at = new Date();
    }
    
    return formattedMessage;
  } catch (error) {
    console.error(`Error updating message in chat ${chatId}:`, error);
    throw error;
  }
};

/**
 * Get all messages for a chat
 * 
 * @param chatId - The ID of the chat
 * @returns List of messages
 */
export const getMessages = async (chatId: string): Promise<Message[]> => {
  try {
    const response = await api.get(`/chats/${chatId}/messages`);
    
    return response.map(formatMessage);
  } catch (error) {
    console.error(`Error fetching messages for chat ${chatId}:`, error);
    throw error;
  }
};

/**
 * Clear all messages in a chat
 * 
 * @param chatId - The ID of the chat
 * @returns Confirmation message
 */
export const clearMessages = async (chatId: string): Promise<{message: string}> => {
  try {
    return await api.delete(`/chats/${chatId}/messages`);
  } catch (error) {
    console.error(`Error clearing messages for chat ${chatId}:`, error);
    throw error;
  }
};

// Helper functions to convert API response format to frontend format
const formatChat = (chat: any): Chat => ({
  id: chat.id,
  title: chat.title,
  documentId: chat.document_id,
  createdAt: new Date(chat.created_at),
  updatedAt: new Date(chat.updated_at),
  messageCount: chat.message_count,
  preview: chat.preview
});

const formatMessage = (message: any): Message => ({
  id: message.id,
  role: message.role,
  content: message.content,
  timestamp: new Date(message.timestamp),
  updated_at: message.updated_at ? new Date(message.updated_at) : undefined,
  sources: message.sources
});