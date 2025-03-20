import React, { useState, useEffect } from 'react';
import { FiSend, FiHelpCircle, FiMessageSquare } from 'react-icons/fi';

interface QuestionFormProps {
  onSubmit: (question: string) => void;
  documentId?: string | null;
  isLoading?: boolean;
}

const QuestionForm: React.FC<QuestionFormProps> = ({ onSubmit, documentId = null, isLoading = false }) => {
  const [question, setQuestion] = useState('');
  const [error, setError] = useState('');
  const [charCount, setCharCount] = useState(0);
  const [isFocused, setIsFocused] = useState(false);

  useEffect(() => {
    setCharCount(question.length);
  }, [question]);

  const handleSubmit = (e: { preventDefault: () => void; }) => {
    e.preventDefault();

    if (!question.trim()) {
      setError('Please enter a question');
      return;
    }

    setError('');
    onSubmit(question);
  };

  const handleChange = (e: { target: { value: React.SetStateAction<string>; }; }) => {
    setQuestion(e.target.value);
    if (error) setError('');
  };

  const handleFocus = () => setIsFocused(true);
  const handleBlur = () => setIsFocused(false);

  // Example questions
  const exampleQuestions = [
    "What are the key findings in this document?",
    "Can you summarize the main points?",
    "What statistics are mentioned?",
    "What methodology was used?"
  ];

  const handleExampleClick = (exampleQuestion:string) => {
    setQuestion(exampleQuestion);
    setError('');
  };

  return (
    <div className="bg-white rounded-xl shadow-lg border border-gray-100 overflow-hidden transition-all duration-300 hover:shadow-xl">
      <div className="bg-gradient-to-r from-primary-600 to-primary-700 px-6 py-4 text-white">
        <div className="flex items-center">
          <FiMessageSquare className="h-6 w-6 mr-3" />
          <h2 className="text-xl font-bold">
            {documentId
              ? 'Ask About This Document'
              : 'Ask About Your Documents'}
          </h2>
        </div>
        <p className="text-primary-100 mt-1 text-sm">
          Powered by AI to find the most relevant information
        </p>
      </div>

      <div className="p-6">
        <form onSubmit={handleSubmit}>
          <div className="mb-4">
            <div className="relative">
              <textarea
                id="question"
                name="question"
                rows={4}
                className={`w-full px-4 py-3 rounded-lg border ${error ? 'border-red-400 bg-red-50' :
                    isFocused ? 'border-primary-400 bg-primary-50 shadow-sm' : 'border-gray-300'
                  } focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-transparent transition-all duration-200 resize-none placeholder-gray-400`}
                placeholder="What would you like to know about your documents?"
                value={question}
                onChange={handleChange}
                onFocus={handleFocus}
                onBlur={handleBlur}
                disabled={isLoading}
              ></textarea>

              <div className="absolute bottom-3 right-3 text-xs text-gray-400">
                {charCount} characters
              </div>
            </div>

            {error && (
              <div className="mt-2 flex items-center text-red-500 text-sm">
                <FiHelpCircle className="mr-1" />
                <p>{error}</p>
              </div>
            )}
          </div>

          <div className="flex justify-between items-center">
            <div className="hidden sm:block">
              <p className="text-xs text-gray-500 mb-1">Try asking:</p>
              <div className="flex flex-wrap gap-2">
                {exampleQuestions.map((q, index) => (
                  <button
                    key={index}
                    type="button"
                    onClick={() => handleExampleClick(q)}
                    className="text-xs bg-gray-100 hover:bg-gray-200 text-gray-700 px-2 py-1 rounded transition-colors duration-200"
                    disabled={isLoading}
                  >
                    {q.length > 20 ? q.substring(0, 20) + '...' : q}
                  </button>
                ))}
              </div>
            </div>

            <button
              type="submit"
              className={`group relative px-6 py-3 rounded-lg font-medium flex items-center justify-center min-w-[160px] overflow-hidden ${isLoading
                  ? 'bg-gray-200 text-gray-500 cursor-not-allowed'
                  : 'bg-gradient-to-r from-primary-600 to-primary-700 text-white hover:from-primary-700 hover:to-primary-800 shadow-md hover:shadow-lg'
                } transition-all duration-300 transform hover:-translate-y-1 focus:outline-none focus:ring-2 focus:ring-primary-500 focus:ring-offset-2`}
              disabled={isLoading}
            >
              {/* Background animation */}
              {!isLoading && (
                <span className="absolute inset-0 w-full h-full bg-gradient-to-r from-primary-600/0 via-primary-400/30 to-primary-600/0 -translate-x-full group-hover:animate-shimmer" />
              )}

              {/* Button content with conditional states */}
              <span className="relative flex items-center justify-center">
                {isLoading ? (
                  <>
                    <span className="absolute flex items-center justify-center w-5 h-5">
                      <span className="absolute w-full h-full border-2 border-t-transparent border-primary-200 rounded-full animate-spin"></span>
                      <span className="absolute w-3 h-3 border-2 border-t-transparent border-white rounded-full animate-spin-reverse"></span>
                    </span>
                    <span className="ml-7 font-semibold tracking-wide">Thinking...</span>
                  </>
                ) : (
                  <>
                    <span className="relative flex items-center justify-center w-5 h-5 mr-2 overflow-hidden">
                      <FiSend className="text-white group-hover:translate-x-1 group-hover:-translate-y-1 transition-transform duration-300" />
                    </span>
                    <span className="font-semibold tracking-wide group-hover:tracking-wider transition-all duration-300">
                      Ask Question
                    </span>
                  </>
                )}
              </span>

              {/* Bottom border animation */}
              {!isLoading && (
                <span className="absolute bottom-0 left-0 w-0 h-0.5 bg-white group-hover:w-full transition-all duration-300 ease-in-out" />
              )}
            </button>
          </div>
        </form>

        <div className={`mt-6 p-4 border-l-4 border-primary-300 bg-primary-50 rounded-r text-sm transition-opacity duration-300 ${isLoading ? 'opacity-50' : 'opacity-100'}`}>
          <p className="text-gray-700">
            <span className="font-medium">Pro tip:</span> Ask specific questions about {documentId ? 'this document' : 'your documents'} to get the most accurate answers. The AI will search through your content to find relevant information.
          </p>
        </div>
      </div>
    </div>
  );
};

export default QuestionForm;