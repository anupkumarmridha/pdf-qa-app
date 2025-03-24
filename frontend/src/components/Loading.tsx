import React from 'react';
import { FiLoader, FiMessageCircle, FiFileText } from 'react-icons/fi';

interface LoadingProps {
  type?: 'default' | 'document' | 'qa';
  message?: string;
}

const Loading: React.FC<LoadingProps> = ({ 
  type = 'default', 
  message = 'Loading...' 
}) => {
  return (
    <div className="flex flex-col justify-center items-center min-h-[400px] py-12 animate-fade-in">
      <div className="relative flex items-center justify-center w-16 h-16 mb-6">
        {/* Outer ring */}
        <div className="absolute inset-0 rounded-full border-4 border-gray-200"></div>
        
        {/* Spinner */}
        <div className="absolute inset-0 rounded-full border-4 border-t-transparent border-primary-500 animate-spin"></div>
        
        {/* Icon in middle based on type */}
        <div className={`absolute inset-0 flex items-center justify-center ${
          type === 'document' ? 'text-red-500' : 
          type === 'qa' ? 'text-primary-500' : 'text-primary-500'
        }`}>
          {type === 'document' ? (
            <FiFileText className="h-6 w-6" />
          ) : type === 'qa' ? (
            <FiMessageCircle className="h-6 w-6" />
          ) : (
            <FiLoader className="h-6 w-6" />
          )}
        </div>
      </div>
      
      <h3 className="text-xl font-semibold text-gray-800 mb-2">{message}</h3>
      
      <p className="text-gray-500 text-center max-w-xs">
        {type === 'document' ? (
          'We\'re fetching your document information. This should only take a moment.'
        ) : type === 'qa' ? (
          'The AI is analyzing your documents to find the most relevant information.'
        ) : (
          'Please wait while we process your request.'
        )}
      </p>
      
      {/* Loading dots */}
      <div className="mt-6 flex space-x-2">
        <div className="w-2 h-2 bg-primary-500 rounded-full animate-bounce" style={{ animationDelay: '0s' }}></div>
        <div className="w-2 h-2 bg-primary-500 rounded-full animate-bounce" style={{ animationDelay: '0.2s' }}></div>
        <div className="w-2 h-2 bg-primary-500 rounded-full animate-bounce" style={{ animationDelay: '0.4s' }}></div>
      </div>
    </div>
  );
};

export default Loading;