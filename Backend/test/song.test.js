const test = require('node:test');
const assert = require('node:assert');
const express = require('express');
const songRouter = require('../routes/song');

let server;
let base;

const get = async (p) => {
  const res = await fetch(`${base}${p}`);
  return { status: res.status, body: res.headers.get('content-type')?.includes('json') ? await res.json() : await res.text() };
};

test.before(async () => {
  const app = express();
  app.use('/api/song', songRouter);
  await new Promise((r) => { server = app.listen(0, r); });
  base = `http://127.0.0.1:${server.address().port}`;
});

test.after(() => server.close());

test('search matches by artist (the bug that used to silently fail)', async () => {
  const { status, body } = await get('/api/song/search?q=beatles');
  assert.equal(status, 200);
  const titles = body.results.map((r) => r.title);
  assert.ok(titles.includes('Hey Jude'), 'expected a Beatles song');
  assert.ok(body.results.every((r) => r.artist.toLowerCase().includes('beatles')));
});

test('empty query returns the whole catalog (browse all), sorted', async () => {
  const { status, body } = await get('/api/song/search?q=');
  assert.equal(status, 200);
  assert.ok(body.results.length >= 20, 'catalog should have the expanded library');
  const titles = body.results.map((r) => r.title);
  assert.deepEqual(titles, [...titles].sort((a, b) => a.localeCompare(b)));
});

test('fetching a song returns its lines + metadata', async () => {
  const { status, body } = await get('/api/song/let_it_be.json');
  assert.equal(status, 200);
  assert.equal(body.meta.title, 'Let It Be');
  assert.equal(body.meta.artist, 'The Beatles');
  assert.ok(Array.isArray(body.songData) && body.songData.length > 0);
});

test('path traversal is rejected', async () => {
  const { status } = await get('/api/song/..%2fserver.js');
  assert.notEqual(status, 200);
});

test('a missing song 404s', async () => {
  const { status } = await get('/api/song/does_not_exist.json');
  assert.equal(status, 404);
});
