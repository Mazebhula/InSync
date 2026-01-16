import React, { useState, useEffect, useRef } from 'react';
import { Send } from 'lucide-react';

export function Chat({ socket, user }) {
  const [messages, setMessages] = useState([]);
  const [input, setInput] = useState('');
  const scrollRef = useRef(null);
  
  // Use logged in user name, or fallback to "Anonymous"
  const currentUserName = user ? user.displayName : 'Anonymous';

  useEffect(() => {
    // Fetch initial messages
    fetch('http://localhost:3001/api/messages')
      .then(res => res.json())
      .then(data => setMessages(data));

    // Listen for new messages
    const handleNewMessage = (msg) => {
        setMessages((prev) => [...prev, msg]);
    };

    socket.on('message:received', handleNewMessage);

    return () => {
        socket.off('message:received', handleNewMessage);
    };
  }, [socket]);

  useEffect(() => {
    // Auto-scroll to bottom
    if (scrollRef.current) {
        scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [messages]);

  const sendMessage = (e) => {
    e.preventDefault();
    if (!input.trim()) return;

    // Send user object with the message
    socket.emit('message:send', { text: input, sender: currentUserName, user });
    setInput('');
  };

  return (
    <>
      <div className="h-14 border-b border-border flex items-center px-4 font-semibold text-sm">
        Team Chat
      </div>
      
      <div className="flex-1 overflow-y-auto p-4 space-y-4" ref={scrollRef}>
        {messages.map((msg) => {
          const isMe = msg.sender === currentUserName || (user && msg.senderId === user.id);
          
          return (
          <div key={msg.id} className={`flex flex-col ${isMe ? 'items-end' : 'items-start'}`}>
             <div className="flex items-center gap-1.5 mb-1">
                {!isMe && msg.senderPhoto && <img src={msg.senderPhoto} className="h-4 w-4 rounded-full" />}
                <span className="text-[10px] text-muted-foreground font-medium">{msg.sender}</span>
                <span className="text-[10px] text-muted-foreground/60">{new Date(msg.timestamp).toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'})}</span>
             </div>
             <div className={`px-3 py-2 rounded-lg text-sm max-w-[85%] break-words ${
                 isMe
                 ? 'bg-indigo-600 text-white rounded-br-none' 
                 : 'bg-muted text-foreground rounded-bl-none'
             }`}>
                {msg.text}
             </div>
          </div>
          );
        })}
      </div>

      <div className="p-4 border-t border-border bg-card">
        <form onSubmit={sendMessage} className="relative">
          <input
            type="text"
            value={input}
            onChange={(e) => setInput(e.target.value)}
            placeholder={`Message as ${currentUserName}...`}
            className="w-full bg-muted/50 border border-input rounded-md pl-3 pr-10 py-2 text-sm focus:outline-none focus:ring-1 focus:ring-ring"
          />
          <button 
            type="submit"
            className="absolute right-2 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground transition-colors p-1"
          >
            <Send size={16} />
          </button>
        </form>
      </div>
    </>
  );
}