const jwt = require('jsonwebtoken');
const { JWT_SECRET } = require('./config');

module.exports = function(io) {
  let rehearsalState = {
    connectedUsers: [],
    currentSong: null,
    isLive: false
  };

  // --- Auth gate: every socket must present a valid login token. ---
  // The verified identity (esp. isAdmin) lives on socket.data.user and is the
  // ONLY source of truth for authorization — never trust client-sent payloads.
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

  io.on('connection', socket => {
    const authUser = socket.data.user;
    console.log('User connected:', socket.id, authUser.username);

    socket.on('joinRehearsal', () => {
      socket.join('jamoveo-rehearsal'); // shared room
      // Identity comes from the verified token, not the client payload.
      const member = { ...authUser, socketId: socket.id };
      if (!rehearsalState.connectedUsers.some(u => u.id === member.id)) {
        rehearsalState.connectedUsers.push(member);
      }
      io.to('jamoveo-rehearsal').emit('updateUsers', rehearsalState.connectedUsers);
      socket.emit('liveSong', rehearsalState.currentSong); // send current song to the new connected user
    });

    socket.on('selectSong', (song) => { // admin only
      if (!authUser.isAdmin) {
        return socket.emit('errorMessage', 'Only the session leader can select a song.');
      }
      rehearsalState.currentSong = song;
      rehearsalState.isLive = true;
      io.to('jamoveo-rehearsal').emit('liveSong', song); // broadcast the selected song to all users
    });

    socket.on('quitRehearsal', () => { // admin only
      if (!authUser.isAdmin) {
        return socket.emit('errorMessage', 'Only the session leader can end the song.');
      }
      rehearsalState.currentSong = null;
      rehearsalState.isLive = false;
      io.to('jamoveo-rehearsal').emit('quitRehearsal'); // notify all users that the rehearsal has ended
    });

    socket.on('disconnect', () => {
      rehearsalState.connectedUsers = rehearsalState.connectedUsers.filter(u => u.socketId !== socket.id); // remove the disconnected user
      io.to('jamoveo-rehearsal').emit('updateUsers', rehearsalState.connectedUsers); // update the list of connected users
      console.log('User disconnected:', socket.id);
    });
  });
};
