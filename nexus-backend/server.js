require('dotenv').config();
const express = require('express');
const http = require('http');
const { Server } = require('socket.io');
const mongoose = require('mongoose');
const cors = require('cors');
const path = require('path');
const swaggerUi = require('swagger-ui-express');
const swaggerJsdoc = require('swagger-jsdoc');

const app = express();
const server = http.createServer(app);

const io = new Server(server, {
  cors: { origin: '*', methods: ['GET', 'POST'] }
});

app.use(cors({ origin: '*' }));
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));
app.use('/uploads', express.static(path.join(__dirname, 'uploads')));

const swaggerOptions = {
  swaggerDefinition: {
    openapi: '3.0.0',
    info: {
      title: 'Nexus API',
      version: '1.0.0',
      description: 'API Documentation for Business Nexus platform',
    },
    servers: [
      { url: 'https://nexus-app-full-stack.vercel.app' }
    ]
  },
  apis: ['./routes/*.js']
};

const swaggerDocs = swaggerJsdoc(swaggerOptions);
app.use('/api-docs', swaggerUi.serve, swaggerUi.setup(swaggerDocs));

app.use('/api/auth', require('./routes/authRoutes'));
app.use('/api/users', require('./routes/userRoutes'));
app.use('/api/meetings', require('./routes/meetingRoutes'));
app.use('/api/notifications', require('./routes/notificationRoutes'));
app.use('/api/documents', require('./routes/documentRoutes'));
app.use('/api/payments', require('./routes/paymentRoutes'));

app.get('/api/status', (req, res) => {
  res.status(200).json({ message: 'Nexus Backend API is operational.' });
});

// ─── WebRTC Signaling via Socket.IO ───────────────────────────────────────────
const rooms = {};

io.on('connection', (socket) => {
  console.log(`🔌 User connected: ${socket.id}`);

  socket.on('join-room', ({ roomId, userId, userName }) => {
    socket.join(roomId);
    if (!rooms[roomId]) rooms[roomId] = [];
    rooms[roomId].push({ socketId: socket.id, userId, userName });

    // Tell everyone else in room that a new user joined
    socket.to(roomId).emit('user-joined', { socketId: socket.id, userId, userName });

    // Send list of existing users to the joiner
    const existingUsers = rooms[roomId].filter(u => u.socketId !== socket.id);
    socket.emit('existing-users', existingUsers);

    console.log(`👥 ${userName} joined room ${roomId}`);
  });

  socket.on('offer', ({ offer, to }) => {
    socket.to(to).emit('offer', { offer, from: socket.id });
  });

  socket.on('answer', ({ answer, to }) => {
    socket.to(to).emit('answer', { answer, from: socket.id });
  });

  socket.on('ice-candidate', ({ candidate, to }) => {
    socket.to(to).emit('ice-candidate', { candidate, from: socket.id });
  });

  socket.on('leave-room', ({ roomId }) => {
    socket.to(roomId).emit('user-left', { socketId: socket.id });
    socket.leave(roomId);
    if (rooms[roomId]) {
      rooms[roomId] = rooms[roomId].filter(u => u.socketId !== socket.id);
    }
  });

  socket.on('disconnect', () => {
    for (const roomId in rooms) {
      const user = rooms[roomId].find(u => u.socketId === socket.id);
      if (user) {
        socket.to(roomId).emit('user-left', { socketId: socket.id });
        rooms[roomId] = rooms[roomId].filter(u => u.socketId !== socket.id);
      }
    }
    console.log(`❌ User disconnected: ${socket.id}`);
  });
});

const PORT = process.env.PORT || 5000;
mongoose.connect(process.env.MONGO_URI)
  .then(() => {
    console.log('✅ MongoDB Connected Successfully');
    server.listen(PORT, () => console.log(`🚀 Server running on port ${PORT} (HTTP + Socket.IO)`));
  })
  .catch((err) => {
    console.error('❌ MongoDB Connection Error:', err.message);
    process.exit(1);
  });