import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import FileUpload from '../components/FileUpload';
import DocumentList from '../components/DocumentList';

const HomePage = () => {
  const [refreshTrigger, setRefreshTrigger] = useState(0);
  const navigate = useNavigate();

  const handleUploadSuccess = (document) => {
    // Refresh the document list
    setRefreshTrigger(prev => prev + 1);
    
    // If a document was successfully uploaded, navigate to its page
    if (document) {
      navigate(`/documents/${document.id}`);
    }
  };

  return (
    <div>
      <div className="text-center mb-8">
        <h1 className="text-3xl font-bold text-gray-900">
          Document Question & Answering
        </h1>
        <p className="mt-3 text-xl text-gray-600">
          Upload documents and ask questions about their content
        </p>
      </div>

      <div className="grid gap-6 md:grid-cols-2">
        <div>
          <FileUpload onUploadSuccess={handleUploadSuccess} />
        </div>
        <div>
          <DocumentList refreshTrigger={refreshTrigger} />
        </div>
      </div>
    </div>
  );
};

export default HomePage;