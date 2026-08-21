require('dotenv').config();
const http = require('http');
const express = require('express');
const cors = require('cors');
const mongoose = require('mongoose');
const { Server } = require('socket.io');
const WebSocket = require('ws');
const { setupWSConnection } = require('y-websocket/bin/utils');
const { executeCode } = require('./execute');

const authRoutes = require('./routes/authRoutes');
const roomRoutes = require('./routes/roomRoutes');
const paymentRoutes = require('./routes/paymentRoutes');

const User = require('./models/User');

const PORT = process.env.PORT || 5000;
const MONGODB_URI = process.env.MONGODB_URI || process.env.MONGODB_LOCAL_URI || 'mongodb://localhost:27017/SynapseCode';

const app = express();

// Enable CORS matching environment config
const allowedOrigins = [
  process.env.WEB_CLIENT_URL || 'http://localhost:8080',
  'http://localhost:5173',
  'http://localhost:3000',
  '*',
];

app.use(
  cors({
    origin: '*',
    credentials: true,
  })
);

app.use(express.json());

// Connect to MongoDB
mongoose
  .connect(MONGODB_URI)
  .then(() => console.log('✅ Connected to MongoDB Database successfully.'))
  .catch((err) => console.warn('⚠️ MongoDB connection warning:', err.message));

// Register REST APIs
app.use('/api/auth', authRoutes);
app.use('/api/rooms', roomRoutes);
app.use('/api/payments', paymentRoutes);

app.get('/health', (req, res) => {
  res.status(200).json({ status: 'ok', service: 'synapse-code-server', env: process.env.NODE_ENV });
});

const httpServer = http.createServer(app);

// ---------------------------------------------------------------------------
// Socket.io: Room presence, chat signaling, and code execution routing
// ---------------------------------------------------------------------------
const io = new Server(httpServer, {
  cors: {
    origin: '*',
    methods: ['GET', 'POST'],
  },
});

const roomUserCounts = new Map();
const roomUsersMap = new Map();

io.on('connection', (socket) => {
  let currentRoomId = null;
  let currentUsername = null;

  socket.on('join-room', async ({ roomId, user, userId, isPro }) => {
    if (!roomId || typeof roomId !== 'string') {
      socket.emit('error-message', { message: 'A valid roomId is required to join.' });
      return;
    }

    currentRoomId = roomId;
    currentUsername = user || 'Anonymous';
    socket.join(roomId);

    // Track active users in room
    if (!roomUsersMap.has(roomId)) {
      roomUsersMap.set(roomId, new Map());
    }
    const roomUsers = roomUsersMap.get(roomId);
    roomUsers.set(socket.id, { username: currentUsername, isPro: !!isPro });

    const currentCount = roomUsers.size;
    roomUserCounts.set(roomId, currentCount);

    // Free Tier Room Collaborator Cap Check (Max 2 collaborators if not Pro)
    if (!isPro && currentCount > 2) {
      socket.emit('tier-warning', {
        message: '⚠️ Free Tier rooms are limited to 2 active collaborators. Upgrade to Pro for unlimited collaborators!',
      });
    }

    socket.to(roomId).emit('user-joined', {
      user: currentUsername,
      timestamp: Date.now(),
      userCount: currentCount,
    });

    socket.emit('room-joined', {
      roomId,
      userCount: currentCount,
      activeUsers: Array.from(roomUsers.values()).map((u) => u.username),
    });
  });

  socket.on('send-message', ({ roomId, user, message, timestamp }) => {
    if (!roomId || !message || typeof message !== 'string') {
      return;
    }

    const payload = {
      user: user || currentUsername || 'Anonymous',
      message,
      timestamp: timestamp || Date.now(),
    };

    io.to(roomId).emit('receive-message', payload);
  });

  socket.on('run-code', async ({ roomId, code, language, isPro }) => {
    if (!roomId || !code || !language) {
      socket.emit('code-output', {
        stdout: '',
        stderr: 'Missing roomId, code, or language in execution request.',
        exitCode: 1,
        timedOut: false,
      });
      return;
    }

    // Determine user Pro status from request or database
    let userIsPro = !!isPro;
    if (socket.userId) {
      try {
        const u = await User.findById(socket.userId);
        if (u) userIsPro = u.isPro;
      } catch (e) {
        // Fallback to client flag
      }
    }

    io.to(roomId).emit('code-running', { language });

    try {
      const result = await executeCode(language, code, userIsPro);
      io.to(roomId).emit('code-output', result);
    } catch (err) {
      io.to(roomId).emit('code-output', {
        stdout: '',
        stderr: `Unexpected execution error: ${err.message}`,
        exitCode: 1,
        timedOut: false,
      });
    }
  });

  socket.on('cursor-update', ({ roomId, user, position }) => {
    if (!roomId) return;
    socket.to(roomId).emit('cursor-update', { user: user || currentUsername, position });
  });

  socket.on('disconnect', () => {
    if (currentRoomId && roomUsersMap.has(currentRoomId)) {
      const roomUsers = roomUsersMap.get(currentRoomId);
      roomUsers.delete(socket.id);
      const nextCount = roomUsers.size;
      roomUserCounts.set(currentRoomId, nextCount);

      if (nextCount === 0) {
        roomUsersMap.delete(currentRoomId);
      }

      socket.to(currentRoomId).emit('user-left', {
        user: currentUsername,
        timestamp: Date.now(),
        userCount: nextCount,
      });
    }
  });
});

// ---------------------------------------------------------------------------
// Raw WebSocket server for Yjs document synchronization (y-websocket protocol)
// Mounted at /yjs, separate from the Socket.io namespace above.
// ---------------------------------------------------------------------------
const yjsWss = new WebSocket.Server({ noServer: true });

yjsWss.on('connection', (conn, req) => {
  setupWSConnection(conn, req);
});

httpServer.on('upgrade', (request, socket, head) => {
  const { pathname } = new URL(request.url, `http://${request.headers.host}`);

  if (pathname.startsWith('/yjs')) {
    yjsWss.handleUpgrade(request, socket, head, (ws) => {
      yjsWss.emit('connection', ws, request);
    });
  } else if (pathname.startsWith('/socket.io')) {
    // Socket.io manages its upgrade handling internally
    return;
  } else {
    socket.destroy();
  }
});

httpServer.listen(PORT, () => {
  console.log(`🚀 SynapseCode Enterprise Server listening on port ${PORT}`);
  console.log(`📡 Socket.io ready for real-time signaling & code execution`);
  console.log(`🔄 Yjs document sync endpoint available at ws://localhost:${PORT}/yjs`);
});
