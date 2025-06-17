const express = require('express');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const { getUserByUsername, createUser } = require('../db/users');
const router = express.Router();

router.post('/signup', async (req, res) => {
  const { username, password, instrument, isAdmin } = req.body;
  try {
    const existingUser = await getUserByUsername(username);
    if (existingUser) {
      return res.status(400).json({ error: 'Username already exists' });
    }
    const passwordHash = await bcrypt.hash(password, 10);
    await createUser({ username, passwordHash, instrument, isAdmin: !!isAdmin });
    console.log(`New user created: ${username}`);
    res.status(201).json({ message: 'User created' });
  } catch (err) {
    console.error('Signup error:', err);
    res.status(500).json({ error: 'Server error' });
  }
});

router.post('/login', async (req, res) => {
  const { username, password } = req.body;
  try {
    const user = await getUserByUsername(username);
    if (!user || !(await bcrypt.compare(password, user.password_hash))) {
      return res.status(401).json({ error: 'Invalid credentials' });
    }
    const token = jwt.sign(
      { id: user.id, username: user.username, isAdmin: user.is_admin, instrument: user.instrument },
      'jamoveo-secret',
      { expiresIn: '24h' }
    );
    console.log(`${username} logged in successfully`);
    res.json({
      token,
      user: {
        id: user.id,
        username: user.username,
        isAdmin: user.is_admin,
        instrument: user.instrument
      }
    });
  } catch (err) {
    console.error('Login error:', err);
    res.status(500).json({ error: 'Server error' });
  }
});

module.exports = router;
