import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { FiFileText, FiDatabase, FiExternalLink, FiTrash2, FiLoader } from 'react-icons/fi';
import { getDocuments, deleteDocument } from '../services/documentService';

const DocumentList = ({ refreshTrigger }) => {
  const [documents, setDocuments] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [deletingIds, setDeletingIds] = useState([]);

  useEffect(() => {
    fetchDocuments();
  }, [refreshTrigger]);

  const fetchDocuments = async () => {
    setLoading(true);
    setError('');
    
    try {
      const response = await getDocuments();
      setDocuments(response.documents);
    } catch (err) {
      console.error('Error fetching documents:', err);
      setError('Failed to load documents. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async (documentId, event) => {
    event.preventDefault();
    event.stopPropagation();
    
    // Don't allow deleting documents that are still processing
    const doc = documents.find(d => d.id === documentId);
    if (doc && doc.status === "processing") {
      return;
    }
    
    // Add to deleting ids to show loading state
    setDeletingIds([...deletingIds, documentId]);
    
    try {
      await deleteDocument(documentId);
      // Remove from list
      setDocuments(documents.filter(doc => doc.id !== documentId));
    } catch (err) {
      console.error('Error deleting document:', err);
      setError('Failed to delete document. Please try again.');
    } finally {
      // Remove from deleting ids
      setDeletingIds(deletingIds.filter(id => id !== documentId));
    }
  };

  if (loading) {
    return (
      <div className="card flex justify-center items-center p-8">
        <FiLoader className="animate-spin h-6 w-6 text-primary-500 mr-2" />
        <span>Loading documents...</span>
      </div>
    );
  }

  if (error) {
    return (
      <div className="card bg-red-50 text-red-600 p-4">
        <p>{error}</p>
        <button 
          onClick={fetchDocuments}
          className="mt-2 text-sm underline"
        >
          Try again
        </button>
      </div>
    );
  }

  if (documents.length === 0) {
    return (
      <div className="card text-center p-8">
        <p className="text-gray-500">No documents uploaded yet.</p>
        <p className="text-gray-500 text-sm mt-2">
          Upload a PDF or CSV file to get started.
        </p>
      </div>
    );
  }

  return (
    <div className="card">
      <h2 className="text-xl font-semibold mb-4">Your Documents</h2>
      <div className="divide-y divide-gray-200">
        {documents.map((document) => (
          <Link 
            key={document.id}
            to={`/documents/${document.id}`}
            className="block hover:bg-gray-50 transition-colors"
          >
            <div className="py-4 flex justify-between items-center">
              <div className="flex items-center">
                {document.type === 'pdf' ? (
                  <FiFileText className="h-6 w-6 text-red-500 mr-3" />
                ) : (
                  <FiDatabase className="h-6 w-6 text-green-500 mr-3" />
                )}
                <div>
                  <div className="flex items-center">
                    <h3 className="text-lg font-medium text-gray-800">
                      {document.filename}
                    </h3>
                    {document.status === "processing" && (
                      <span className="ml-2 px-2 py-1 text-xs bg-blue-100 text-blue-800 rounded-full flex items-center">
                        <FiLoader className="animate-spin mr-1 h-3 w-3" />
                        Processing
                      </span>
                    )}
                  </div>
                  <p className="text-sm text-gray-500">
                    {document.type.toUpperCase()} • 
                    {new Date(document.metadata.uploadTime || Date.now()).toLocaleDateString()}
                  </p>
                </div>
              </div>
              <div className="flex items-center">
                <button
                  onClick={(e) => handleDelete(document.id, e)}
                  className="text-gray-400 hover:text-red-500 mr-3"
                  disabled={deletingIds.includes(document.id) || document.status === "processing"}
                  style={{ opacity: document.status === "processing" ? 0.5 : 1 }}
                >
                  {deletingIds.includes(document.id) ? (
                    <FiLoader className="animate-spin h-5 w-5" />
                  ) : (
                    <FiTrash2 className="h-5 w-5" />
                  )}
                </button>
                <FiExternalLink className="h-5 w-5 text-gray-400" />
              </div>
            </div>
          </Link>
        ))}
      </div>
    </div>
  );
};

export default DocumentList;