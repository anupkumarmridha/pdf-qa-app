import React from 'react';
import { FiFileText, FiDatabase, FiCalendar, FiUser, FiBookOpen } from 'react-icons/fi';

const DocumentSummary = ({ document }) => {
  const { id, filename, type, summary, metadata } = document;

  const getDocumentIcon = () => {
    switch (type) {
      case 'pdf':
        return <FiFileText className="h-8 w-8 text-red-500" />;
      case 'csv':
        return <FiDatabase className="h-8 w-8 text-green-500" />;
      default:
        return <FiFileText className="h-8 w-8 text-gray-500" />;
    }
  };

  const renderPdfMetadata = () => {
    return (
      <div className="mt-4 space-y-2">
        {metadata.title && metadata.title !== 'Untitled' && (
          <div className="flex items-center text-gray-600">
            <FiBookOpen className="mr-2" />
            <span className="font-medium">Title:</span>
            <span className="ml-2">{metadata.title}</span>
          </div>
        )}
        
        {metadata.author && metadata.author !== 'Unknown' && (
          <div className="flex items-center text-gray-600">
            <FiUser className="mr-2" />
            <span className="font-medium">Author:</span>
            <span className="ml-2">{metadata.author}</span>
          </div>
        )}
        
        <div className="flex items-center text-gray-600">
          <FiBookOpen className="mr-2" />
          <span className="font-medium">Pages:</span>
          <span className="ml-2">{metadata.pages || 'Unknown'}</span>
        </div>
      </div>
    );
  };

  const renderCsvMetadata = () => {
    return (
      <div className="mt-4 space-y-2">
        <div className="flex items-center text-gray-600">
          <FiDatabase className="mr-2" />
          <span className="font-medium">Rows:</span>
          <span className="ml-2">{metadata.rows || 'Unknown'}</span>
        </div>
        
        {metadata.columns && metadata.columns.length > 0 && (
          <div className="text-gray-600">
            <div className="flex items-center">
              <FiDatabase className="mr-2" />
              <span className="font-medium">Columns:</span>
            </div>
            <ul className="mt-1 ml-6 list-disc">
              {metadata.columns.map((column, index) => (
                <li key={index} className="text-sm">{column}</li>
              ))}
            </ul>
          </div>
        )}
      </div>
    );
  };

  return (
    <div className="card">
      <div className="flex items-center mb-4">
        {getDocumentIcon()}
        <h2 className="text-xl font-semibold ml-3">Document Summary</h2>
      </div>
      
      <div className="mb-4 pb-4 border-b border-gray-200">
        <h3 className="text-lg font-medium text-gray-800">{filename}</h3>
        <div className="flex items-center text-gray-600 mt-1">
          <FiCalendar className="mr-2" />
          <span>
            Uploaded on {new Date(metadata.uploadTime || Date.now()).toLocaleDateString()}
          </span>
        </div>
      </div>
      
      <div className="mb-6">
        <h3 className="font-medium text-gray-700 mb-2">Summary</h3>
        <div className="text-gray-600 bg-gray-50 p-3 rounded-md">
          {summary || 'No summary available.'}
        </div>
      </div>
      
      <div>
        <h3 className="font-medium text-gray-700 mb-2">Metadata</h3>
        {type === 'pdf' ? renderPdfMetadata() : renderCsvMetadata()}
      </div>
    </div>
  );
};

export default DocumentSummary;