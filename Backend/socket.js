module.exports = function(io) {
  let rehearsalState = {
    connectedUsers: [],
    currentSong: null,
    isLive: false
  };

  io.on('connection', socket => {
    console.log('User connected:', socket.id);

    socket.on('joinRehearsal', (user) => {
      socket.join('jamoveo-rehearsal'); // shared room
      if (!rehearsalState.connectedUsers.some(u => u.id === user.id)) {
        rehearsalState.connectedUsers.push(user);
      }
      io.to('jamoveo-rehearsal').emit('updateUsers', rehearsalState.connectedUsers);
      socket.emit('liveSong', rehearsalState.currentSong);
    });

    socket.on('selectSong', (song) => { // admin
      rehearsalState.currentSong = song;
      rehearsalState.isLive = true;
      io.to('jamoveo-rehearsal').emit('liveSong', song);
    });

    socket.on('quitRehearsal', () => { // admin
      rehearsalState.currentSong = null;
      rehearsalState.isLive = false;
      io.to('jamoveo-rehearsal').emit('quitRehearsal');
    });

    socket.on('disconnect', () => {
      rehearsalState.connectedUsers = rehearsalState.connectedUsers.filter(u => u.socketId !== socket.id);
      io.to('jamoveo-rehearsal').emit('updateUsers', rehearsalState.connectedUsers);
      console.log('User disconnected:', socket.id);
    });
  });
};
