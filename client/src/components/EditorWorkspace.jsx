import React, { useEffect, useRef, useState, useCallback } from 'react';
import Editor from '@monaco-editor/react';
import * as Y from 'yjs';
import { WebsocketProvider } from 'y-websocket';
import { MonacoBinding } from 'y-monaco';
import { Users, Wifi, WifiOff, FileCode, Video, PlayCircle, Clock, Lock, Code2, ChevronRight } from 'lucide-react';
import InterviewGrid from './InterviewGrid.jsx';

const LANGUAGE_FILE_EXTENSIONS = {
  javascript: 'js',
  python: 'py',
  typescript: 'ts',
  cpp: 'cpp',
  java: 'java',
  go: 'go',
  rust: 'rs',
};

const MONACO_LANGUAGE_MAP = {
  javascript: 'javascript',
  python: 'python',
  typescript: 'typescript',
  cpp: 'cpp',
  java: 'java',
  go: 'go',
  rust: 'rust',
};

const LANGUAGE_OPTIONS = [
  { id: 'javascript', label: 'JavaScript (Node 18)', requiresPro: false },
  { id: 'python', label: 'Python (3.9)', requiresPro: false },
  { id: 'typescript', label: 'TypeScript (ts-node)', requiresPro: true },
  { id: 'cpp', label: 'C++ (GCC)', requiresPro: true },
  { id: 'java', label: 'Java (OpenJDK 17)', requiresPro: true },
  { id: 'go', label: 'Go (1.20)', requiresPro: true },
  { id: 'rust', label: 'Rust (1.70)', requiresPro: true },
];

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

function formatSeconds(sec) {
  const mins = Math.floor(sec / 60);
  const secs = Math.floor(sec % 60);
  return `${mins}:${secs.toString().padStart(2, '0')}`;
}

