const test = require('node:test');
const assert = require('node:assert');
const http = require('http');
const { Server } = require('socket.io');
const { io: Client } = require('socket.io-client');
const jwt = require('jsonwebtoken');
const attachSockets = require('../socket');

// socket.js verifies tokens against config.JWT_SECRET (env or the dev fallback).
const SECRET = process.env.JWT_SECRET || 'jamoveo-secret';
const token = (user) => jwt.sign(user, SECRET, { expiresIn: '1h' });

let server;
let url;

test.before(async () => {
  server = http.createServer();
  attachSockets(new Server(server, { cors: { origin: '*' } }));
  await new Promise((r) => { server.listen(0, r); });
  url = `http://127.0.0.1:${server.address().port}`;
});

test.after(() => server.close());

const open = (user) => {
  const sock = Client(url, { transports: ['websocket'], auth: (cb) => cb({ token: token(user) }) });
  return sock;
};
const emit = (sock, event, payload) => new Promise((res) => sock.emit(event, payload, res));
const waitConnect = (sock) => new Promise((res, rej) => {
  sock.on('connect', res);
  sock.on('connect_error', (e) => rej(new Error(e.message)));
});

test('a socket with no token is rejected', async () => {
  const sock = Client(url, { transports: ['websocket'] });
  await assert.rejects(waitConnect(sock));
  sock.close();
});

test('leader creates a room, player joins by code and receives the live song', async () => {
  const leader = open({ id: 1, username: 'leader', isAdmin: true });
  const player = open({ id: 2, username: 'player', isAdmin: false, instrument: 'guitar' });
  await Promise.all([waitConnect(leader), waitConnect(player)]);

  const { roomId } = await new Promise((res) => leader.emit('createRoom', res));
  assert.match(roomId, /^[A-Z0-9]{4}$/);

  const gotSong = new Promise((res) => player.on('liveSong', (s) => s && res(s)));
  const joinRes = await emit(player, 'joinRehearsal', { roomId });
  assert.equal(joinRes.ok, true);
  assert.equal(joinRes.isLeader, false);

  leader.emit('selectSong', { fileName: 'let_it_be.json', title: 'Let It Be' });
  const song = await gotSong;
  assert.equal(song.fileName, 'let_it_be.json');

  leader.close();
  player.close();
});

test('joining a nonexistent room reports roomNotFound', async () => {
  const player = open({ id: 3, username: 'lost', isAdmin: false });
  await waitConnect(player);
  const notFound = new Promise((res) => player.on('roomNotFound', res));
  const res = await emit(player, 'joinRehearsal', { roomId: 'ZZZZ' });
  assert.equal(res.error, 'roomNotFound');
  await notFound;
  player.close();
});

test('a non-leader cannot select a song', async () => {
  const leader = open({ id: 4, username: 'leader2', isAdmin: true });
  const player = open({ id: 5, username: 'player2', isAdmin: false });
  await Promise.all([waitConnect(leader), waitConnect(player)]);

  const { roomId } = await new Promise((res) => leader.emit('createRoom', res));
  await emit(player, 'joinRehearsal', { roomId });

  const blocked = new Promise((res) => player.on('errorMessage', res));
  player.emit('selectSong', { fileName: 'hack.json' });
  assert.match(await blocked, /session leader/i);

  leader.close();
  player.close();
});

test('leader scroll control is broadcast to the room', async () => {
  const leader = open({ id: 6, username: 'leader3', isAdmin: true });
  const player = open({ id: 7, username: 'player3', isAdmin: false });
  await Promise.all([waitConnect(leader), waitConnect(player)]);

  const { roomId } = await new Promise((res) => leader.emit('createRoom', res));
  await emit(player, 'joinRehearsal', { roomId });

  const synced = new Promise((res) => player.on('scrollSync', res));
  leader.emit('scrollControl', { on: true, speed: 5 });
  const sc = await synced;
  assert.equal(sc.on, true);
  assert.equal(sc.speed, 5);

  leader.close();
  player.close();
});
