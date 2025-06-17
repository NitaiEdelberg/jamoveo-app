const express = require('express');
const fs = require('fs');
const path = require('path');
const router = express.Router();

const SONGS_DIR = path.join(__dirname, '../songs');

router.get('/search', (req, res) => {
  const query = req.query.q ? req.query.q.toLowerCase() : '';
  fs.readdir(SONGS_DIR, (err, files) => {
    if (err) return res.status(500).json({ error: 'Error reading songs directory' });
    const results = [];
    files.forEach(file => {
      if (file.endsWith('.json')) {
        const songData = require(path.join(SONGS_DIR, file));
        const songName = file.replace('.json', '');
        const artist = songData.artist || '';
        if (
          songName.toLowerCase().includes(query) ||
          (artist && artist.toLowerCase().includes(query))
        ) {
          results.push({
            fileName: file,
            songName,
            artist
          });
        }
      }
    });
    res.status(200).json({ results });
  });
});

router.get('/:fileName', (req, res) => {
  const { fileName } = req.params;
  try {
    const songData = require(path.join(SONGS_DIR, fileName));
    res.status(200).json({ songData });
  } catch (err) {
    res.status(404).json({ error: 'Song not found' });
  }
});

module.exports = router;
