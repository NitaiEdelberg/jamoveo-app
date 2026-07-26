#!/usr/bin/env node
/*
 * Import a song into Tutti's library from a simple ChordPro-style text file.
 *
 * Usage:
 *   node scripts/import_song.js path/to/song.txt
 *   cat song.txt | node scripts/import_song.js
 *   SLUG=my_song node scripts/import_song.js song.txt   # force the file name
 *
 * Input format — metadata lines anywhere, then the lyrics with inline chords in
 * [square brackets] placed right before the word they sit on:
 *
 *   Title: Let It Be
 *   Artist: The Beatles
 *   Language: en                # optional; auto-detected (he if Hebrew present)
 *
 *   [C]When I find myself in [G]times of trouble
 *   [Am]Mother Mary [F]comes to me
 *
 * A blank line is ignored. Language auto-detects Hebrew. Output is written to
 * Backend/songs/<slug>.json in the {title,artist,language,lines} format the app
 * already understands.
 */
const fs = require('fs');
const path = require('path');

// A [chord] attaches to the word that follows it; a lone [chord] is its own slot.
function parseLine(str) {
  return str.split(/\s+/).filter(Boolean).map((tok) => {
    const m = tok.match(/^(?:\[([^\]]+)\])?(.*)$/);
    const w = { lyrics: m[2] || '' };
    if (m[1]) w.chords = m[1];
    return w;
  });
}

function slugify(s) {
  return s.toLowerCase().replace(/[^a-z0-9]+/g, '_').replace(/^_+|_+$/g, '') || 'song';
}

const src = process.argv[2] ? fs.readFileSync(process.argv[2], 'utf8') : fs.readFileSync(0, 'utf8');
const meta = { title: '', artist: '', language: '' };
const lines = [];

for (const raw of src.replace(/\r\n/g, '\n').split('\n')) {
  const m = raw.match(/^\s*(title|artist|language)\s*:\s*(.*)$/i);
  if (m) { meta[m[1].toLowerCase()] = m[2].trim(); continue; }
  if (raw.trim() === '') continue;
  lines.push(parseLine(raw));
}

if (!meta.title) {
  console.error('Error: input must include a "Title:" line.');
  process.exit(1);
}
if (!lines.length) {
  console.error('Error: no lyric lines found.');
  process.exit(1);
}
if (!meta.language) meta.language = /[֐-׿]/.test(src) ? 'he' : 'en';

const out = { title: meta.title, artist: meta.artist, language: meta.language, lines };
const slug = process.env.SLUG ? slugify(process.env.SLUG) : slugify(meta.title);
const dest = path.join(__dirname, '..', 'songs', `${slug}.json`);
fs.writeFileSync(dest, JSON.stringify(out, null, 2) + '\n');
console.log(`Wrote ${dest}  (${lines.length} lines, language=${meta.language})`);
