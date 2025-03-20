import React, { useState } from 'react';
import { FiFileText, FiDatabase, FiClipboard, FiCheck } from 'react-icons/fi';

const SourcesList = ({ sources }) => {
  const [expandedIndex, setExpandedIndex] = useState(null);
  const [copiedIndex, setCopiedIndex] = useState(null);

  const toggleExpand = (index) => {
    if (expandedIndex === index) {
      setExpandedIndex(null);
    } else {
      setExpandedIndex(index);
    }
  };

  const copyToClipboard = (text, index, event) => {
    event.stopPropagation();
    navigator.clipboard.writeText(text);
    setCopiedIndex(index);
    setTimeout(() => setCopiedIndex(null), 2000);
  };

  if (!sources || sources.length === 0) {
    return (
      <div className="card p-6 text-center text-gray-500">
        No sources available.
      </div>
    );
  }

  return (
    <div className="card">
      <h2 className="text-xl font-semibold mb-4">Source Documents</h2>
      <div className="space-y-3">
        {sources.map((source, index) => (
          <div 
            key={index}
            className={`border rounded-md overflow-hidden ${
              expandedIndex === index ? 'border-primary-300' : 'border-gray-200'
            }`}
          >
            <div 
              className={`flex justify-between items-center p-3 cursor-pointer ${
                expandedIndex === index ? 'bg-primary-50' : 'bg-gray-50'
              }`}
              onClick={() => toggleExpand(index)}
            >
              <div className="flex items-center">
                {source.metadata.type === 'pdf' ? (
                  <FiFileText className="text-red-500 mr-2" />
                ) : (
                  <FiDatabase className="text-green-500 mr-2" />
                )}
                <span className="font-medium text-gray-700">
                  {source.metadata.source || `Source ${index + 1}`}
                </span>
              </div>
              <button
                onClick={(e) => copyToClipboard(source.text, index, e)}
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
            {expandedIndex === index && (
              <div className="p-3 border-t border-gray-200 whitespace-pre-line text-gray-700 text-sm">
                {source.text}
              </div>
            )}
          </div>
        ))}
      </div>
    </div>
  );
};

export default SourcesList;