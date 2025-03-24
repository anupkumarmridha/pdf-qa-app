import { Message } from './conversationService';

export interface ChatSession {
  id: string;
  title: string;
  lastUpdated: Date;
  preview: string;
  documentId?: string;
  messageCount: number;
}

// Constants
const CHAT_SESSIONS_KEY = 'pdf_qa_chat_sessions';
const CONVERSATION_PREFIX = 'pdf_qa_conversation_history';

/**
 * Get all chat sessions from localStorage
 */
export const getAllChatSessions = (): ChatSession[] => {
  try {
    const storedSessions = localStorage.getItem(CHAT_SESSIONS_KEY);
    if (!storedSessions) return [];
    
    const sessions = JSON.parse(storedSessions) as ChatSession[];
    
    // Convert string dates back to Date objects
    return sessions.map(session => ({
      ...session,
      lastUpdated: new Date(session.lastUpdated)
    })).sort((a, b) => b.lastUpdated.getTime() - a.lastUpdated.getTime()); // Sort by most recent
    
  } catch (error) {
    console.error('Error parsing chat sessions:', error);
    return [];
  }
};

/**
 * Create a new chat session
 */
export const createChatSession = (documentId?: string): string => {
  // Generate new session ID
  const sessionId = `chat_${Date.now()}`;
  
  // Default title - will be updated with first question
  const title = documentId ? 'New Document Chat' : 'New General Chat';
  
  const session: ChatSession = {
    id: sessionId,
    title,
    lastUpdated: new Date(),
    preview: "No messages yet",
    documentId,
    messageCount: 0
  };
  
  // Get existing sessions and add the new one
  const sessions = getAllChatSessions();
  sessions.unshift(session); // Add to beginning (newest first)
  
  // Save updated sessions list
  localStorage.setItem(CHAT_SESSIONS_KEY, JSON.stringify(sessions));
  
  return sessionId;
};

/**
 * Get a specific chat session
 */
export const getChatSession = (sessionId: string): ChatSession | null => {
  const sessions = getAllChatSessions();
  return sessions.find(session => session.id === sessionId) || null;
};

/**
 * Update a chat session with new information from the messages
 */
export const updateChatSession = (sessionId: string, messages: Message[]): void => {
  if (messages.length === 0) return;
  
  const sessions = getAllChatSessions();
  const sessionIndex = sessions.findIndex(session => session.id === sessionId);
  
  if (sessionIndex === -1) return;
  
  // Find the first user message to use as title
  const firstUserMessage = messages.find(msg => msg.role === 'user');
  
  // Get the last exchange for preview
  const lastUserIndex = [...messages].reverse().findIndex(msg => msg.role === 'user');
  const lastUserMessage = lastUserIndex !== -1 ? messages[messages.length - 1 - lastUserIndex] : null;
  const lastAssistantMessage = lastUserIndex !== -1 ? messages[messages.length - lastUserIndex] : null;
  
  // Update the session
  sessions[sessionIndex] = {
    ...sessions[sessionIndex],
    title: firstUserMessage ? truncateText(firstUserMessage.content, 50) : sessions[sessionIndex].title,
    lastUpdated: new Date(),
    preview: lastAssistantMessage ? truncateText(lastAssistantMessage.content, 100) : "No response yet",
    messageCount: messages.length
  };
  
  // Save updated sessions
  localStorage.setItem(CHAT_SESSIONS_KEY, JSON.stringify(sessions));
};

/**
 * Delete a chat session
 */
export const deleteChatSession = (sessionId: string): void => {
  // Get the session to find its storage key
  const session = getChatSession(sessionId);
  if (!session) return;
  
  // Remove from sessions list
  const sessions = getAllChatSessions().filter(s => s.id !== sessionId);
  localStorage.setItem(CHAT_SESSIONS_KEY, JSON.stringify(sessions));
  
  // Remove the actual conversation data
  const storageKey = session.documentId ? 
    `${CONVERSATION_PREFIX}_document_${session.documentId}_${sessionId}` : 
    `${CONVERSATION_PREFIX}_${sessionId}`;
    
  localStorage.removeItem(storageKey);
};

/**
 * Clear all chat sessions
 */
export const clearAllChatSessions = (): void => {
  // First get all sessions to find their storage keys
  const sessions = getAllChatSessions();
  
  // Remove each conversation from localStorage
  sessions.forEach(session => {
    const storageKey = session.documentId ? 
      `${CONVERSATION_PREFIX}_document_${session.documentId}_${session.id}` : 
      `${CONVERSATION_PREFIX}_${session.id}`;
      
    localStorage.removeItem(storageKey);
  });
  
  // Clear the sessions list
  localStorage.removeItem(CHAT_SESSIONS_KEY);
};

/**
 * Helper to truncate text
 */
const truncateText = (text: string, maxLength: number): string => {
  if (!text) return '';
  if (text.length <= maxLength) return text;
  return text.substring(0, maxLength) + '...';
};