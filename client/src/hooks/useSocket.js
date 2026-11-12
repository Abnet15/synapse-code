import { useEffect, useRef, useState, useCallback } from 'react';
import { io } from 'socket.io-client';

const getSocketServerUrl = () => {
  if (import.meta.env.VITE_SERVER_URL) {
    return import.meta.env.VITE_SERVER_URL;
  }
  const protocol = window.location.protocol === 'https:' ? 'https:' : 'http:';
  const hostname = window.location.hostname || 'localhost';
  return `${protocol}//${hostname}:5000`;
};

export function useSocket(roomId, username, user) {
  const socketRef = useRef(null);
  const [isConnected, setIsConnected] = useState(false);
  const [messages, setMessages] = useState([]);
  const [output, setOutput] = useState({ stdout: '', stderr: '', exitCode: null, timedOut: false });
  const [isRunning, setIsRunning] = useState(false);
  const [userCount, setUserCount] = useState(1);
  const [tierWarning, setTierWarning] = useState(null);
  const [videoSyncEvent, setVideoSyncEvent] = useState(null);

  const isPro = user?.isPro || false;

  useEffect(() => {
    if (!roomId) return undefined;

    const socketUrl = getSocketServerUrl();
    const token = localStorage.getItem('synapse_token');
    const socket = io(socketUrl, {
      auth: token ? { token } : {},
      transports: ['websocket', 'polling'],
      reconnection: true,
      reconnectionAttempts: Infinity,
      reconnectionDelay: 1000,
    });

    socketRef.current = socket;

    socket.on('connect', () => {
      setIsConnected(true);
      socket.emit('join-room', { roomId, user: username, userId: user?.id, isPro });
    });

    socket.on('disconnect', () => {
      setIsConnected(false);
    });

    socket.on('room-joined', ({ userCount: count }) => {
      setUserCount(count);
    });

    socket.on('user-joined', ({ userCount: count }) => {
      if (typeof count === 'number') {
        setUserCount(count);
      } else {
        setUserCount((prev) => prev + 1);
      }
    });

    socket.on('user-left', ({ userCount: count }) => {
      if (typeof count === 'number') {
        setUserCount(count);
      } else {
        setUserCount((prev) => Math.max(prev - 1, 1));
      }
    });

    socket.on('receive-message', (payload) => {
      setMessages((prev) => [...prev, payload]);
    });

    socket.on('video-sync', (payload) => {
      setVideoSyncEvent({ ...payload, receivedAt: Date.now() });
    });

    socket.on('code-running', () => {
      setIsRunning(true);
      setOutput({ stdout: '', stderr: '', exitCode: null, timedOut: false });
    });

    socket.on('code-output', (result) => {
      setIsRunning(false);
      setOutput(result);
    });

    socket.on('tier-warning', ({ message }) => {
      setTierWarning(message);
    });

    socket.on('error-message', ({ message }) => {
      console.error('Socket error:', message);
    });

    return () => {
      socket.disconnect();
      socketRef.current = null;
    };
  }, [roomId, username, isPro, user?.id]);

  const sendMessage = useCallback(
    (message) => {
      if (!socketRef.current || !message.trim()) return;
      const payload = {
        roomId,
        user: username,
        message,
        timestamp: Date.now(),
      };
      socketRef.current.emit('send-message', payload);
    },
    [roomId, username]
  );

  const emitVideoSync = useCallback(
    (action, currentTime, lessonId) => {
      if (!socketRef.current || !roomId) return;
      socketRef.current.emit('video-sync', {
        roomId,
        action,
        currentTime,
        lessonId,
      });
    },
    [roomId]
  );

  const runCode = useCallback(
    (code, language) => {
      if (!socketRef.current) return;
      socketRef.current.emit('run-code', { roomId, code, language, isPro });
    },
    [roomId, isPro]
  );

  return {
    isConnected,
    messages,
    output,
    isRunning,
    userCount,
    tierWarning,
    videoSyncEvent,
    sendMessage,
    emitVideoSync,
    runCode,
  };
}
