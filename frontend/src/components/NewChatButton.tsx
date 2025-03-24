import React from 'react';
import { FiPlus, FiMessageSquare } from 'react-icons/fi';

interface NewChatButtonProps {
  onClick: () => void;
  className?: string;
  variant?: 'default' | 'outline';
}

const NewChatButton: React.FC<NewChatButtonProps> = ({ 
  onClick, 
  className = '',
  variant = 'default'
}) => {
  return (
    <button
      onClick={onClick}
      className={`flex items-center justify-center px-4 py-2 rounded-md transition-colors ${
        variant === 'default' 
          ? 'bg-white hover:bg-gray-50 text-primary-600 border border-gray-200 shadow-sm' 
          : 'bg-primary-50 hover:bg-primary-100 text-primary-700 border border-primary-100'
      } ${className}`}
      aria-label="Start new chat"
    >
      {variant === 'default' ? (
        <FiPlus className="mr-2" />
      ) : (
        <FiMessageSquare className="mr-2" />
      )}
      New Chat
    </button>
  );
};

export default NewChatButton;