export default function EditorWorkspace({
  roomId,
  username,
  language,
  onLanguageChange,
  code,
  onCodeChange,
  isPro,
  onOpenPricing,
  showCodeCast,
  isInterviewMode,
  socket,
  lessons,
  activeLesson,
  onSelectLesson,
  onLoadLessonCode,
  videoSyncEvent,
  onVideoSync,
}) {
  const editorRef = useRef(null);
  const monacoRef = useRef(null);
  const ydocRef = useRef(null);
  const providerRef = useRef(null);
  const bindingRef = useRef(null);
  const videoRef = useRef(null);
  const isRemoteSyncRef = useRef(false);

  const [isSynced, setIsSynced] = useState(false);
  const [activeUsers, setActiveUsers] = useState([]);
  const [currentTime, setCurrentTime] = useState(0);

  const getYjsUrl = () => {
    if (import.meta.env.VITE_YJS_SERVER_URL) {
      return import.meta.env.VITE_YJS_SERVER_URL.replace(/\/$/, '');
    }
    if (typeof window !== 'undefined' && (window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1')) {
      return `ws://${window.location.hostname}:5000/yjs`;
    }
    return 'wss://synapse-code-server.onrender.com/yjs';
  };

  // Apply incoming remote video-sync events
  useEffect(() => {
    if (!videoSyncEvent || !videoRef.current) return;
    const videoEl = videoRef.current;
    isRemoteSyncRef.current = true;

    if (Math.abs(videoEl.currentTime - videoSyncEvent.currentTime) > 1.0) {
      videoEl.currentTime = videoSyncEvent.currentTime;
    }

    if (videoSyncEvent.action === 'play') {
      videoEl.play().catch(() => {});
    } else if (videoSyncEvent.action === 'pause') {
      videoEl.pause();
    } else if (videoSyncEvent.action === 'seek') {
      videoEl.currentTime = videoSyncEvent.currentTime;
    }

    const timer = setTimeout(() => {
      isRemoteSyncRef.current = false;
    }, 250);

    return () => clearTimeout(timer);
  }, [videoSyncEvent]);

  const handleVideoPlay = () => {
    if (isRemoteSyncRef.current || !videoRef.current) return;
    onVideoSync?.('play', videoRef.current.currentTime, activeLesson?._id);
  };

  const handleVideoPause = () => {
    if (isRemoteSyncRef.current || !videoRef.current) return;
    onVideoSync?.('pause', videoRef.current.currentTime, activeLesson?._id);
  };

  const handleJumpToMilestone = (milestone) => {
    const timestamp = typeof milestone === 'number' ? milestone : milestone.timestamp;
    if (videoRef.current) {
      videoRef.current.currentTime = timestamp;
      setCurrentTime(timestamp);
      videoRef.current.play().catch(() => {});
    }
    if (milestone?.targetCode) {
      onCodeChange?.(milestone.targetCode);
      if (editorRef.current) {
        editorRef.current.setValue(milestone.targetCode);
      }
    }
    onVideoSync?.('seek', timestamp, activeLesson?._id);
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

  const handleLanguageSelect = (e) => {
    const nextLang = e.target.value;
    const option = LANGUAGE_OPTIONS.find((l) => l.id === nextLang);
    if (option?.requiresPro && !isPro) {
      onOpenPricing?.();
      return;
    }
    onLanguageChange?.(nextLang);
  };

  const fileExtension = LANGUAGE_FILE_EXTENSIONS[language] || 'txt';
  const fileName = language === 'java' ? 'Main.java' : `main.${fileExtension}`;
  const isLessonLocked = Boolean(activeLesson?.requiresPro && !isPro);

  return (
    <div className="flex flex-col lg:flex-row h-full gap-3 min-h-0">
      {/* Left Split-Pane: CoderPad WebRTC Interview Grid OR CodeCast Video Learning Workspace */}
      {isInterviewMode ? (
        <div className="lg:w-[42%] flex flex-col min-h-0">
          <InterviewGrid roomId={roomId} username={username} socket={socket} />
        </div>
      ) : showCodeCast && (
        <div className="lg:w-[42%] flex flex-col bg-surface-900 rounded-xl border border-surface-800 overflow-hidden shadow-xl min-h-0">
          {/* CodeCast Header & Lesson Selector */}
          <div className="flex items-center justify-between px-4 py-2.5 bg-surface-950/80 border-b border-surface-800 gap-2">
            <div className="flex items-center gap-2 text-xs font-bold text-cyan-300">
              <Video size={15} className="text-cyan-400" />
              <span>CodeCast Hub</span>
            </div>

            {lessons && lessons.length > 0 && (
              <select
                value={activeLesson?._id || ''}
                onChange={(e) => {
                  const found = lessons.find((l) => l._id === e.target.value);
                  if (found) onSelectLesson?.(found);
                }}
                className="bg-surface-800 text-gray-200 text-xs rounded-md px-2.5 py-1 border border-surface-700 outline-none focus:border-cyan-500 max-w-[200px] truncate"
              >
                {lessons.map((lesson) => (
                  <option key={lesson._id} value={lesson._id}>
                    {lesson.requiresPro ? '🔒 ' : ''}
                    {lesson.title}
                  </option>
                ))}
              </select>
            )}
          </div>

          {/* Embedded Video Player */}
          <div className="relative bg-black aspect-video w-full flex-shrink-0 border-b border-surface-800">
            {isLessonLocked ? (
              <div className="absolute inset-0 flex flex-col items-center justify-center bg-surface-950/95 p-6 text-center">
                <Lock size={28} className="text-amber-400 mb-2" />
                <h4 className="text-sm font-bold text-white mb-1">Pro CodeCast Masterclass</h4>
                <p className="text-xs text-gray-400 mb-4 max-w-xs">
                  Upgrade to SynapseCode Pro via Chapa to unlock advanced systems video lessons and Rust/Go/C++ runtimes.
                </p>
                <button
                  onClick={onOpenPricing}
                  className="px-4 py-2 rounded-lg bg-gradient-to-r from-cyan-500 to-blue-600 text-white text-xs font-bold shadow-lg cursor-pointer"
                >
                  Upgrade with Chapa ($15/mo)
                </button>
              </div>
            ) : activeLesson?.videoUrl ? (
              <video
                ref={videoRef}
                src={activeLesson.videoUrl}
                controls
                onPlay={handleVideoPlay}
                onPause={handleVideoPause}
                onTimeUpdate={(e) => setCurrentTime(e.target.currentTime)}
                className="w-full h-full object-contain"
              />
            ) : (
              <div className="flex items-center justify-center h-full text-xs text-gray-500">
                Select a CodeCast lesson to begin
              </div>
            )}
          </div>

          {/* Interactive Milestones & Code Sync */}
          <div className="flex-1 flex flex-col min-h-0 p-3 overflow-y-auto">
            <div className="flex items-center justify-between mb-2.5">
              <div className="flex items-center gap-1.5 text-[11px] uppercase tracking-wider font-semibold text-gray-400">
                <Clock size={12} className="text-cyan-400" />
                <span>Interactive Milestones</span>
              </div>

              {activeLesson && !isLessonLocked && (
                <button
                  onClick={() => onLoadLessonCode?.(activeLesson)}
                  className="flex items-center gap-1 text-[11px] font-bold text-cyan-400 hover:text-cyan-300 bg-cyan-950/60 border border-cyan-800/70 px-2.5 py-1 rounded-md transition-colors cursor-pointer"
                >
                  <Code2 size={12} />
                  <span>Load Lesson Code</span>
                </button>
              )}
            </div>

            <div className="space-y-1.5">
              {(activeLesson?.milestones || []).map((milestone, idx) => {
                const isActive =
                  currentTime >= milestone.timestamp &&
                  (idx === activeLesson.milestones.length - 1 ||
                    currentTime < activeLesson.milestones[idx + 1].timestamp);

                return (
                  <button
                    key={`${milestone.timestamp}-${idx}`}
                    disabled={isLessonLocked}
                    onClick={() => handleJumpToMilestone(milestone)}
                    className={`w-full flex items-center justify-between px-3 py-2 rounded-lg text-left text-xs transition-all border ${
                      isActive
                        ? 'bg-cyan-950/50 border-cyan-500/60 text-cyan-200'
                        : 'bg-surface-950/50 border-surface-800 text-gray-300 hover:bg-surface-800/70'
                    } disabled:opacity-50`}
                  >
                    <div className="flex items-center gap-2 min-w-0">
                      <PlayCircle
                        size={14}
                        className={isActive ? 'text-cyan-400 flex-shrink-0' : 'text-gray-500 flex-shrink-0'}
                      />
                      <span className="truncate font-medium">{milestone.description}</span>
                    </div>
                    <div className="flex items-center gap-1 font-mono text-[11px] text-cyan-400 flex-shrink-0 ml-2">
                      <span>{formatSeconds(milestone.timestamp)}</span>
                      <ChevronRight size={12} />
                    </div>
                  </button>
                );
              })}

              {(!activeLesson?.milestones || activeLesson.milestones.length === 0) && (
                <div className="text-xs text-gray-500 py-4 text-center">
                  No milestones defined for this lesson.
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Right Split-Pane: Monaco Editor with Yjs CRDT Bindings */}
      <div className="flex-1 flex flex-col h-full bg-surface-900 rounded-xl border border-surface-800 overflow-hidden shadow-xl min-w-0">
        {/* Editor Header Bar */}
        <div className="flex items-center justify-between px-4 py-2 bg-surface-950/80 border-b border-surface-800 gap-2">
          <div className="flex items-center gap-3">
            <div className="flex items-center gap-2 text-xs font-mono font-medium text-cyan-300">
              <FileCode size={15} className="text-cyan-400" />
              <span>{fileName}</span>
            </div>

            <select
              value={language}
              onChange={handleLanguageSelect}
              className="bg-surface-800 text-gray-200 text-xs rounded-md px-2.5 py-1 border border-surface-700 outline-none focus:border-cyan-500 font-medium"
            >
              {LANGUAGE_OPTIONS.map((opt) => (
                <option key={opt.id} value={opt.id}>
                  {opt.requiresPro && !isPro ? `🔒 ${opt.label} (Pro)` : opt.label}
                </option>
              ))}
            </select>
          </div>

          <div className="flex items-center gap-4">
            <div className="flex items-center gap-1.5 text-xs text-gray-400">
              {isSynced ? (
                <Wifi size={14} className="text-emerald-400" />
              ) : (
                <WifiOff size={14} className="text-amber-400 animate-pulse" />
              )}
              <span className="font-medium hidden sm:inline">
                {isSynced ? 'Live Synced' : 'Connecting Yjs...'}
              </span>
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
            language={MONACO_LANGUAGE_MAP[language] || 'javascript'}
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
    </div>
  );
}
