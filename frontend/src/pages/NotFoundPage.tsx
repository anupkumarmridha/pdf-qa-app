import React from 'react';
import { Link } from 'react-router-dom';
import { FiHome, FiAlertTriangle } from 'react-icons/fi';

const NotFoundPage = () => {
  return (
    <div className="flex flex-col items-center justify-center min-h-screen-minus-nav text-center px-4">
      <FiAlertTriangle className="h-16 w-16 text-yellow-500 mb-6" />
      
      <h1 className="text-4xl font-bold text-gray-900 mb-2">
        404 - Page Not Found
      </h1>
      
      <p className="text-xl text-gray-600 mb-8 max-w-md">
        The page you're looking for doesn't exist or has been moved.
      </p>
      
      <Link 
        to="/" 
        className="btn btn-primary inline-flex items-center"
      >
        <FiHome className="mr-2" />
        Return to Home
      </Link>
    </div>
  );
};

export default NotFoundPage;