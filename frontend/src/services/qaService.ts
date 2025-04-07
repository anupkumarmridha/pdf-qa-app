import api from './api';

export const askQuestion = async (question, chatId = null, isRegeneration = false) => {
  try {
    const params = { 
      question,
      chat_id: chatId,
      is_regeneration: isRegeneration
    };
    
    return await api.post('/qa/ask', params);
  } catch (error) {
    console.error('Error asking question:', error);
    throw error;
  }
};


export const askDocumentQuestion = async (documentId, question, chatId = null, isRegeneration = false) => {
  try {
    const params = { 
      question,
      is_regeneration: isRegeneration
    };
    
    if (chatId) {
      params.chat_id = chatId;
    }
    
    return await api.get(`/qa/documents/${documentId}/ask`, { params });
  } catch (error) {
    console.error(`Error asking question about document ${documentId}:`, error);
    throw error;
  }
};

export const clearQAMemory = async () => {
  try {
    return await api.post('/qa/clear-memory');
  } catch (error) {
    console.error('Error clearing QA memory:', error);
    throw error;
  }
};