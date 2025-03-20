import React, { useState, useEffect } from 'react';
import QuestionForm from '../components/QuestionForm';
import AnswerDisplay from '../components/AnswerDisplay';
import SourcesList from '../components/SourcesList';
import { getDocuments } from '../services/documentService';
import { askQuestion } from '../services/qaService';
import { FiAlertCircle } from 'react-icons/fi';

const QAPage = () => {
  const [documents, setDocuments] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  
  const [question, setQuestion] = useState('');
  const [answer, setAnswer] = useState('');
  const [sources, setSources] = useState([]);
  const [isAsking, setIsAsking] = useState(false);
  const [qaError, setQaError] = useState('');

  useEffect(() => {
    fetchDocuments();
  }, []);

  const fetchDocuments = async () => {
    setLoading(true);
    setError('');
    
    try {
      const response = await getDocuments();
      setDocuments(response.documents);
    } catch (err) {
      console.error('Error fetching documents:', err);
      setError('Failed to load documents. Please refresh the page to try again.');
    } finally {
      setLoading(false);
    }
  };

  const handleQuestionSubmit = async (questionText) => {
    if (documents.length === 0) {
      setQaError('You need to upload documents first before asking questions.');
      return;
    }
    
    setQuestion(questionText);
    setIsAsking(true);
    setQaError('');
    
    try {
      const response = await askQuestion(questionText);
      setAnswer(response.answer);
      setSources(response.sources);
    } catch (err) {
      console.error('Error asking question:', err);
      setQaError('Failed to get an answer. Please try again.');
    } finally {
      setIsAsking(false);
    }
  };

  return (
    <div>
      <div className="text-center mb-8">
        <h1 className="text-3xl font-bold text-gray-900">
          Ask Questions About Your Documents
        </h1>
        <p className="mt-3 text-xl text-gray-600">
          Get answers based on all your uploaded documents
        </p>
      </div>

      {loading ? (
        <div className="card p-8 text-center">
          <p className="text-gray-600">Loading your documents...</p>
        </div>
      ) : error ? (
        <div className="bg-red-50 text-red-600 p-4 rounded-md mb-6">
          <p>{error}</p>
        </div>
      ) : documents.length === 0 ? (
        <div className="card p-8 text-center">
          <FiAlertCircle className="h-12 w-12 text-yellow-500 mx-auto mb-4" />
          <h2 className="text-xl font-semibold mb-2">No Documents Found</h2>
          <p className="text-gray-600 mb-4">
            You need to upload documents before you can ask questions.
          </p>
          <a href="/" className="btn btn-primary inline-block">
            Upload Documents
          </a>
        </div>
      ) : (
        <div className="grid gap-6 md:grid-cols-3">
          <div className="md:col-span-2">
            <QuestionForm 
              onSubmit={handleQuestionSubmit} 
              isLoading={isAsking}
            />
            
            {qaError && (
              <div className="bg-red-50 text-red-600 p-4 rounded-md mt-4">
                <p>{qaError}</p>
              </div>
            )}
            
            {(answer || isAsking) && (
              <div className="mt-6">
                <AnswerDisplay 
                  question={question}
                  answer={answer}
                  sources={sources}
                />
              </div>
            )}
          </div>
          
          <div>
            {sources.length > 0 && (
              <SourcesList sources={sources} />
            )}
          </div>
        </div>
      )}
    </div>
  );
};

export default QAPage;