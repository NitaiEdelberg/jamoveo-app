const jwt = require('jsonwebtoken');
const { JWT_SECRET } = require('./config');

// Multi-room live rehearsal state (in-memory — a room lives until the server
// restarts). Each room is keyed by a short, shareable code the leader hands out.
//
//   rooms: Map(CODE -> { users:[], currentSong, isLive, leaderId, scroll:{on,speed} })
//
// Authorization is always derived from the verified JWT on socket.data.user —
// never from client-sent payloads. Only the room's leader can drive it.
module.exports = function (io) {
  const rooms = new Map();

  // Unambiguous alphabet (no O/0/I/1) so codes are easy to read out loud.
  const ALPHABET = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
  function genCode(len = 4) {
    let code;
    do {
      code = Array.from({ length: len }, () => ALPHABET[(Math.random() * ALPHABET.length) | 0]).join('');
    } while (rooms.has(code));
    return code;
  }

  const isLeaderOf = (socket, room) =>
    !!room && socket.data.user.isAdmin && room.leaderId === socket.data.user.id;

  // --- Auth gate: every socket must present a valid login token. ---
  io.use((socket, next) => {
    const token = socket.handshake.auth?.token;
    if (!token) return next(new Error('unauthorized: no token'));
    try {
      const decoded = jwt.verify(token, JWT_SECRET);
      socket.data.user = {
        id: decoded.id,
        username: decoded.username,
        isAdmin: !!decoded.isAdmin,
        instrument: decoded.instrument,
      };
      next();
    } catch (err) {
      next(new Error('unauthorized: invalid token'));
    }
  });

  io.on('connection', (socket) => {
    const authUser = socket.data.user;
    console.log('User connected:', socket.id, authUser.username);

    // Attach this socket to a room and send it the current state so a fresh
    // page load / reconnect immediately resyncs (this is what makes a player
    // reliably land on the leader's current song).
    function attach(code) {
      const room = rooms.get(code);
      if (!room) return false;
      socket.join(code);
      socket.data.roomId = code;
      room.users = room.users.filter((u) => u.id !== authUser.id);
      room.users.push({ ...authUser, socketId: socket.id });
      io.to(code).emit('updateUsers', room.users);
      socket.emit('roomState', {
        roomId: code,
        isLeader: isLeaderOf(socket, room),
        song: room.currentSong,
        scroll: room.scroll,
      });
      if (room.currentSong) socket.emit('liveSong', room.currentSong);
      return true;
    }

    // Leader creates a new session and gets a code to share.
    socket.on('createRoom', (cb) => {
      if (!authUser.isAdmin) {
        return typeof cb === 'function' && cb({ error: 'Only a session leader can start a session.' });
      }
      const code = genCode();
      rooms.set(code, {
        users: [],
        currentSong: null,
        isLive: false,
        leaderId: authUser.id,
        scroll: { on: false, speed: 2 },
      });
      attach(code);
      if (typeof cb === 'function') cb({ roomId: code });
    });

    // Anyone joins an existing room by its code.
    socket.on('joinRehearsal', (payload, cb) => {
      const code = String((payload && payload.roomId) || '').toUpperCase().trim();
      if (!rooms.has(code)) {
        socket.emit('roomNotFound', code);
        return typeof cb === 'function' && cb({ error: 'roomNotFound' });
      }
      attach(code);
      if (typeof cb === 'function') cb({ ok: true, isLeader: isLeaderOf(socket, rooms.get(code)) });
    });

    socket.on('selectSong', (song) => {
      const room = rooms.get(socket.data.roomId);
      if (!isLeaderOf(socket, room)) {
        return socket.emit('errorMessage', 'Only the session leader can select a song.');
      }
      room.currentSong = song;
      room.isLive = true;
      io.to(socket.data.roomId).emit('liveSong', song);
    });

    socket.on('quitRehearsal', () => {
      const room = rooms.get(socket.data.roomId);
      if (!isLeaderOf(socket, room)) {
        return socket.emit('errorMessage', 'Only the session leader can end the song.');
      }
      room.currentSong = null;
      room.isLive = false;
      room.scroll = { on: false, speed: room.scroll.speed };
      io.to(socket.data.roomId).emit('quitRehearsal');
    });

    // Leader broadcasts synced auto-scroll to the rest of the band.
    socket.on('scrollControl', (data) => {
      const room = rooms.get(socket.data.roomId);
      if (!isLeaderOf(socket, room)) return;
      room.scroll = { on: !!(data && data.on), speed: Number(data && data.speed) || 2 };
      socket.to(socket.data.roomId).emit('scrollSync', room.scroll); // everyone except the leader
    });

    socket.on('disconnect', () => {
      const room = rooms.get(socket.data.roomId);
      if (room) {
        room.users = room.users.filter((u) => u.socketId !== socket.id);
        io.to(socket.data.roomId).emit('updateUsers', room.users);
      }
      console.log('User disconnected:', socket.id);
    });
  });
};
