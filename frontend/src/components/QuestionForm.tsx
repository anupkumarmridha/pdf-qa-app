import React, { useState } from 'react';
import { FiSend, FiLoader } from 'react-icons/fi';

const QuestionForm = ({ onSubmit, documentId = null, isLoading = false }) => {
  const [question, setQuestion] = useState('');
  const [error, setError] = useState('');

  const handleSubmit = (e) => {
    e.preventDefault();
    
    if (!question.trim()) {
      setError('Please enter a question');
      return;
    }
    
    setError('');
    onSubmit(question);
  };

  const handleChange = (e) => {
    setQuestion(e.target.value);
    if (error) setError('');
  };

  return (
    <div className="card">
      <h2 className="text-xl font-semibold mb-4">
        {documentId 
          ? 'Ask a Question About This Document' 
          : 'Ask a Question About Your Documents'}
      </h2>
      
      <form onSubmit={handleSubmit}>
        <div className="mb-4">
          <label htmlFor="question" className="sr-only">
            Your question
          </label>
          <div className="relative">
            <textarea
              id="question"
              name="question"
              rows="3"
              className={`form-input resize-none ${error ? 'border-red-500' : ''}`}
              placeholder="What would you like to know about your documents?"
              value={question}
              onChange={handleChange}
              disabled={isLoading}
            ></textarea>
          </div>
          {error && <p className="form-error">{error}</p>}
        </div>
        
        <div className="flex justify-end">
          <button
            type="submit"
            className="btn btn-primary flex items-center"
            disabled={isLoading}
          >
            {isLoading ? (
              <>
                <FiLoader className="animate-spin mr-2" />
                Thinking...
              </>
            ) : (
              <>
                <FiSend className="mr-2" />
                Ask Question
              </>
            )}
          </button>
        </div>
      </form>
      
      <div className="mt-4 text-sm text-gray-500">
        <p>
          Ask any question about {documentId ? 'this document' : 'your uploaded documents'} 
          and I'll find the relevant information to answer.
        </p>
      </div>
    </div>
  );
};

export default QuestionForm;