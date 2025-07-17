"use client";

import React, { useState } from 'react';
import { MessageCircle, X } from 'lucide-react';
import ChatInterface from './ChatInterface';

const ChatBubble = () => {
  const [isOpen, setIsOpen] = useState(false);

  const toggleChat = () => {
    setIsOpen(!isOpen);
  };

  return (
    <>
      {/* Chat Bubble */}
      <div className="fixed bottom-4 right-4 z-50">
        <button
          onClick={toggleChat}
          className={`
            w-14 h-14 rounded-full shadow-lg transition-all duration-300 ease-in-out
            flex items-center justify-center text-white
            ${isOpen 
              ? 'bg-red-500 hover:bg-red-600 rotate-180' 
              : 'bg-green-600 hover:bg-green-700 hover:scale-110'
            }
          `}
          aria-label={isOpen ? "Đóng chat" : "Mở chat"}
        >
          {isOpen ? (
            <X className="w-6 h-6" />
          ) : (
            <MessageCircle className="w-6 h-6" />
          )}
        </button>
        
        {/* Notification Badge (optional) */}
        {!isOpen && (
          <div className="absolute -top-1 -right-1 w-4 h-4 bg-red-500 rounded-full flex items-center justify-center">
            <span className="text-xs text-white font-bold">!</span>
          </div>
        )}
      </div>

      {/* Chat Interface */}
      <ChatInterface isOpen={isOpen} onClose={() => setIsOpen(false)} />
    </>
  );
};

export default ChatBubble; 