import api from './api';

/**
 * Ask a question about all uploaded documents
 * 
 * @param {string} question - The question to ask
 * @param {string} chatId - Optional chat ID for conversation context
 * @returns {Promise<Object>} - Answer and source documents
 */
export const askQuestion = async (question, chatId = null) => {
  try {
    return await api.post('/qa/ask', { 
      question,
      chat_id: chatId 
    });
  } catch (error) {
    console.error('Error asking question:', error);
    throw error;
  }
};

/**
 * Ask a question about a specific document
 * 
 * @param {string} documentId - ID of the document to query
 * @param {string} question - The question to ask
 * @param {string} chatId - Optional chat ID for conversation context
 * @returns {Promise<Object>} - Answer and source documents
 */
export const askDocumentQuestion = async (documentId, question, chatId = null) => {
  try {
    // Now using query parameters for GET request with chat_id
    const params = { question };
    if (chatId) {
      params.chat_id = chatId;
    }
    
    return await api.get(`/qa/documents/${documentId}/ask`, { params });
  } catch (error) {
    console.error(`Error asking question about document ${documentId}:`, error);
    throw error;
  }
};

/**
 * Clear the QA service's conversation memory
 * Useful when starting a new conversation without reloading the app
 * 
 * @returns {Promise<Object>} - Success message
 */
export const clearQAMemory = async () => {
  try {
    return await api.post('/qa/clear-memory');
  } catch (error) {
    console.error('Error clearing QA memory:', error);
    throw error;
  }
};