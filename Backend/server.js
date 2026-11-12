const express = require('express');
const http = require('http');
const cors = require('cors');
const { Server } = require('socket.io');
const authRoutes = require('./routes/auth');
const rehearsalRoutes = require('./routes/rehearsal');
const songRoutes = require('./routes/song');
const sql = require('./db');

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

// A cheap liveness probe that touches nothing. It exists for two reasons: the
// keep-alive cron needs a URL that is free to hit, and the frontend pings it on
// load to start Render's ~50s cold boot while the user is still typing. `GET /`
// is a 404 here, so there was previously no endpoint that could serve either.
app.get('/api/health', (req, res) => res.json({ status: 'ok' }));

// Touches the database on purpose. Supabase pauses a free project after ~7 days
// without queries, and /api/health never reaches the DB, so sign-up and login
// broke silently while everything else looked healthy. A scheduled workflow
// calls this every few days; a 503 here means the DB itself is unreachable.
// Only the error code is returned, never the message (it can include hosts).
app.get('/api/keepalive', async (req, res) => {
  try {
    await sql`select 1`;
    res.json({ status: 'ok', db: 'ok' });
  } catch (err) {
    console.error('Keepalive DB check failed:', err);
    res.status(503).json({ status: 'error', db: 'unreachable', code: err.code || 'unknown' });
  }
});

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
