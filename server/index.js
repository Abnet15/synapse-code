require('dotenv').config();
const http = require('http');
const express = require('express');
const cors = require('cors');
const mongoose = require('mongoose');
const jwt = require('jsonwebtoken');
const { Server } = require('socket.io');
const WebSocket = require('ws');
const { setupWSConnection } = require('y-websocket/bin/utils');
const { executeCode, runTestCases } = require('./execute');

const authRoutes = require('./routes/authRoutes');
const roomRoutes = require('./routes/roomRoutes');
const lessonRoutes = require('./routes/lessonRoutes');
const paymentRoutes = require('./routes/paymentRoutes');
const aiRoutes = require('./routes/aiRoutes');

const User = require('./models/User');
const Room = require('./models/Room');

const PORT = process.env.PORT || 5000;
const JWT_SECRET = process.env.JWT_SECRET || 'your-super-secret-jwt-key-change-this-enterprise-grade-hash';
const MONGODB_URI = process.env.MONGODB_URI || process.env.MONGODB_LOCAL_URI || 'mongodb://localhost:27017/SynapseCode';

const app = express();

const allowedOrigins = [
  process.env.WEB_CLIENT_URL || 'http://localhost:8080',
  'http://localhost:5173',
  'http://localhost:8080',
  'http://localhost:3000',
];

const corsOptions = {
  origin: (origin, callback) => {
    if (!origin || allowedOrigins.includes(origin) || process.env.NODE_ENV !== 'production') {
      callback(null, true);
    } else {
      callback(new Error('Not allowed by CORS policy'));
    }
  },
  methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
  credentials: true,
};

app.use(cors(corsOptions));
app.use(express.json());

// Connect to MongoDB
mongoose
  .connect(MONGODB_URI)
  .then(() => console.log('✅ Connected to MongoDB Database successfully.'))
  .catch((err) => console.warn('⚠️ MongoDB connection warning:', err.message));

// Register Modular REST APIs
app.use('/api/auth', authRoutes);
app.use('/api/rooms', roomRoutes);
app.use('/api/lessons', lessonRoutes);
app.use('/api/payments', paymentRoutes);
app.use('/api/ai', aiRoutes);

app.get('/health', (req, res) => {
  res.status(200).json({ status: 'ok', service: 'synapse-code-ultimate-server', env: process.env.NODE_ENV });
});

const httpServer = http.createServer(app);

// ---------------------------------------------------------------------------
// Socket.io: Room presence, chat, WebRTC signaling, video-sync & execution
// ---------------------------------------------------------------------------
const io = new Server(httpServer, {
  cors: corsOptions,
});

io.use(async (socket, next) => {
  try {
    const token = socket.handshake.auth?.token;
    if (token) {
      const decoded = jwt.verify(token, JWT_SECRET);
      const user = await User.findById(decoded.id).select('-password');
      if (user) {
        socket.userId = user._id.toString();
        socket.userIsPro = Boolean(user.isPro);
      }
    }
    return next();
  } catch (err) {
    return next();
  }
});

const roomUserCounts = new Map();
const roomUsersMap = new Map();

