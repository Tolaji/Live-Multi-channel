// components/Player/LiveChat.jsx

import React, { useState, useEffect, useRef } from 'react';
import apiClient from '../../services/apiClient';

export default function LiveChat({ videoId }) {
  const [messages, setMessages] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const messagesEndRef = useRef(null);
  
  useEffect(() => {
    let interval;
    
    async function fetchMessages() {
      try {
        setError(null);
        
        const response = await fetch(
          `${apiClient.backendUrl}/api/chat/${videoId}/messages`,
          { credentials: 'include' }
        );
        
        if (!response.ok) {
          throw new Error('Failed to fetch chat messages');
        }
        
        const data = await response.json();
        setMessages(data.messages || []);
        setLoading(false);
        
      } catch (err) {
        console.error('Error fetching chat:', err);
        setError(err.message);
        setLoading(false);
      }
    }
    
    // Initial fetch
    fetchMessages();
    
    // Poll every 5 seconds
    interval = setInterval(fetchMessages, 5000);
    
    return () => clearInterval(interval);
  }, [videoId]);
  
  // Auto-scroll to bottom
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);
  
  if (loading) {
    return (
      <div className="flex items-center justify-center h-full">
        <div className="text-gray-400">Loading chat...</div>
      </div>
    );
  }
  
  if (error) {
    return (
      <div className="flex items-center justify-center h-full p-4">
        <div className="text-red-500 text-center">
          <p className="mb-2">Chat unavailable</p>
          <p className="text-sm">{error}</p>
        </div>
      </div>
    );
  }
  
  return (
    <div className="flex flex-col h-full">
      {/* Header */}
      <div className="px-4 py-3 border-b border-gray-700">
        <h3 className="font-semibold">Live Chat</h3>
      </div>
      
      {/* Messages */}
      <div className="flex-1 overflow-y-auto p-4 space-y-3">
        {messages.length === 0 ? (
          <div className="text-gray-400 text-center text-sm">
            No messages yet
          </div>
        ) : (
          messages.map((message, index) => (
            <div key={index} className="text-sm">
              <span className="font-semibold text-orange-500">
                {message.author}
              </span>
              // components/Player/LiveChat.jsx (continued)

              <span className="text-gray-300 ml-2">
                {message.message}
              </span>
            </div>
          ))
        )}
        <div ref={messagesEndRef} />
      </div>
      
      {/* Footer note */}
      <div className="px-4 py-2 border-t border-gray-700 text-xs text-gray-500">
        Read-only chat (updates every 5s)
      </div>
    </div>
  );
}
