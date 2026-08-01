// "Pro" user-experience tests for the live multi-room flow. These cover the
// real-world scenarios that actually broke for users, beyond the happy path in
// rooms.test.js:
//   • Late join / refresh resync — the "I joined but couldn't see the session" bug.
//   • Room isolation — a song in one band's room must never leak into another's.
//   • Cross-leader authorization — a second admin joining someone else's room is
//     NOT its leader and can't drive it.
//   • Presence counts and leader-only scroll control.
const test = require('node:test');
const assert = require('node:assert');
const http = require('http');
const { Server } = require('socket.io');
const { io: Client } = require('socket.io-client');
const jwt = require('jsonwebtoken');
const attachSockets = require('../socket');

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

const open = (user) =>
  Client(url, { transports: ['websocket'], forceNew: true, auth: (cb) => cb({ token: token(user) }) });
const emit = (sock, event, payload) => new Promise((res) => sock.emit(event, payload, res));
const createRoom = (sock) => new Promise((res) => sock.emit('createRoom', res));
const waitConnect = (sock) => new Promise((res, rej) => {
  sock.on('connect', res);
  sock.on('connect_error', (e) => rej(new Error(e.message)));
});
const once = (sock, event, timeout = 800) => new Promise((res, rej) => {
  const t = setTimeout(() => rej(new Error(`timeout waiting for "${event}"`)), timeout);
  sock.once(event, (payload) => { clearTimeout(t); res(payload); });
});
// Assert an event does NOT arrive within a short window.
const never = (sock, event, window = 300) => new Promise((res, rej) => {
  const t = setTimeout(res, window);
  sock.once(event, (p) => { clearTimeout(t); rej(new Error(`unexpected "${event}": ${JSON.stringify(p)}`)); });
});

test('a player joining AFTER the song is chosen still lands on it (late-join resync)', async () => {
  const leader = open({ id: 10, username: 'lead', isAdmin: true });
  await waitConnect(leader);
  const { roomId } = await createRoom(leader);

  // Leader picks a song *before* the player is anywhere near the room.
  leader.emit('selectSong', { fileName: 'imagine.json', title: 'Imagine' });

  // Player shows up late (this is a fresh page load / following an invite link).
  const player = open({ id: 11, username: 'latecomer', isAdmin: false });
  await waitConnect(player);

  const state = once(player, 'roomState');
  const live = once(player, 'liveSong');
  await emit(player, 'joinRehearsal', { roomId });

  const roomState = await state;
  assert.equal(roomState.song.fileName, 'imagine.json', 'roomState carries the current song');
  const song = await live;
  assert.equal(song.fileName, 'imagine.json', 'and liveSong fires so the player is taken to it');

  leader.close();
  player.close();
});

test('rooms are isolated — a song in room A never reaches room B', async () => {
  const leaderA = open({ id: 20, username: 'leadA', isAdmin: true });
  const leaderB = open({ id: 21, username: 'leadB', isAdmin: true });
  const playerB = open({ id: 22, username: 'playB', isAdmin: false });
  await Promise.all([waitConnect(leaderA), waitConnect(leaderB), waitConnect(playerB)]);

  const { roomId: roomA } = await createRoom(leaderA);
  const { roomId: roomB } = await createRoom(leaderB);
  assert.notEqual(roomA, roomB);
  await emit(playerB, 'joinRehearsal', { roomId: roomB });

  // Leader A starts a song; player B (in a different room) must hear nothing.
  const leak = never(playerB, 'liveSong');
  leaderA.emit('selectSong', { fileName: 'zombie.json', title: 'Zombie' });
  await leak;

  leaderA.close();
  leaderB.close();
  playerB.close();
});

