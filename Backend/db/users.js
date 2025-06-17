// db/users.js
const sql = require('../db');

async function getUserByUsername(username) {
  const result = await sql
  `SELECT *
    FROM users
    WHERE username = ${username}`;
  return result[0]; // sql returns an array, so I return the first element
}

async function createUser({ username, passwordHash, instrument, isAdmin }) {
  const result = await sql`
    INSERT INTO users (username, password_hash, instrument, is_admin)
    VALUES (${username}, ${passwordHash}, ${instrument}, ${!!isAdmin})
    RETURNING *`;
  return result[0];
}

module.exports = {
  getUserByUsername,
  createUser,
};
