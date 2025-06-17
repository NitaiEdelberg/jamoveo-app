class Rehearsal {
  constructor(id, adminUserId) {
    this.id = id;
    this.adminUserId = adminUserId;
    this.connectedUsers = [];
    this.currentSong = null; // {songName, artist, fileName}
    this.isLive = false;
  }
}
module.exports = Rehearsal;
