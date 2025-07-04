const express = require('express');
const http = require('http');
const cors = require('cors');
const { Server } = require('socket.io');
const authRoutes = require('./routes/auth');
const rehearsalRoutes = require('./routes/rehearsal');
const songRoutes = require('./routes/song');

const app = express();
const server = http.createServer(app);

// Initialize socket.io with the server
const io = new Server(server, {
  cors: { origin: '*' },
  methods: ['GET', 'POST'],
  credentials: true
});

// Middlewares
app.use(cors());
app.use(express.json());

// Routes
app.use('/api/auth', authRoutes);
app.use('/api/rehearsal', rehearsalRoutes);
app.use('/api/song', songRoutes);

// Socket Logic
require('./socket')(io);

const PORT = process.env.PORT || 3001;
server.listen(PORT, '0.0.0.0', () => {
  console.log(`Server listening on port ${PORT}`);
});
