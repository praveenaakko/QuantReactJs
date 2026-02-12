
import React, { useState, useRef, useEffect } from 'react';
import { useStore } from '../store/store';

interface ChatMessage {
  role: 'user' | 'assistant';
  content: string;
}

const BACKEND_URL = process.env.BACKEND_URL || 'http://localhost:8000';

export const ChatBot: React.FC = () => {
  const { state, dispatch } = useStore();
  const { isChatOpen, currentUser } = state;
  
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [inputValue, setInputValue] = useState('');
  const [isTyping, setIsTyping] = useState(false);
  
  const messagesEndRef = useRef<HTMLDivElement>(null);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    if (isChatOpen) {
      scrollToBottom();
    }
  }, [isChatOpen, messages, isTyping]);

  if (!isChatOpen) return null;

  const handleSendMessage = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!inputValue.trim() || isTyping) return;

    const userMessage: ChatMessage = { role: 'user', content: inputValue };
    const updatedMessages = [...messages, userMessage];
    
    setMessages(updatedMessages);
    setInputValue('');
    setIsTyping(true);

    // Initialize the assistant's message placeholder
    setMessages(prev => [...prev, { role: 'assistant', content: '' }]);

    try {
      const token = localStorage.getItem('token');
      const response = await fetch(`${BACKEND_URL}/chat/ask`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...(token ? { 'Authorization': `Bearer ${token}` } : {})
        },
        body: JSON.stringify({
          messages: updatedMessages.map(m => ({ role: m.role, content: m.content })),
          model: 'mistral',
          stream: true 
        })
      });

      if (!response.ok) throw new Error('Failed to connect to assistant');

      const reader = response.body?.getReader();
      const decoder = new TextDecoder();
      let accumulatedContent = '';

      if (reader) {
        while (true) {
          const { done, value } = await reader.read();
          if (done) break;

          const chunk = decoder.decode(value, { stream: true });
          
          // Assuming the backend sends either raw text chunks 
          // or a sequence of JSON fragments like {"reply": "..."}
          try {
            // Try parsing if it's a JSON stream
            const lines = chunk.split('\n').filter(l => l.trim());
            for (const line of lines) {
              const data = JSON.parse(line);
              const part = data.reply || data.content || '';
              accumulatedContent += part;
              
              setMessages(prev => {
                const newMessages = [...prev];
                const lastIdx = newMessages.length - 1;
                if (lastIdx >= 0 && newMessages[lastIdx].role === 'assistant') {
                  newMessages[lastIdx] = { ...newMessages[lastIdx], content: accumulatedContent };
                }
                return newMessages;
              });
            }
          } catch (e) {
            // Fallback for raw text stream
            accumulatedContent += chunk;
            setMessages(prev => {
              const newMessages = [...prev];
              const lastIdx = newMessages.length - 1;
              if (lastIdx >= 0 && newMessages[lastIdx].role === 'assistant') {
                newMessages[lastIdx] = { ...newMessages[lastIdx], content: accumulatedContent };
              }
              return newMessages;
            });
          }
        }
      }
    } catch (error) {
      console.error("Chat error:", error);
      setMessages(prev => {
        const newMessages = [...prev];
        const lastIdx = newMessages.length - 1;
        if (lastIdx >= 0 && newMessages[lastIdx].role === 'assistant') {
          newMessages[lastIdx] = { 
            ...newMessages[lastIdx], 
            content: "Error: Could not maintain stream connection. Please ensure the local LLM server is running." 
          };
        }
        return newMessages;
      });
    } finally {
      setIsTyping(false);
    }
  };

  return (
    <div 
      className="fixed bottom-24 right-8 w-96 h-[500px] bg-[#0b0c10] border border-white/10 rounded-2xl shadow-2xl flex flex-col z-[90] animate-fade-in overflow-hidden"
      style={{ boxShadow: '0 20px 50px rgba(0,0,0,0.5), 0 0 15px rgba(6, 182, 212, 0.1)' }}
    >
      {/* Header */}
      <div className="bg-white/5 p-4 border-b border-white/10 flex justify-between items-center">
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 rounded-full bg-cyan-500/20 flex items-center justify-center text-cyan-400">
            <i className="ri-robot-2-line"></i>
          </div>
          <div>
            <h3 className="text-sm font-argent text-white">QuantCure Copilot</h3>
            <div className="flex items-center gap-1.5">
                <span className="w-1.5 h-1.5 rounded-full bg-green-500"></span>
                <span className="text-[10px] text-white/40 uppercase tracking-widest font-bold">Neural Engine Online</span>
            </div>
          </div>
        </div>
        <button 
          onClick={() => dispatch({ type: 'TOGGLE_CHAT' })}
          className="text-white/30 hover:text-white transition"
        >
          <i className="ri-close-line text-xl"></i>
        </button>
      </div>

      {/* Messages */}
      <div className="flex-grow overflow-y-auto p-4 space-y-4 custom-scrollbar bg-black/40">
        {messages.length === 0 && (
          <div className="h-full flex flex-col items-center justify-center text-center opacity-50 space-y-3 p-6">
            <i className="ri-chat-voice-line text-4xl"></i>
            <p className="font-greycliff text-sm">Hello {currentUser?.name}. I am your integrated research assistant. How can I assist with your docking projects today?</p>
          </div>
        )}
        {messages.map((m, idx) => (
          <div key={idx} className={`flex ${m.role === 'user' ? 'justify-end' : 'justify-start'}`}>
            <div className={`max-w-[85%] p-3 rounded-xl text-sm font-greycliff whitespace-pre-wrap ${
              m.role === 'user' 
                ? 'bg-cyan-600 text-white rounded-tr-none' 
                : 'bg-white/5 border border-white/10 text-white/90 rounded-tl-none'
            }`}>
              {m.content}
              {!m.content && m.role === 'assistant' && (
                <span className="inline-block w-1.5 h-4 bg-cyan-400 animate-pulse ml-1"></span>
              )}
            </div>
          </div>
        ))}
        <div ref={messagesEndRef} />
      </div>

      {/* Input */}
      <form onSubmit={handleSendMessage} className="p-4 bg-white/5 border-t border-white/10 flex gap-2">
        <input 
          type="text" 
          value={inputValue}
          onChange={(e) => setInputValue(e.target.value)}
          placeholder="Ask QuantCure..."
          className="flex-grow bg-black/50 border border-white/10 rounded-lg px-4 py-2 text-sm text-white focus:outline-none focus:border-cyan-500/50 transition-all font-greycliff"
        />
        <button 
          type="submit"
          disabled={!inputValue.trim() || isTyping}
          className="w-10 h-10 rounded-lg bg-cyan-600 text-white flex items-center justify-center hover:bg-cyan-500 transition disabled:opacity-50"
        >
          <i className="ri-send-plane-2-fill"></i>
        </button>
      </form>
    </div>
  );
};
