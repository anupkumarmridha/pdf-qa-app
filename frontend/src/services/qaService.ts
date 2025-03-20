import api from './api';

/**
 * Ask a question about all uploaded documents
 * 
 * @param {string} question - The question to ask
 * @returns {Promise<Object>} - Answer and source documents
 */
export const askQuestion = async (question) => {
  try {
    return await api.post('/qa/ask', { question });
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
 * @returns {Promise<Object>} - Answer and source documents
 */
export const askDocumentQuestion = async (documentId, question) => {
  try {
    // Using query parameters for GET request
    return await api.get(`/qa/documents/${documentId}/ask`, {
      params: { question }
    });
  } catch (error) {
    console.error(`Error asking question about document ${documentId}:`, error);
    throw error;
  }
};