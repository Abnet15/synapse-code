import React, { useEffect, useRef, useState, useCallback } from 'react';
import Editor from '@monaco-editor/react';
import * as Y from 'yjs';
import { WebsocketProvider } from 'y-websocket';
import { MonacoBinding } from 'y-monaco';
import { Users, Wifi, WifiOff, FileCode } from 'lucide-react';

const LANGUAGE_FILE_EXTENSIONS = {
  javascript: 'js',
  python: 'py',
  cpp: 'cpp',
};

const CURSOR_COLORS = [
  '#ef4444',
  '#f97316',
  '#eab308',
  '#22c55e',
  '#06b6d4',
  '#3b82f6',
  '#8b5cf6',
  '#ec4899',
];

function pickColorForUser(username) {
  let hash = 0;
  for (let i = 0; i < (username || '').length; i += 1) {
    hash = username.charCodeAt(i) + ((hash << 5) - hash);
  }
  const index = Math.abs(hash) % CURSOR_COLORS.length;
  return CURSOR_COLORS[index];
}

export default function EditorWorkspace({ roomId, username, language, code, onCodeChange }) {
  const editorRef = useRef(null);
  const monacoRef = useRef(null);
  const ydocRef = useRef(null);
  const providerRef = useRef(null);
  const bindingRef = useRef(null);
  const [isSynced, setIsSynced] = useState(false);
  const [activeUsers, setActiveUsers] = useState([]);

  const getYjsUrl = () => {
    if (import.meta.env.VITE_YJS_SERVER_URL) {
      return import.meta.env.VITE_YJS_SERVER_URL;
    }
    const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
    const hostname = window.location.hostname || 'localhost';
    return `${protocol}//${hostname}:5000/yjs`;
  };

  const handleEditorDidMount = useCallback(
    (editor, monacoInstance) => {
      editorRef.current = editor;
      monacoRef.current = monacoInstance;

      const ydoc = new Y.Doc();
      ydocRef.current = ydoc;

      const yjsServerUrl = getYjsUrl();
      const provider = new WebsocketProvider(yjsServerUrl, roomId || 'default-room', ydoc);
      providerRef.current = provider;

      const userColor = pickColorForUser(username || 'Anonymous');
      provider.awareness.setLocalStateField('user', {
        name: username || 'Anonymous',
        color: userColor,
      });

      provider.on('sync', (synced) => {
        setIsSynced(synced);
      });

      provider.awareness.on('change', () => {
        const states = Array.from(provider.awareness.getStates().values());
        const users = states
          .map((state) => state.user)
          .filter((user) => Boolean(user));
        setActiveUsers(users);
      });

      const yText = ydoc.getText(`monaco-${language || 'javascript'}`);

      const binding = new MonacoBinding(
        yText,
        editor.getModel(),
        new Set([editor]),
        provider.awareness
      );
      bindingRef.current = binding;

      return () => {
        binding.destroy();
        provider.destroy();
        ydoc.destroy();
      };
    },
    [roomId, username, language]
  );

  useEffect(() => {
    return () => {
      if (bindingRef.current) bindingRef.current.destroy();
      if (providerRef.current) providerRef.current.destroy();
      if (ydocRef.current) ydocRef.current.destroy();
    };
  }, [roomId, language]);

  const handleChange = useCallback(
    (value) => {
      onCodeChange(value ?? '');
    },
    [onCodeChange]
  );

  const fileExtension = LANGUAGE_FILE_EXTENSIONS[language] || 'txt';

  return (
    <div className="flex flex-col h-full bg-surface-900 rounded-xl border border-surface-800 overflow-hidden shadow-xl">
      {/* Editor Header Bar */}
      <div className="flex items-center justify-between px-4 py-2.5 bg-surface-950/80 border-b border-surface-800">
        <div className="flex items-center gap-2 text-xs font-mono font-medium text-cyan-300">
          <FileCode size={15} className="text-cyan-400" />
          <span>main.{fileExtension}</span>
        </div>

        <div className="flex items-center gap-4">
          <div className="flex items-center gap-1.5 text-xs text-gray-400">
            {isSynced ? (
              <Wifi size={14} className="text-emerald-400" />
            ) : (
              <WifiOff size={14} className="text-amber-400 animate-pulse" />
            )}
            <span className="font-medium">{isSynced ? 'Live Synced' : 'Connecting Yjs...'}</span>
          </div>

          <div className="flex items-center gap-2">
            <Users size={14} className="text-gray-400" />
            <div className="flex -space-x-1.5">
              {activeUsers.slice(0, 5).map((u, idx) => (
                <div
                  key={`${u.name}-${idx}`}
                  title={u.name}
                  className="w-5 h-5 rounded-full border-2 border-surface-900 flex items-center justify-center text-[9px] font-bold text-surface-950 shadow"
                  style={{ backgroundColor: u.color }}
                >
                  {u.name?.charAt(0).toUpperCase()}
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>

      {/* Monaco Editor Container */}
      <div className="flex-1 min-h-0 bg-[#1e1e1e]">
        <Editor
          height="100%"
          language={language === 'cpp' ? 'cpp' : language}
          theme="vs-dark"
          value={code}
          onMount={handleEditorDidMount}
          onChange={handleChange}
          options={{
            fontSize: 14,
            fontFamily: "'Fira Code', 'Cascadia Code', Consolas, monospace",
            minimap: { enabled: true },
            automaticLayout: true,
            scrollBeyondLastLine: false,
            tabSize: 2,
            wordWrap: 'on',
            padding: { top: 12, bottom: 12 },
            cursorBlinking: 'smooth',
            cursorSmoothCaretAnimation: 'on',
          }}
        />
      </div>
    </div>
  );
}
