import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { FiArrowLeft, FiLoader } from 'react-icons/fi';
import DocumentSummary from '../components/DocumentSummary';
import QuestionForm from '../components/QuestionForm';
import AnswerDisplay from '../components/AnswerDisplay';
import { getDocument, checkDocumentStatus } from '../services/documentService';
import { askDocumentQuestion } from '../services/qaService';

const DocumentPage = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  
  const [document, setDocument] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  
  const [question, setQuestion] = useState('');
  const [answer, setAnswer] = useState('');
  const [sources, setSources] = useState([]);
  const [isAsking, setIsAsking] = useState(false);
  const [qaError, setQaError] = useState('');
  
  // Add state for document processing
  const [isProcessing, setIsProcessing] = useState(false);
  const [statusPolling, setStatusPolling] = useState(null);

  useEffect(() => {
    fetchDocument();
    
    // Clean up polling on unmount
    return () => {
      if (statusPolling) {
        clearInterval(statusPolling);
      }
    };
  }, [id]);

  const checkDocumentProcessingStatus = (doc) => {
    if (doc && doc.status === "processing") {
      setIsProcessing(true);
      
      // Start polling for status
      const interval = setInterval(async () => {
        try {
          const status = await checkDocumentStatus(doc.id);
          if (status.status === "ready") {
            // Document is ready, refresh document data
            clearInterval(interval);
            setStatusPolling(null);
            setIsProcessing(false);
            fetchDocument();
          } else if (status.status === "error") {
            // Handle error
            clearInterval(interval);
            setStatusPolling(null);
            setIsProcessing(false);
            setError(`Error processing document: ${status.error_message || "Unknown error"}`);
          }
        } catch (err) {
          console.error("Error checking document status:", err);
        }
      }, 3000);
      
      setStatusPolling(interval);
    }
  };

  const fetchDocument = async () => {
    setLoading(true);
    setError('');
    
    try {
      const documentData = await getDocument(id);
      setDocument(documentData);
      
      // Check if document is still processing
      checkDocumentProcessingStatus(documentData);
    } catch (err) {
      console.error('Error fetching document:', err);
      setError('Failed to load document. It may have been deleted or there was a server error.');
    } finally {
      setLoading(false);
    }
  };

  const handleQuestionSubmit = async (questionText) => {
    // Don't allow questions if document is still processing
    if (isProcessing) return;
    
    setQuestion(questionText);
    setIsAsking(true);
    setQaError('');
    
    try {
      const response = await askDocumentQuestion(id, questionText);
      setAnswer(response.answer);
      setSources(response.sources);
    } catch (err) {
      console.error('Error asking question:', err);
      setQaError('Failed to get an answer. Please try again.');
    } finally {
      setIsAsking(false);
    }
  };

  if (loading) {
    return (
      <div className="flex justify-center items-center min-h-screen-minus-nav">
        <FiLoader className="animate-spin h-8 w-8 text-primary-500 mr-2" />
        <span className="text-xl">Loading document...</span>
      </div>
    );
  }

  if (error) {
    return (
      <div className="text-center">
        <div className="bg-red-50 text-red-600 p-4 rounded-md mb-4">
          <p>{error}</p>
        </div>
        <button
          onClick={() => navigate('/')}
          className="btn btn-primary inline-flex items-center"
        >
          <FiArrowLeft className="mr-2" />
          Back to Home
        </button>
      </div>
    );
  }

  if (!document) {
    return (
      <div className="text-center">
        <div className="bg-yellow-50 text-yellow-700 p-4 rounded-md mb-4">
          <p>Document not found.</p>
        </div>
        <button
          onClick={() => navigate('/')}
          className="btn btn-primary inline-flex items-center"
        >
          <FiArrowLeft className="mr-2" />
          Back to Home
        </button>
      </div>
    );
  }

  return (
    <div>
      <div className="mb-6">
        <button
          onClick={() => navigate('/')}
          className="inline-flex items-center text-gray-600 hover:text-gray-900"
        >
          <FiArrowLeft className="mr-1" />
          Back to Documents
        </button>
      </div>

      {isProcessing && (
        <div className="mb-6 bg-blue-50 p-4 rounded-md flex items-center">
          <FiLoader className="animate-spin h-5 w-5 text-blue-600 mr-3" />
          <p className="text-blue-700">
            This document is still being processed. 
            Full content and search functionality will be available once processing is complete.
          </p>
        </div>
      )}

      <div className="grid gap-6 md:grid-cols-2 mb-6">
        <DocumentSummary document={document} />
        <QuestionForm 
          onSubmit={handleQuestionSubmit} 
          documentId={id}
          isLoading={isAsking}
          disabled={isProcessing}
        />
      </div>

      {qaError && (
        <div className="bg-red-50 text-red-600 p-4 rounded-md mb-6">
          <p>{qaError}</p>
        </div>
      )}

      {(answer || isAsking) && (
        <div className="mb-6">
          <AnswerDisplay 
            question={question}
            answer={answer}
            sources={sources}
          />
        </div>
      )}
    </div>
  );
};

export default DocumentPage;