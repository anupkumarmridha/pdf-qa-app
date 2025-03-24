import React, { useState, useEffect, useRef } from 'react';
import { FiMessageSquare, FiTrash2, FiSearch, FiX, FiCalendar, FiFile, FiMoreVertical } from 'react-icons/fi';
import { getAllChatSessions, deleteChatSession, ChatSession } from '../services/chatHistoryService';

interface ChatHistoryListProps {
  onSelectChat: (chatId: string) => void;
  currentChatId?: string | null;
  documentMode?: boolean;
}

const ChatHistoryList: React.FC<ChatHistoryListProps> = ({
  onSelectChat,
  currentChatId = null,
  documentMode = false
}) => {
  const [chatSessions, setChatSessions] = useState<ChatSession[]>([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [searchFocused, setSearchFocused] = useState(false);
  const [menuOpenFor, setMenuOpenFor] = useState<string | null>(null);
  const menuRef = useRef<HTMLDivElement>(null);
  
  useEffect(() => {
    loadChatSessions();
    
    // Set up periodic refresh for when chats are updated in other tabs
    const intervalId = setInterval(loadChatSessions, 5000);
    
    return () => clearInterval(intervalId);
  }, []);
  
  // Handle clicks outside the dropdown menu
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(event.target as Node)) {
        setMenuOpenFor(null);
      }
    };
    
    document.addEventListener('mousedown', handleClickOutside);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, []);
  
  const loadChatSessions = () => {
    const sessions = getAllChatSessions();
    
    // Filter sessions by document mode if needed
    const filteredSessions = documentMode 
      ? sessions.filter(session => !!session.documentId) 
      : sessions.filter(session => !session.documentId);
      
    setChatSessions(filteredSessions);
  };
  
  const handleDeleteChat = (e: React.MouseEvent, chatId: string) => {
    e.stopPropagation();
    e.preventDefault();
    
    if (window.confirm('Are you sure you want to delete this chat?')) {
      deleteChatSession(chatId);
      loadChatSessions();
      
      // Close the menu
      setMenuOpenFor(null);
    }
  };
  
  const toggleMenu = (e: React.MouseEvent, chatId: string) => {
    e.stopPropagation();
    e.preventDefault();
    
    setMenuOpenFor(menuOpenFor === chatId ? null : chatId);
  };
  
  const filteredSessions = searchTerm 
    ? chatSessions.filter(chat => 
        chat.title.toLowerCase().includes(searchTerm.toLowerCase()) || 
        chat.preview.toLowerCase().includes(searchTerm.toLowerCase())
      )
    : chatSessions;
  
  const formatTime = (date: Date) => {
    const today = new Date();
    const yesterday = new Date(today);
    yesterday.setDate(yesterday.getDate() - 1);
    
    if (date.toDateString() === today.toDateString()) {
      return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
    } else if (date.toDateString() === yesterday.toDateString()) {
      return 'Yesterday';
    } else {
      return date.toLocaleDateString([], { month: 'short', day: 'numeric' });
    }
  };
  
  if (chatSessions.length === 0) {
    return (
      <div className="h-full flex flex-col items-center justify-center text-center p-6 text-gray-500">
        <FiMessageSquare className="h-12 w-12 mb-4 text-gray-300" />
        <h3 className="text-lg font-medium mb-2">No conversations yet</h3>
        <p className="text-sm">
          Your conversations will appear here once you start chatting.
        </p>
      </div>
    );
  }
  
  return (
    <div className="h-full flex flex-col">
      {/* Search box */}
      <div className="px-4 pb-2">
        <div className={`relative rounded-md transition-all duration-200 ${
          searchFocused ? 'ring-2 ring-primary-500 border-primary-500' : 'border-gray-300'
        }`}>
          <input
            type="text"
            placeholder="Search conversations..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            onFocus={() => setSearchFocused(true)}
            onBlur={() => setSearchFocused(false)}
            className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:outline-none text-sm"
          />
          <FiSearch className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" />
          
          {searchTerm && (
            <button
              onClick={() => setSearchTerm('')}
              className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-400 hover:text-gray-600"
            >
              <FiX className="h-4 w-4" />
            </button>
          )}
        </div>
      </div>
      
      {/* Chat list */}
      <div className="overflow-y-auto flex-grow">
        {searchTerm && filteredSessions.length === 0 ? (
          <div className="p-4 text-center text-gray-500">
            <p>No conversations match your search.</p>
          </div>
        ) : (
          <ul className="space-y-1 px-2">
            {filteredSessions.map((chat) => (
              <li 
                key={chat.id}
                onClick={() => onSelectChat(chat.id)}
                className={`relative cursor-pointer rounded-lg p-3 transition-colors ${
                  chat.id === currentChatId 
                    ? 'bg-primary-100 text-primary-900' 
                    : 'hover:bg-gray-100 text-gray-700'
                }`}
              >
                <div className="flex justify-between items-start">
                  <div className="flex-1 min-w-0">
                    <h3 className="font-medium text-sm line-clamp-1">
                      {chat.title}
                    </h3>
                    
                    <div className="mt-1 text-xs line-clamp-2 text-gray-500">
                      {chat.preview}
                    </div>
                    
                    <div className="mt-1 flex items-center text-xs text-gray-400">
                      <FiCalendar className="mr-1 h-3 w-3" />
                      <span>{formatTime(chat.lastUpdated)}</span>
                      
                      {chat.documentId && (
                        <span className="ml-2 flex items-center">
                          <FiFile className="mr-1 h-3 w-3" />
                          <span>Document</span>
                        </span>
                      )}
                    </div>
                  </div>
                  
                  {/* Action button */}
                  <button
                    onClick={(e) => toggleMenu(e, chat.id)}
                    className={`ml-2 p-1 rounded-full ${
                      chat.id === currentChatId ? 'text-primary-700 hover:bg-primary-200' : 'text-gray-400 hover:bg-gray-200'
                    }`}
                  >
                    <FiMoreVertical className="h-4 w-4" />
                  </button>
                  
                  {/* Dropdown menu */}
                  {menuOpenFor === chat.id && (
                    <div 
                      ref={menuRef}
                      className="absolute right-2 top-8 bg-white shadow-lg rounded-md py-1 border border-gray-200 z-10"
                    >
                      <button
                        onClick={(e) => handleDeleteChat(e, chat.id)}
                        className="w-full text-left px-4 py-2 text-sm text-red-600 hover:bg-red-50 flex items-center"
                      >
                        <FiTrash2 className="mr-2 h-4 w-4" />
                        Delete conversation
                      </button>
                    </div>
                  )}
                </div>
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  );
};

export default ChatHistoryList;