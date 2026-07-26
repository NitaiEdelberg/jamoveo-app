const express = require('express');
const fs = require('fs');
const path = require('path');
const router = express.Router();

const SONGS_DIR = path.join(__dirname, '../songs');

// A song file is either:
//   • the new object format  { title, artist, language, lines: [[...]] }
//   • or a legacy bare array  [[...]]  (title derived from the file name)
// loadSong normalizes both into { lines, meta } so the rest of the app doesn't
// care which one is on disk.
function prettify(fileName) {
  return fileName
    .replace(/\.json$/i, '')
    .replace(/[_-]+/g, ' ')
    .replace(/\b\w/g, (c) => c.toUpperCase());
}

function detectLanguage(lines) {
  const text = JSON.stringify(lines || '');
  return /[֐-׿]/.test(text) ? 'he' : 'en';
}

function loadSong(fileName) {
  const raw = JSON.parse(fs.readFileSync(path.join(SONGS_DIR, fileName), 'utf8'));
  if (Array.isArray(raw)) {
    return {
      lines: raw,
      meta: { title: prettify(fileName), artist: '', language: detectLanguage(raw) },
    };
  }
  const lines = Array.isArray(raw.lines) ? raw.lines : [];
  return {
    lines,
    meta: {
      title: raw.title || prettify(fileName),
      artist: raw.artist || '',
      language: raw.language || detectLanguage(lines),
    },
  };
}

function listSongFiles() {
  return fs.readdirSync(SONGS_DIR).filter((f) => f.endsWith('.json') && !f.startsWith('_'));
}

// GET /api/song/search?q=...  — search by title OR artist. An empty query
// returns the whole catalog (used by the "Browse all songs" button), sorted by
// title so the list is stable and scannable.
router.get('/search', (req, res) => {
  const query = (req.query.q || '').toLowerCase().trim();
  try {
    const results = [];
    for (const file of listSongFiles()) {
      let meta;
      try {
        ({ meta } = loadSong(file));
      } catch (e) {
        continue; // skip a malformed file rather than failing the whole search
      }
      const haystack = `${meta.title} ${meta.artist}`.toLowerCase();
      if (!query || haystack.includes(query)) {
        results.push({
          fileName: file,
          songName: meta.title, // kept for backward compatibility
          title: meta.title,
          artist: meta.artist,
          language: meta.language,
        });
      }
    }
    results.sort((a, b) => a.title.localeCompare(b.title));
    res.status(200).json({ results });
  } catch (err) {
    res.status(500).json({ error: 'Error reading songs directory' });
  }
});

router.get('/:fileName', (req, res) => {
  const { fileName } = req.params;
  // Guard against path traversal — only ever read a .json inside SONGS_DIR.
  if (!/^[\w.-]+\.json$/i.test(fileName)) {
    return res.status(400).json({ error: 'Invalid song name' });
  }
  try {
    const { lines, meta } = loadSong(fileName);
    // songData stays the lines array so the live view renders unchanged; meta
    // carries the real title/artist for the header.
    res.status(200).json({ songData: lines, meta });
  } catch (err) {
    res.status(404).json({ error: 'Song not found' });
  }
});

module.exports = router;
