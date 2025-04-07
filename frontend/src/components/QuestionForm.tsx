import React, { useState, useEffect, useRef } from 'react';
import { FiSend, FiCornerDownRight, FiChevronDown, FiChevronUp, FiHelpCircle, FiX, FiRefreshCw } from 'react-icons/fi';

interface QuestionFormProps {
  onSubmit: (question: string) => void;
  documentId?: string;
  isLoading?: boolean;
  disabled?: boolean;
  hasConversationHistory?: boolean;
  isFollowUpQuestion?: boolean;
  lastQuestion?: string;
  onRetry?: () => void;  
  initialQuestion?: string;
  isEditing?: boolean;
  onCancelEdit?: () => void;
}

const QuestionForm: React.FC<QuestionFormProps> = ({ 
  onSubmit, 
  documentId,
  isLoading = false, 
  disabled = false,
  isFollowUpQuestion = false,
  lastQuestion = '',
  onRetry,
  initialQuestion = '',
  isEditing = false,
  onCancelEdit
}) => {
  const [question, setQuestion] = useState(initialQuestion);
  const [error, setError] = useState('');
  const [charCount, setCharCount] = useState(0);
  const [isFocused, setIsFocused] = useState(false);
  const [showSuggestions, setShowSuggestions] = useState(false);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  // Update character count when question changes
  useEffect(() => {
    setCharCount(question?.length || 0);
  }, [question]);

  // Initialize with initial question when provided
  useEffect(() => {
    if (initialQuestion) {
      setQuestion(initialQuestion);
      // Focus and place cursor at the end when editing
      if (isEditing && textareaRef.current) {
        const len = initialQuestion.length;
        textareaRef.current.focus();
        textareaRef.current.setSelectionRange(len, len);
      }
    }
  }, [initialQuestion, isEditing]);

  // Auto-resize textarea based on content
  useEffect(() => {
    if (textareaRef.current) {
      textareaRef.current.style.height = 'auto';
      textareaRef.current.style.height = Math.min(textareaRef.current.scrollHeight, 200) + 'px';
    }
  }, [question]);

  // Handle form submission
  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();

    if (!question?.trim()) {
      setError('Please enter a question');
      return;
    }

    setError('');
    onSubmit(question);
    
    // Only clear the question if not in edit mode
    if (!isEditing) {
      setQuestion('');
    }
    
    // Reset textarea height
    if (textareaRef.current) {
      textareaRef.current.style.height = 'auto';
    }
  };

  const handleChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    setQuestion(e.target.value);
    if (error) setError('');
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    // Submit on Enter (without Shift)
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSubmit(e);
    } else if (isEditing && e.key === 'Escape' && onCancelEdit) {
      e.preventDefault();
      onCancelEdit();
    }
  };

  const handleFocus = () => setIsFocused(true);
  const handleBlur = () => setIsFocused(false);

  // Example questions
  const followUpExamples = [
    "Can you explain that in more detail?",
    "Why is that important?",
    "How does that relate to the previous point?",
    "Can you provide more examples?"
  ];

  const initialQuestions = [
    "What are the key findings in this document?",
    "Summarize the main points",
    "What statistics are mentioned?",
    "What methodology was used?"
  ];

  const handleExampleClick = (exampleQuestion: string) => {
    setQuestion(exampleQuestion);
    setError('');
    if (textareaRef.current) {
      textareaRef.current.focus();
    }
  };

  return (
    <div className={`relative ${isFollowUpQuestion ? 'mt-6' : 'mt-2'}`}>
      {/* Suggestions panel */}
      {showSuggestions && (
        <div className="absolute bottom-full w-full mb-2 bg-white rounded-lg shadow-lg border border-gray-200 p-3 z-10 animate-fade-in">
          <div className="flex justify-between items-center mb-2">
            <h3 className="text-sm font-medium text-gray-700">Suggested questions</h3>
            <button 
              onClick={() => setShowSuggestions(false)}
              className="text-gray-400 hover:text-gray-600"
            >
              <FiX size={16} />
            </button>
          </div>
          <div className="grid grid-cols-2 gap-2">
            {(isFollowUpQuestion ? followUpExamples : initialQuestions).map((example, index) => (
              <button
                key={index}
                onClick={() => handleExampleClick(example)}
                className="text-sm text-left bg-gray-50 hover:bg-gray-100 text-gray-700 px-3 py-2 rounded-md transition-colors duration-200"
              >
                {example}
              </button>
            ))}
          </div>
        </div>
      )}
      
      {/* Main form */}
      <div className={`bg-white rounded-xl shadow-md border ${isEditing ? 'border-primary-300 ring-2 ring-primary-200' : isFollowUpQuestion ? 'border-gray-200' : 'border-gray-300'} overflow-hidden transition-all duration-300`}>
        <form onSubmit={handleSubmit} className="relative">
          <div className="flex items-end">
            <div className="relative flex-grow">
              <textarea
                ref={textareaRef}
                id="question"
                rows={1}
                className={`w-full pl-4 pr-24 py-4 resize-none overflow-hidden border-0 focus:ring-0 focus:outline-none text-gray-700 placeholder-gray-400 ${isLoading || disabled ? 'bg-gray-50' : 'bg-white'}`}
                placeholder={isEditing ? "Edit your question..." : isFollowUpQuestion ? 
                  "Ask a follow-up question..." : 
                  "Ask a question about your document..."}
                value={question || ''}
                onChange={handleChange}
                onKeyDown={handleKeyDown}
                onFocus={handleFocus}
                onBlur={handleBlur}
                disabled={isLoading || (disabled && !isEditing)}
                style={{ minHeight: '56px' }}
              />
              
              {/* Character count */}
              {question && question.length > 0 && (
                <div className="absolute right-20 bottom-4 text-xs text-gray-400">
                  {charCount} / 4000
                </div>
              )}
            </div>
            
            {/* Actions toolbar */}
            <div className="flex items-center pr-2">
              {!isEditing && (
                <button
                  type="button"
                  className="p-2 rounded-full text-gray-400 hover:text-gray-600 hover:bg-gray-100 transition-colors"
                  onClick={() => setShowSuggestions(!showSuggestions)}
                  title={showSuggestions ? "Hide suggestions" : "Show suggestions"}
                >
                  {showSuggestions ? <FiChevronDown size={18} /> : <FiChevronUp size={18} />}
                </button>
              )}
              
              {isEditing && onCancelEdit && (
                <button
                  type="button"
                  onClick={onCancelEdit}
                  className="p-2 rounded-full text-gray-400 hover:text-gray-600 hover:bg-gray-100 transition-colors"
                  title="Cancel editing"
                >
                  <FiX size={18} />
                </button>
              )}
              
              {!isEditing && lastQuestion && onRetry && (
                <button
                  type="button"
                  onClick={onRetry}
                  disabled={isLoading || disabled}
                  className={`p-2 rounded-full ml-1 ${
                    isLoading || disabled
                      ? 'text-gray-300 cursor-not-allowed'
                      : 'text-orange-500 hover:text-orange-600 hover:bg-orange-50'
                  } transition-colors`}
                  title="Regenerate response"
                >
                  <FiRefreshCw size={18} />
                </button>
              )}

              <button
                type="submit"
                disabled={(isLoading || disabled) && !isEditing || (!question?.trim())}
                className={`p-2 rounded-full ml-1 ${
                  (isLoading || disabled) && !isEditing || (!question?.trim())
                    ? 'text-gray-300 cursor-not-allowed'
                    : 'text-primary-600 hover:text-primary-700 hover:bg-primary-50'
                } transition-colors`}
                title={isEditing ? "Save changes" : "Send message"}
              >
                {isLoading && !isEditing ? (
                  <div className="w-5 h-5 relative">
                    <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-primary-600"></div>
                  </div>
                ) : (
                  <FiSend size={18} />
                )}
              </button>
            </div>
          </div>
        </form>
        
        {/* Error message */}
        {error && (
          <div className="px-4 py-2 bg-red-50 text-red-500 text-sm flex items-center">
            <FiHelpCircle className="mr-1" />
            <p>{error}</p>
          </div>
        )}
        
        {/* Helper text */}
        {!isEditing && (
          <div className="px-4 py-2 bg-gray-50 border-t border-gray-100 text-xs text-gray-500 flex items-center justify-between">
            <span>
              <span className="font-medium">Tip:</span> Press Enter to send, Shift+Enter for new line
            </span>
            {isEditing ? (
              <span className="flex items-center text-primary-600">
                <FiCornerDownRight className="mr-1" size={12} />
                Editing message
              </span>
            ) : isFollowUpQuestion && (
              <span className="flex items-center text-primary-600">
                <FiCornerDownRight className="mr-1" size={12} />
                Follow-up question
              </span>
            )}
          </div>
        )}
      </div>
    </div>
  );
};

export default QuestionForm;