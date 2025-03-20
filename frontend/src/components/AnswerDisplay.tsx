import React, { useState } from 'react';
import { FiChevronDown, FiChevronUp, FiClipboard, FiCheck } from 'react-icons/fi';
import { marked } from 'marked';
import DOMPurify from 'dompurify';

const AnswerDisplay = ({ question, answer, sources }) => {
  const [showSources, setShowSources] = useState(true);
  const [copiedIndex, setCopiedIndex] = useState(null);

  const toggleSources = () => {
    setShowSources(!showSources);
  };

  const copyToClipboard = (text, index) => {
    navigator.clipboard.writeText(text);
    setCopiedIndex(index);
    setTimeout(() => setCopiedIndex(null), 2000);
  };

  // Parse Markdown in the answer
  const createMarkup = (text) => {
    const sanitizedHtml = DOMPurify.sanitize(marked.parse(text));
    return { __html: sanitizedHtml };
  };

  if (!question || !answer) {
    return null;
  }

  return (
    <div className="card">
      <div className="mb-4 pb-4 border-b border-gray-200">
        <h3 className="text-lg font-medium text-gray-800">Your Question</h3>
        <p className="text-gray-700 mt-2">{question}</p>
      </div>

      <div className="mb-6">
        <h3 className="text-lg font-medium text-gray-800">Answer</h3>
        <div 
          className="prose max-w-none mt-2 text-gray-700"
          dangerouslySetInnerHTML={createMarkup(answer)}
        />
      </div>

      {sources && sources.length > 0 && (
        <div>
          <div 
            className="flex justify-between items-center cursor-pointer group"
            onClick={toggleSources}
          >
            <h3 className="text-lg font-medium text-gray-800">Sources</h3>
            <button 
              className="text-gray-500 group-hover:text-gray-700"
              aria-label={showSources ? 'Hide sources' : 'Show sources'}
            >
              {showSources ? (
                <FiChevronUp className="h-5 w-5" />
              ) : (
                <FiChevronDown className="h-5 w-5" />
              )}
            </button>
          </div>

          {showSources && (
            <div className="mt-3 space-y-4">
              {sources.map((source, index) => (
                <div 
                  key={index}
                  className="bg-gray-50 p-3 rounded-md border border-gray-200"
                >
                  <div className="flex justify-between items-start mb-2">
                    <div className="text-sm font-medium text-gray-500">
                      {source.metadata.source && `From: ${source.metadata.source}`}
                    </div>
                    <button
                      onClick={() => copyToClipboard(source.text, index)}
                      className="text-gray-400 hover:text-gray-600"
                      aria-label="Copy text"
                    >
                      {copiedIndex === index ? (
                        <FiCheck className="h-4 w-4 text-green-500" />
                      ) : (
                        <FiClipboard className="h-4 w-4" />
                      )}
                    </button>
                  </div>
                  <div className="text-gray-700 text-sm whitespace-pre-line">
                    {source.text}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
};

export default AnswerDisplay;