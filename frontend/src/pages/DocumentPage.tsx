import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { FiArrowLeft, FiLoader } from 'react-icons/fi';
import DocumentSummary from '../components/DocumentSummary';
import QuestionForm from '../components/QuestionForm';
import AnswerDisplay from '../components/AnswerDisplay';
import { getDocument } from '../services/documentService';
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

  useEffect(() => {
    fetchDocument();
  }, [id]);

  const fetchDocument = async () => {
    setLoading(true);
    setError('');
    
    try {
      const documentData = await getDocument(id);
      setDocument(documentData);
    } catch (err) {
      console.error('Error fetching document:', err);
      setError('Failed to load document. It may have been deleted or there was a server error.');
    } finally {
      setLoading(false);
    }
  };

  const handleQuestionSubmit = async (questionText) => {
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

      <div className="grid gap-6 md:grid-cols-2 mb-6">
        <DocumentSummary document={document} />
        <QuestionForm 
          onSubmit={handleQuestionSubmit} 
          documentId={id}
          isLoading={isAsking}
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