const express = require('express');
const { rehearsals } = require('../db'); // local memory
const Rehearsal = require('../models/rehearsal');
const router = express.Router();

router.post('/create', (req, res) => {
  const { adminUserId } = req.body;
  if (rehearsals.length > 0) return res.status(400).json({ error: 'rehearsal already exists' });
  const adminUser = users.find(u => u.id === adminUserId);
  if (!adminUser || !adminUser.isAdmin) {
    return res.status(403).json({ error: 'Only admin can create a rehearsal' });
  }
  const newRehearsal = new Rehearsal(1, adminUserId); // assuming 1 rehearsal at a time
  rehearsals.push(newRehearsal);
  res.status(201).json({ message: 'rehearsal created', rehearsal: newRehearsal });
});

router.get('/', (req, res) => {
  res.status(200).json({ rehearsals });
});

module.exports = router;
