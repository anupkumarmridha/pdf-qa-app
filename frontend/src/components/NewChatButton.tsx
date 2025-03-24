import React, { useState } from 'react';
import { FiPlus, FiMessageSquare, FiList } from 'react-icons/fi';
import ChatHistoryModal from './ChatHistoryModal';

interface NewChatButtonProps {
  onClick: () => void;
  className?: string;
  variant?: 'default' | 'outline';
  onSelectChat?: (chatId: string) => void;
  currentChatId?: string | null;
}

const NewChatButton: React.FC<NewChatButtonProps> = ({ 
  onClick, 
  className = '',
  variant = 'default',
  onSelectChat,
  currentChatId
}) => {
  const [isHistoryModalOpen, setIsHistoryModalOpen] = useState(false);
  
  const handleSelectChat = (chatId: string) => {
    if (onSelectChat) {
      onSelectChat(chatId);
    }
  };
  
  return (
    <div className="flex space-x-2">
      {onSelectChat && (
        <button
          onClick={() => setIsHistoryModalOpen(true)}
          className={`flex items-center justify-center px-3 py-2 rounded-md transition-colors ${
            variant === 'default' 
              ? 'bg-white hover:bg-gray-50 text-gray-600 border border-gray-200 shadow-sm' 
              : 'bg-gray-50 hover:bg-gray-100 text-gray-700 border border-gray-100'
          }`}
          aria-label="Chat history"
          title="Chat history"
        >
          <FiList className="h-5 w-5" />
        </button>
      )}
      
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
      
      {onSelectChat && (
        <ChatHistoryModal
          isOpen={isHistoryModalOpen}
          onClose={() => setIsHistoryModalOpen(false)}
          onSelectChat={handleSelectChat}
          currentChatId={currentChatId}
        />
      )}
    </div>
  );
};

export default NewChatButton;