class User {
  constructor(id, username, passwordHash, instrument, isAdmin = false) {
    this.id = id;
    this.username = username;
    this.passwordHash = passwordHash;
    this.instrument = instrument;
    this.isAdmin = isAdmin;
  }
}

module.exports = User;