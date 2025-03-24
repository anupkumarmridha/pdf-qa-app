import React, { useState } from 'react';
import { FiFileText, FiDatabase, FiClipboard, FiCheck, FiExternalLink, FiChevronDown, FiChevronUp } from 'react-icons/fi';

interface SourcesListProps {
  sources: any[];
}

const SourcesList: React.FC<SourcesListProps> = ({ sources }) => {
  const [expandedIndex, setExpandedIndex] = useState<number | null>(null);
  const [copiedIndex, setCopiedIndex] = useState<number | null>(null);

  const toggleExpand = (index: number) => {
    if (expandedIndex === index) {
      setExpandedIndex(null);
    } else {
      setExpandedIndex(index);
    }
  };

  const copyToClipboard = (text: string, index: number, event: React.MouseEvent) => {
    event.stopPropagation();
    navigator.clipboard.writeText(text);
    setCopiedIndex(index);
    setTimeout(() => setCopiedIndex(null), 2000);
  };

  if (!sources || sources.length === 0) {
    return (
      <div className="bg-white shadow-sm rounded-lg border border-gray-200 p-6 text-center">
        <p className="text-gray-500">No sources available for this response.</p>
      </div>
    );
  }

  return (
    <div className="bg-white shadow-sm rounded-lg border border-gray-200 overflow-hidden">
      <div className="px-4 py-3 border-b border-gray-200 bg-gray-50">
        <h2 className="text-lg font-semibold text-gray-800 flex items-center">
          <FiExternalLink className="mr-2 text-primary-600" />
          Sources
        </h2>
        <p className="text-sm text-gray-600 mt-1">
          References used to generate the response
        </p>
      </div>
      
      <div className="divide-y divide-gray-100 max-h-[60vh] overflow-y-auto">
        {sources.map((source, index) => (
          <div 
            key={index}
            className="transition-all duration-200"
          >
            <div 
              className={`flex justify-between items-center p-3 cursor-pointer hover:bg-gray-50 ${
                expandedIndex === index ? 'bg-gray-50' : ''
              }`}
              onClick={() => toggleExpand(index)}
            >
              <div className="flex items-center">
                {source.metadata?.type === 'pdf' ? (
                  <FiFileText className="text-red-500 mr-2 flex-shrink-0" />
                ) : (
                  <FiDatabase className="text-green-500 mr-2 flex-shrink-0" />
                )}
                <div className="flex flex-col">
                  <span className="font-medium text-gray-700 line-clamp-1">
                    {source.metadata?.source || `Source ${index + 1}`}
                  </span>
                  <span className="text-xs text-gray-500">
                    {expandedIndex === index ? 'Click to collapse' : 'Click to expand'}
                  </span>
                </div>
              </div>
              
              <div className="flex items-center space-x-1">
                <button
                  onClick={(e) => copyToClipboard(source.text, index, e)}
                  className="text-gray-400 hover:text-gray-600 p-1 rounded hover:bg-gray-100"
                  aria-label="Copy text"
                  title="Copy text"
                >
                  {copiedIndex === index ? (
                    <FiCheck className="h-4 w-4 text-green-500" />
                  ) : (
                    <FiClipboard className="h-4 w-4" />
                  )}
                </button>
                
                {expandedIndex === index ? (
                  <FiChevronUp className="text-gray-400" />
                ) : (
                  <FiChevronDown className="text-gray-400" />
                )}
              </div>
            </div>
            
            {expandedIndex === index && (
              <div className="p-3 bg-gray-50 border-t border-gray-100 animate-fade-in">
                <div className="text-sm bg-white border border-gray-200 rounded-md p-3 whitespace-pre-line text-gray-700 max-h-80 overflow-y-auto scrollbar-thin scrollbar-thumb-gray-300 scrollbar-track-gray-100">
                  {source.text}
                </div>
                
                {/* Metadata section */}
                {source.metadata && Object.keys(source.metadata).length > 0 && (
                  <div className="mt-3 text-xs text-gray-500">
                    <div className="font-medium mb-1">Document metadata:</div>
                    <div className="bg-gray-100 p-2 rounded">
                      {Object.entries(source.metadata).map(([key, value]) => (
                        key !== 'text' && (
                          <div key={key} className="grid grid-cols-3 mb-1">
                            <span className="font-medium">{key}:</span>
                            <span className="col-span-2">{String(value)}</span>
                          </div>
                        )
                      ))}
                    </div>
                  </div>
                )}
              </div>
            )}
          </div>
        ))}
      </div>
    </div>
  );
};

export default SourcesList;