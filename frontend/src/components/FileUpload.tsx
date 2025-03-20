import React, { useState, useCallback } from 'react';
import { useDropzone } from 'react-dropzone';
import { FiUpload, FiFile, FiX, FiLoader, FiCheck, FiAlertCircle } from 'react-icons/fi';
import { uploadDocuments } from '../services/documentService';

const FileUpload = ({ onUploadSuccess }) => {
  const [files, setFiles] = useState([]);
  const [isUploading, setIsUploading] = useState(false);
  const [error, setError] = useState('');
  const [progress, setProgress] = useState(0);
  const [uploadResults, setUploadResults] = useState(null);

  const onDrop = useCallback((acceptedFiles) => {
    // Reset states
    setError('');
    setProgress(0);
    setUploadResults(null);
    
    // Filter files to only accept PDF and CSV
    const validFiles = acceptedFiles.filter(file => {
      const fileType = file.type;
      const fileName = file.name.toLowerCase();
      const isPdf = fileType === 'application/pdf' || fileName.endsWith('.pdf');
      const isCsv = fileType === 'text/csv' || fileName.endsWith('.csv');
      return isPdf || isCsv;
    });
    
    if (validFiles.length === 0) {
      setError('Only PDF and CSV files are supported.');
      return;
    }
    
    if (validFiles.length < acceptedFiles.length) {
      setError('Some files were not added. Only PDF and CSV files are supported.');
    } else {
      setError('');
    }
    
    // Add files to state
    setFiles(prevFiles => [...prevFiles, ...validFiles]);
  }, []);

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop,
    accept: {
      'application/pdf': ['.pdf'],
      'text/csv': ['.csv']
    },
    multiple: true
  });

  const handleUpload = async () => {
    if (files.length === 0) return;
    
    setIsUploading(true);
    setError('');
    setUploadResults(null);
    
    try {
      // Create a FormData object
      const formData = new FormData();
      
      // Append each file to the formData
      files.forEach(file => {
        formData.append('files', file);
      });
      
      // Upload the documents
      const response = await uploadDocuments(formData, (event) => {
        // Track upload progress
        if (event.lengthComputable) {
          const percentComplete = Math.round((event.loaded * 100) / event.total);
          setProgress(percentComplete);
        }
      });
      
      // Set upload results
      setUploadResults(response);
      
      // Call success callback if all documents were uploaded successfully
      if (onUploadSuccess && response.documents.length > 0) {
        onUploadSuccess(response.documents[0]);
      }
      
      // Clear files only if all were successful
      if (response.failed_uploads.length === 0) {
        setFiles([]);
      }
      
    } catch (err) {
      console.error('Upload error:', err);
      setError(err.response?.data?.detail || 'Error uploading documents. Please try again.');
    } finally {
      setIsUploading(false);
      setProgress(0);
    }
  };

  const handleRemoveFile = (index) => {
    setFiles(prevFiles => prevFiles.filter((_, i) => i !== index));
    if (uploadResults) {
      setUploadResults(null);
    }
  };

  const handleRemoveAllFiles = () => {
    setFiles([]);
    setError('');
    setProgress(0);
    setUploadResults(null);
  };

  return (
    <div className="card">
      <h2 className="text-xl font-semibold mb-4">Upload Documents</h2>
      
      {error && (
        <div className="bg-red-50 text-red-600 p-3 rounded-md mb-4">
          {error}
        </div>
      )}
      
      {uploadResults && (
        <div className="mb-4">
          <div className="bg-green-50 p-3 rounded-md mb-2">
            <p className="text-green-700 font-medium">
              <FiCheck className="inline mr-1" /> {uploadResults.documents.length} document(s) uploaded successfully
            </p>
          </div>
          
          {uploadResults.failed_uploads.length > 0 && (
            <div className="bg-yellow-50 p-3 rounded-md">
              <p className="text-yellow-700 font-medium">
                <FiAlertCircle className="inline mr-1" /> {uploadResults.failed_uploads.length} document(s) failed to upload
              </p>
              <ul className="mt-2 text-sm text-yellow-700">
                {uploadResults.failed_uploads.map((failure, index) => (
                  <li key={index}>
                    <span className="font-medium">{failure.filename}:</span> {failure.reason}
                  </li>
                ))}
              </ul>
            </div>
          )}
        </div>
      )}

      <div
        {...getRootProps()}
        className={`border-2 border-dashed rounded-lg p-6 text-center cursor-pointer transition-colors mb-4 ${
          isDragActive ? 'border-primary-500 bg-primary-50' : 'border-gray-300 hover:border-primary-400'
        }`}
      >
        <input {...getInputProps()} />
        <FiUpload className="mx-auto h-12 w-12 text-gray-400 mb-3" />
        <p className="text-gray-700">Drag & drop PDF or CSV files here, or click to select</p>
        <p className="text-gray-500 text-sm mt-1">
          You can upload multiple files at once
        </p>
      </div>

      {files.length > 0 && (
        <div className="mb-4">
          <div className="flex justify-between items-center mb-2">
            <h3 className="font-medium">Selected Files ({files.length})</h3>
            {!isUploading && (
              <button
                onClick={handleRemoveAllFiles}
                className="text-gray-500 hover:text-gray-700 text-sm"
              >
                Remove All
              </button>
            )}
          </div>
          
          <div className="bg-gray-50 rounded-lg border border-gray-200 divide-y divide-gray-200 max-h-60 overflow-y-auto">
            {files.map((file, index) => (
              <div key={index} className="p-3 flex items-center justify-between">
                <div className="flex items-center">
                  <FiFile className="h-5 w-5 text-gray-500 mr-2" />
                  <div>
                    <p className="font-medium text-gray-800 text-sm">{file.name}</p>
                    <p className="text-xs text-gray-500">
                      {(file.size / 1024 / 1024).toFixed(2)} MB
                    </p>
                  </div>
                </div>
                {!isUploading && (
                  <button
                    onClick={() => handleRemoveFile(index)}
                    className="text-gray-400 hover:text-gray-600"
                  >
                    <FiX className="h-4 w-4" />
                  </button>
                )}
              </div>
            ))}
          </div>
        </div>
      )}
      
      {progress > 0 && progress < 100 && (
        <div className="w-full bg-gray-200 rounded-full h-2.5 mb-4">
          <div
            className="bg-primary-600 h-2.5 rounded-full"
            style={{ width: `${progress}%` }}
          ></div>
          <p className="text-xs text-gray-500 text-center mt-1">
            Uploading... {progress}%
          </p>
        </div>
      )}
      
      <button
        onClick={handleUpload}
        disabled={isUploading || files.length === 0}
        className={`btn btn-primary w-full flex items-center justify-center ${
          isUploading || files.length === 0 ? 'opacity-70 cursor-not-allowed' : ''
        }`}
      >
        {isUploading ? (
          <>
            <FiLoader className="animate-spin mr-2" />
            Uploading...
          </>
        ) : (
          <>
            <FiUpload className="mr-2" />
            Upload {files.length > 0 ? `${files.length} File${files.length > 1 ? 's' : ''}` : 'Files'}
          </>
        )}
      </button>
    </div>
  );
};

export default FileUpload;