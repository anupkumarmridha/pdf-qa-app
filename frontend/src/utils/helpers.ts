import { askQuestion, askDocumentQuestion } from '../services/qaService';

/**
 * Helper function to retry/regenerate the last answer
 * 
 * @param options Configuration options for retry
 * @returns Promise that resolves when retry is complete
 */
export const handleRetry = async (options: {
  messages: any[];
  currentChatId: string | null;
  documentId?: string | null;
  setIsAsking: (isAsking: boolean) => void;
  setQaError: (error: string) => void;
  setCurrentSources: (sources: any[]) => void;
  regenerateAnswer: (answer: string, sources: any[]) => Promise<any>;
}) => {
  const {
    messages, 
    currentChatId,
    documentId,
    setIsAsking,
    setQaError,
    setCurrentSources,
    regenerateAnswer
  } = options;

  if (!currentChatId) return;
  
  // Find the last user message to retry
  const lastUserMessageIndex = messages.findLastIndex(m => m.role === 'user');
  if (lastUserMessageIndex === -1) return;
  
  const questionToRetry = messages[lastUserMessageIndex].content;
  
  setIsAsking(true);
  setQaError('');
  
  try {
    // Call the appropriate question API based on whether we have a document ID
    const response = documentId 
      ? await askDocumentQuestion(documentId, questionToRetry, currentChatId, true)
      : await askQuestion(questionToRetry, currentChatId, true);
    
    // Update sources and regenerate the answer with the new response
    if (response && response.answer) {
      setCurrentSources(response.sources || []);
      await regenerateAnswer(response.answer, response.sources || []);
    } else {
      throw new Error('No answer received from the API');
    }
  } catch (err) {
    console.error('Error retrying question:', err);
    setQaError('Failed to regenerate the answer. Please try again.');
  } finally {
    setIsAsking(false);
  }
};

/**
 * Helper function to edit an existing message
 * This needs to be integrated with your API calls
 * 
 * @param options Configuration options for message editing
 * @returns Promise that resolves when editing is complete
 */
export const handleEditMessage = async (options: {
  chatId: string | null;
  messageId: string;
  newContent: string;
  documentId?: string | null;
  setIsAsking: (isAsking: boolean) => void;
  setQaError: (error: string) => void;
  setCurrentSources: (sources: any[]) => void;
  regenerateAnswer: (answer: string, sources: any[]) => Promise<any>;
  updateUserMessage: (messageId: string, content: string) => Promise<any>;
}) => {
  const {
    chatId,
    messageId,
    newContent,
    documentId,
    setIsAsking,
    setQaError,
    setCurrentSources,
    regenerateAnswer,
    updateUserMessage
  } = options;

  if (!chatId) return;
  
  setIsAsking(true);
  setQaError('');
  
  try {
    // First update the user message
    await updateUserMessage(messageId, newContent);
    
    // Then get a new answer based on the updated question
    const response = documentId 
      ? await askDocumentQuestion(documentId, newContent, chatId, true)
      : await askQuestion(newContent, chatId, true);
    
    // Update the assistant's response
    if (response && response.answer) {
      setCurrentSources(response.sources || []);
      await regenerateAnswer(response.answer, response.sources || []);
    } else {
      throw new Error('No answer received from the API');
    }
  } catch (err) {
    console.error('Error processing edited message:', err);
    setQaError('Failed to update the response. Please try again.');
  } finally {
    setIsAsking(false);
  }
};