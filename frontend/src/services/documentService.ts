import api from './api';
import axios from 'axios';

/**
 * Upload multiple document files (PDF or CSV)
 * 
 * @param {FormData} formData - Form data containing the files to upload
 * @param {Function} progressCallback - Optional callback for upload progress
 * @returns {Promise<Object>} - Object containing uploaded documents and any failed uploads
 */
export const uploadDocuments = async (formData, progressCallback = null) => {
  try {
    const config = {
      headers: {
        'Content-Type': 'multipart/form-data',
      }
    };
    
    // Add progress tracking if callback provided
    if (progressCallback) {
      config.onUploadProgress = progressCallback;
    }
    
    // Use axios directly for this call to handle multipart form data
    const response = await axios.post('/api/documents/upload', formData, config);
    return response.data;
  } catch (error) {
    console.error('Error uploading documents:', error);
    throw error;
  }
};

/**
 * Upload a single document file (PDF or CSV)
 * Maintained for backward compatibility
 * 
 * @param {FormData} formData - Form data containing the file to upload
 * @param {Function} progressCallback - Optional callback for upload progress
 * @returns {Promise<Object>} - Uploaded document data
 */
export const uploadDocument = async (formData, progressCallback = null) => {
  try {
    const response = await uploadDocuments(formData, progressCallback);
    // Return the first document for backward compatibility
    if (response.documents && response.documents.length > 0) {
      return response.documents[0];
    }
    throw new Error('No documents were uploaded successfully');
  } catch (error) {
    console.error('Error uploading document:', error);
    throw error;
  }
};

/**
 * Get a list of all uploaded documents
 * 
 * @returns {Promise<Object>} - List of documents
 */
export const getDocuments = async () => {
  try {
    return await api.get('/documents');
  } catch (error) {
    console.error('Error fetching documents:', error);
    throw error;
  }
};

/**
 * Get a specific document by ID
 * 
 * @param {string} documentId - ID of the document to retrieve
 * @returns {Promise<Object>} - Document data
 */
export const getDocument = async (documentId) => {
  try {
    return await api.get(`/documents/${documentId}`);
  } catch (error) {
    console.error(`Error fetching document ${documentId}:`, error);
    throw error;
  }
};

/**
 * Delete a document by ID
 * 
 * @param {string} documentId - ID of the document to delete
 * @returns {Promise<Object>} - Deletion confirmation
 */
export const deleteDocument = async (documentId) => {
  try {
    return await api.delete(`/documents/${documentId}`);
  } catch (error) {
    console.error(`Error deleting document ${documentId}:`, error);
    throw error;
  }
};

/**
 * Get a summary of a document
 * 
 * @param {string} documentId - ID of the document to summarize
 * @returns {Promise<Object>} - Document summary
 */
export const getDocumentSummary = async (documentId) => {
  try {
    return await api.get(`/documents/${documentId}/summary`);
  } catch (error) {
    console.error(`Error getting summary for document ${documentId}:`, error);
    throw error;
  }
};

/**
 * Check the processing status of a document
 * 
 * @param {string} documentId - ID of the document to check
 * @returns {Promise<Object>} - Status information {status: "processing"|"ready"|"error", error_message: string|null}
 */
export const checkDocumentStatus = async (documentId) => {
  try {
    return await api.get(`/documents/${documentId}/status`);
  } catch (error) {
    console.error(`Error checking status for document ${documentId}:`, error);
    throw error;
  }
};