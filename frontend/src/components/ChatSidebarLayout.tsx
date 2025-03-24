import React, { useState, useEffect } from 'react';
import { FiMenu, FiX, FiPlus, FiChevronLeft, FiChevronRight } from 'react-icons/fi';
import ChatHistoryList from './ChatHistoryList';

interface ChatSidebarLayoutProps {
  children: React.ReactNode;
  currentChatId?: string | null;
  onSelectChat: (chatId: string) => void;
  onNewChat: () => void;
  title?: string;
  documentMode?: boolean;
  rightSidebar?: React.ReactNode; // New prop for right sidebar content
  rightSidebarTitle?: string; // Title for right sidebar
}

const ChatSidebarLayout: React.FC<ChatSidebarLayoutProps> = ({
  children,
  currentChatId,
  onSelectChat,
  onNewChat,
  title = "Conversations",
  documentMode = false,
  rightSidebar,
  rightSidebarTitle = "Documents"
}) => {
  const [isLeftSidebarOpen, setIsLeftSidebarOpen] = useState(true);
  const [isRightSidebarOpen, setIsRightSidebarOpen] = useState(true);
  const [isMobileView, setIsMobileView] = useState(false);
  const [isTabletView, setIsTabletView] = useState(false);
  const [activeDrawer, setActiveDrawer] = useState<'none' | 'left' | 'right'>('none');
  
  // Check if we're in mobile/tablet view
  useEffect(() => {
    const checkViewportSize = () => {
      const width = window.innerWidth;
      setIsMobileView(width < 768);
      setIsTabletView(width >= 768 && width < 1280);
      
      // Automatically close sidebars on smaller screens
      if (width < 1024) {
        setIsLeftSidebarOpen(false);
        setIsRightSidebarOpen(false);
      } else {
        setIsLeftSidebarOpen(true);
        setIsRightSidebarOpen(rightSidebar != null);
      }
    };
    
    checkViewportSize();
    window.addEventListener('resize', checkViewportSize);
    
    return () => {
      window.removeEventListener('resize', checkViewportSize);
    };
  }, [rightSidebar]);
  
  const toggleLeftSidebar = () => {
    if (isMobileView || isTabletView) {
      setActiveDrawer(activeDrawer === 'left' ? 'none' : 'left');
    } else {
      setIsLeftSidebarOpen(!isLeftSidebarOpen);
    }
  };
  
  const toggleRightSidebar = () => {
    if (isMobileView || isTabletView) {
      setActiveDrawer(activeDrawer === 'right' ? 'none' : 'right');
    } else {
      setIsRightSidebarOpen(!isRightSidebarOpen);
    }
  };
  
  return (
    <div className="flex h-full w-full relative bg-gray-50">
      {/* Mobile backdrop */}
      {(isMobileView || isTabletView) && activeDrawer !== 'none' && (
        <div 
          className="fixed inset-0 bg-black bg-opacity-30 z-20"
          onClick={() => setActiveDrawer('none')}
        />
      )}
      
      {/* Left Sidebar */}
      <div 
        className={`${
          isMobileView || isTabletView
            ? `fixed left-0 top-0 bottom-0 z-30 w-80 transform transition-transform duration-300 ease-in-out ${
                activeDrawer === 'left' ? 'translate-x-0' : '-translate-x-full'
              }`
            : `relative border-r border-gray-200 transition-all duration-300 ease-in-out ${
                isLeftSidebarOpen ? 'w-80' : 'w-0 overflow-hidden'
              }`
        } bg-white flex flex-col h-full`}
      >
        {/* Sidebar header */}
        <div className="p-4 border-b border-gray-200 flex justify-between items-center">
          <h2 className="text-lg font-semibold text-gray-800">{title}</h2>
          {(isMobileView || isTabletView) && (
            <button 
              onClick={() => setActiveDrawer('none')}
              className="text-gray-500 hover:text-gray-700"
            >
              <FiX className="h-5 w-5" />
            </button>
          )}
        </div>
        
        {/* New chat button */}
        <div className="p-4">
          <button
            onClick={onNewChat}
            className="w-full flex items-center justify-center px-4 py-2 rounded-lg bg-primary-100 text-primary-700 hover:bg-primary-200 transition-colors"
          >
            <FiPlus className="mr-2" />
            New Chat
          </button>
        </div>
        
        {/* Chat list */}
        <div className="flex-grow overflow-hidden">
          <ChatHistoryList
            onSelectChat={onSelectChat}
            currentChatId={currentChatId}
            documentMode={documentMode}
          />
        </div>
      </div>
      
      {/* Main content */}
      <div className="flex-grow flex flex-col min-w-0 h-full">
        {/* Header with toggle buttons */}
        <div className="p-4 flex justify-between items-center border-b border-gray-200 bg-white">
          <div className="flex items-center">
            <button
              onClick={toggleLeftSidebar}
              className="p-2 rounded-md text-gray-500 hover:text-gray-700 hover:bg-gray-100"
              aria-label="Toggle left sidebar"
            >
              {isMobileView || isTabletView ? (
                <FiMenu className="h-5 w-5" />
              ) : isLeftSidebarOpen ? (
                <FiChevronLeft className="h-5 w-5" />
              ) : (
                <FiChevronRight className="h-5 w-5" />
              )}
            </button>
            
            {/* Title in main area */}
            {(!isLeftSidebarOpen || isMobileView || isTabletView) && (
              <h1 className="ml-2 text-lg font-semibold text-gray-800">{title}</h1>
            )}
          </div>
          
          {/* Right sidebar toggle button (only show if there's right sidebar content) */}
          {rightSidebar && (
            <button
              onClick={toggleRightSidebar}
              className="p-2 rounded-md text-gray-500 hover:text-gray-700 hover:bg-gray-100"
              aria-label="Toggle right sidebar"
            >
              {isMobileView || isTabletView ? (
                <FiMenu className="h-5 w-5" />
              ) : isRightSidebarOpen ? (
                <FiChevronRight className="h-5 w-5" />
              ) : (
                <FiChevronLeft className="h-5 w-5" />
              )}
            </button>
          )}
        </div>
        
        {/* Main content area */}
        <div className="flex-grow overflow-auto p-4">
          {children}
        </div>
      </div>
      
      {/* Right Sidebar */}
      {rightSidebar && (
        <div 
          className={`${
            isMobileView || isTabletView
              ? `fixed right-0 top-0 bottom-0 z-30 w-80 transform transition-transform duration-300 ease-in-out ${
                  activeDrawer === 'right' ? 'translate-x-0' : 'translate-x-full'
                }`
              : `relative border-l border-gray-200 transition-all duration-300 ease-in-out ${
                  isRightSidebarOpen ? 'w-80' : 'w-0 overflow-hidden'
                }`
          } bg-white flex flex-col h-full`}
        >
          {/* Right sidebar header */}
          <div className="p-4 border-b border-gray-200 flex justify-between items-center">
            <h2 className="text-lg font-semibold text-gray-800">{rightSidebarTitle}</h2>
            {(isMobileView || isTabletView) && (
              <button 
                onClick={() => setActiveDrawer('none')}
                className="text-gray-500 hover:text-gray-700"
              >
                <FiX className="h-5 w-5" />
              </button>
            )}
          </div>
          
          {/* Right sidebar content */}
          <div className="flex-grow overflow-auto p-4">
            {rightSidebar}
          </div>
        </div>
      )}
    </div>
  );
};

export default ChatSidebarLayout;