io.on('connection', (socket) => {
  let currentRoomId = null;
  let currentUsername = null;

  socket.on('join-room', async ({ roomId, user, isPro }) => {
    if (!roomId || typeof roomId !== 'string') {
      socket.emit('error-message', { message: 'A valid roomId is required to join.' });
      return;
    }

    const normalizedRoomId = roomId.trim().toUpperCase();

    try {
      const roomDoc = await Room.findOne({ roomId: normalizedRoomId }).populate('owner', 'isPro');
      if (roomDoc && roomDoc.owner && !roomDoc.owner.isPro) {
        const currentInRoom = roomUsersMap.has(normalizedRoomId) ? roomUsersMap.get(normalizedRoomId).size : 0;
        if (currentInRoom >= 2) {
          socket.emit('tier-warning', {
            message: '⚠️ Free Tier rooms are limited to 2 active collaborators. Upgrade to Pro for unlimited collaborators!',
          });
        }
      }
    } catch (e) {
      // Non-fatal if DB lookup is unavailable
    }

    currentRoomId = normalizedRoomId;
    currentUsername = user || 'Anonymous';
    socket.join(normalizedRoomId);

    if (!roomUsersMap.has(normalizedRoomId)) {
      roomUsersMap.set(normalizedRoomId, new Map());
    }
    const roomUsers = roomUsersMap.get(normalizedRoomId);
    const effectivePro = socket.userIsPro !== undefined ? socket.userIsPro : Boolean(isPro);
    roomUsers.set(socket.id, { socketId: socket.id, username: currentUsername, isPro: effectivePro });

    const currentCount = roomUsers.size;
    roomUserCounts.set(normalizedRoomId, currentCount);

    if (!effectivePro && currentCount > 2) {
      socket.emit('tier-warning', {
        message: '⚠️ Free Tier rooms are limited to 2 active collaborators. Upgrade to Pro for unlimited collaborators!',
      });
    }

    socket.to(normalizedRoomId).emit('user-joined', {
      socketId: socket.id,
      user: currentUsername,
      timestamp: Date.now(),
      userCount: currentCount,
    });

    socket.emit('room-joined', {
      roomId: normalizedRoomId,
      selfSocketId: socket.id,
      userCount: currentCount,
      activeUsers: Array.from(roomUsers.values()).map((u) => u.username),
    });
  });

  socket.on('send-message', ({ roomId, user, message, timestamp }) => {
    if (!roomId || !message || typeof message !== 'string') {
      return;
    }

    const normalizedRoomId = roomId.trim().toUpperCase();
    const payload = {
      user: user || currentUsername || 'Anonymous',
      message,
      timestamp: timestamp || Date.now(),
    };

    io.to(normalizedRoomId).emit('receive-message', payload);
  });

  socket.on('video-sync', ({ roomId, action, currentTime, lessonId }) => {
    if (!roomId || !action) return;
    const normalizedRoomId = roomId.trim().toUpperCase();
    socket.to(normalizedRoomId).emit('video-sync', {
      action,
      currentTime: typeof currentTime === 'number' ? currentTime : 0,
      lessonId: lessonId || null,
      sender: currentUsername || 'Collaborator',
    });
  });

  // WebRTC Signaling Relay for Interview Mode
  socket.on('offer', ({ roomId, targetSocketId, offer }) => {
    if (!roomId || !offer) return;
    const payload = { fromSocketId: socket.id, user: currentUsername, offer };
    if (targetSocketId) {
      io.to(targetSocketId).emit('offer', payload);
    } else {
      socket.to(roomId.trim().toUpperCase()).emit('offer', payload);
    }
  });

  socket.on('answer', ({ roomId, targetSocketId, answer }) => {
    if (!roomId || !answer) return;
    const payload = { fromSocketId: socket.id, user: currentUsername, answer };
    if (targetSocketId) {
      io.to(targetSocketId).emit('answer', payload);
    } else {
      socket.to(roomId.trim().toUpperCase()).emit('answer', payload);
    }
  });

  socket.on('ice-candidate', ({ roomId, targetSocketId, candidate }) => {
    if (!roomId || !candidate) return;
    const payload = { fromSocketId: socket.id, candidate };
    if (targetSocketId) {
      io.to(targetSocketId).emit('ice-candidate', payload);
    } else {
      socket.to(roomId.trim().toUpperCase()).emit('ice-candidate', payload);
    }
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

    const normalizedRoomId = roomId.trim().toUpperCase();
    let userIsPro = Boolean(isPro);

    if (socket.userId) {
      try {
        const u = await User.findById(socket.userId);
        if (u) userIsPro = u.isPro;
      } catch (e) {
        // Fallback to client flag
      }
    }

    io.to(normalizedRoomId).emit('code-running', { language });

    try {
      const result = await executeCode(language, code, userIsPro);
      io.to(normalizedRoomId).emit('code-output', result);
    } catch (err) {
      io.to(normalizedRoomId).emit('code-output', {
        stdout: '',
        stderr: `Unexpected execution error: ${err.message}`,
        exitCode: 1,
        timedOut: false,
      });
    }
  });

  socket.on('run-tests', async ({ roomId, code, language, testCases, isPro }) => {
    if (!roomId || !code || !language || !Array.isArray(testCases)) {
      socket.emit('test-results', { results: [], error: 'Invalid test-case payload.' });
      return;
    }

    const normalizedRoomId = roomId.trim().toUpperCase();
    let userIsPro = Boolean(isPro);

    if (socket.userId) {
      try {
        const u = await User.findById(socket.userId);
        if (u) userIsPro = u.isPro;
      } catch (e) {
        // Fallback to client flag
      }
    }

    io.to(normalizedRoomId).emit('tests-running', { count: testCases.length });

    try {
      const results = await runTestCases(language, code, testCases, userIsPro);
      io.to(normalizedRoomId).emit('test-results', { results });
    } catch (err) {
      io.to(normalizedRoomId).emit('test-results', { results: [], error: err.message });
    }
  });

  socket.on('cursor-update', ({ roomId, user, position }) => {
    if (!roomId) return;
    const normalizedRoomId = roomId.trim().toUpperCase();
    socket.to(normalizedRoomId).emit('cursor-update', { user: user || currentUsername, position });
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
        socketId: socket.id,
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
    return;
  } else {
    socket.destroy();
  }
});

httpServer.listen(PORT, () => {
  console.log(`🚀 SynapseCode Ultimate Server listening on port ${PORT}`);
  console.log(`📡 Socket.io ready for WebRTC signaling, video-sync, test-runner & execution`);
  console.log(`🔄 Yjs document sync endpoint available at ws://localhost:${PORT}/yjs`);
});
