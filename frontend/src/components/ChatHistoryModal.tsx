import React, { useEffect, useRef } from 'react';
import ChatHistoryList from './ChatHistoryList';

interface ChatHistoryModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSelectChat: (chatId: string) => void;
  currentChatId?: string | null;
}

const ChatHistoryModal: React.FC<ChatHistoryModalProps> = ({
  isOpen,
  onClose,
  onSelectChat,
  currentChatId
}) => {
  const modalRef = useRef<HTMLDivElement>(null);
  
  useEffect(() => {
    // Add event listener to handle clicks outside modal
    const handleClickOutside = (event: MouseEvent) => {
      if (modalRef.current && !modalRef.current.contains(event.target as Node)) {
        onClose();
      }
    };
    
    // Add escape key handler
    const handleEscKey = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        onClose();
      }
    };
    
    if (isOpen) {
      document.addEventListener('mousedown', handleClickOutside);
      document.addEventListener('keydown', handleEscKey);
      // Prevent body scrolling
      document.body.style.overflow = 'hidden';
    }
    
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
      document.removeEventListener('keydown', handleEscKey);
      document.body.style.overflow = '';
    };
  }, [isOpen, onClose]);
  
  if (!isOpen) return null;
  
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-50 animate-fade-in">
      <div 
        ref={modalRef}
        className="bg-white rounded-lg shadow-lg w-full max-w-lg max-h-[80vh] flex flex-col animate-slide-in"
      >
        <div className="h-full max-h-[80vh] overflow-hidden">
          <ChatHistoryList
            onSelectChat={onSelectChat}
            currentChatId={currentChatId}
            onClose={onClose}
          />
        </div>
      </div>
    </div>
  );
};

export default ChatHistoryModal;