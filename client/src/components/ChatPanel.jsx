import React, { useEffect, useRef, useState } from 'react';
import { MessageSquare, Send } from 'lucide-react';

function formatTimestamp(timestamp) {
  const date = new Date(timestamp);
  const hours = date.getHours().toString().padStart(2, '0');
  const minutes = date.getMinutes().toString().padStart(2, '0');
  return `${hours}:${minutes}`;
}

export default function ChatPanel({ messages, username, onSendMessage }) {
  const [draft, setDraft] = useState('');
  const scrollRef = useRef(null);

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [messages]);

  const handleSubmit = (event) => {
    event.preventDefault();
    const trimmed = draft.trim();
    if (!trimmed) return;
    onSendMessage(trimmed);
    setDraft('');
  };

  return (
    <div className="flex flex-col h-full bg-surface-900 rounded-lg border border-surface-700 overflow-hidden">
      <div className="flex items-center gap-2 px-4 py-2.5 bg-surface-800 border-b border-surface-700">
        <MessageSquare size={15} className="text-cyan-400" />
        <span className="text-sm font-semibold text-gray-200">Team Chat</span>
      </div>

      <div ref={scrollRef} className="flex-1 overflow-y-auto px-3 py-3 space-y-3">
        {messages.length === 0 && (
          <div className="text-xs text-gray-500 text-center py-6">
            No messages yet. Say hello to your collaborators.
          </div>
        )}
        {messages.map((msg, idx) => {
          const isOwn = msg.user === username;
          return (
            <div key={idx} className={`flex flex-col ${isOwn ? 'items-end' : 'items-start'}`}>
              <div className="flex items-baseline gap-2 mb-0.5 px-1">
                <span className={`text-xs font-semibold ${isOwn ? 'text-cyan-400' : 'text-gray-300'}`}>
                  {isOwn ? 'You' : msg.user}
                </span>
                <span className="text-[10px] text-gray-500">{formatTimestamp(msg.timestamp)}</span>
              </div>
              <div
                className={`max-w-[85%] rounded-lg px-3 py-1.5 text-sm break-words ${
                  isOwn
                    ? 'bg-cyan-600/90 text-white rounded-br-sm'
                    : 'bg-surface-700 text-gray-200 rounded-bl-sm'
                }`}
              >
                {msg.message}
              </div>
            </div>
          );
        })}
      </div>

      <form onSubmit={handleSubmit} className="flex items-center gap-2 px-3 py-2.5 border-t border-surface-700">
        <input
          type="text"
          value={draft}
          onChange={(e) => setDraft(e.target.value)}
          placeholder="Type a message..."
          className="flex-1 bg-surface-800 text-gray-200 placeholder-gray-500 text-sm rounded-md px-3 py-2 outline-none focus:ring-1 focus:ring-cyan-500"
        />
        <button
          type="submit"
          disabled={!draft.trim()}
          className="p-2 rounded-md bg-cyan-600 text-white disabled:bg-surface-700 disabled:text-gray-500 hover:bg-cyan-500 transition-colors"
        >
          <Send size={15} />
        </button>
      </form>
    </div>
  );
}