test('a second admin who joins another leader\'s room is NOT its leader', async () => {
  const owner = open({ id: 30, username: 'owner', isAdmin: true });
  const guestAdmin = open({ id: 31, username: 'guestAdmin', isAdmin: true });
  await Promise.all([waitConnect(owner), waitConnect(guestAdmin)]);

  const { roomId } = await createRoom(owner);
  const joinRes = await emit(guestAdmin, 'joinRehearsal', { roomId });
  assert.equal(joinRes.isLeader, false, 'admin rights alone do not make you leader of a room you did not create');

  // ...and the guest admin cannot select a song in a room they don't lead.
  const blocked = once(guestAdmin, 'errorMessage');
  guestAdmin.emit('selectSong', { fileName: 'hack.json' });
  assert.match(await blocked, /session leader/i);

  owner.close();
  guestAdmin.close();
});

test('a non-leader\'s scrollControl is ignored (not rebroadcast)', async () => {
  const leader = open({ id: 40, username: 'lead4', isAdmin: true });
  const player = open({ id: 41, username: 'play4', isAdmin: false });
  await Promise.all([waitConnect(leader), waitConnect(player)]);

  const { roomId } = await createRoom(leader);
  await emit(player, 'joinRehearsal', { roomId });

  // The player tries to hijack scroll; the leader should receive nothing.
  const silence = never(leader, 'scrollSync');
  player.emit('scrollControl', { on: true, speed: 6 });
  await silence;

  leader.close();
  player.close();
});

// The client sends these through socket.timeout(...).emit(...) so a dead socket
// can't leave a button hanging forever. That changes the ack signature to
// (err, response), so the server's replies have to survive the wrapper intact —
// if they didn't, "Start a session" would break for everyone.
const emitWithAck = (sock, event, payload, ms = 4000) => new Promise((resolve) => {
  const done = (err, res) => resolve(err ? { error: 'no-connection' } : (res || {}));
  if (payload === undefined) sock.timeout(ms).emit(event, done);
  else sock.timeout(ms).emit(event, payload, done);
});

test('acks survive the client-side timeout wrapper', async () => {
  const leader = open({ id: 60, username: 'lead6', isAdmin: true });
  const player = open({ id: 61, username: 'play6', isAdmin: false });
  await Promise.all([waitConnect(leader), waitConnect(player)]);

  const created = await emitWithAck(leader, 'createRoom');
  assert.match(created.roomId, /^[A-Z0-9]{4}$/, 'createRoom must still return the room code');

  const joined = await emitWithAck(player, 'joinRehearsal', { roomId: created.roomId });
  assert.equal(joined.ok, true);
  assert.equal(joined.isLeader, false);

  const missing = await emitWithAck(player, 'joinRehearsal', { roomId: 'ZZZZ' });
  assert.equal(missing.error, 'roomNotFound');

  leader.close();
  player.close();
});

test('a socket rejected by auth reports the failure rather than hanging', async () => {
  // Socket.IO does not retry after a middleware rejection, so an emit on this
  // socket would buffer forever. The timeout wrapper is what turns that into a
  // visible error instead of a dead button.
  const sock = Client(url, { transports: ['websocket'], forceNew: true, auth: (cb) => cb({ token: 'nope' }) });
  await assert.rejects(waitConnect(sock));

  const res = await emitWithAck(sock, 'createRoom', undefined, 600);
  assert.equal(res.error, 'no-connection');
  sock.close();
});

test('presence count rises as members join the room', async () => {
  const leader = open({ id: 50, username: 'lead5', isAdmin: true });
  await waitConnect(leader);
  const { roomId } = await createRoom(leader);

  const player = open({ id: 51, username: 'play5', isAdmin: false });
  await waitConnect(player);
  const twoInRoom = new Promise((res) => {
    leader.on('updateUsers', (users) => { if (users.length === 2) res(users); });
  });
  await emit(player, 'joinRehearsal', { roomId });
  const users = await twoInRoom;
  assert.equal(users.length, 2);
  assert.ok(users.some((u) => u.username === 'lead5') && users.some((u) => u.username === 'play5'));

  leader.close();
  player.close();
});
