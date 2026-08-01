import { io } from "socket.io-client";

// Send the login token on every (re)connect. Using the callback form so the
// CURRENT token is read each time — the server verifies it and rejects the
// connection if it's missing/invalid/expired.
const socket = io(import.meta.env.VITE_API_URL, {
  transports: ['websocket', 'polling'],
  auth: (cb) => cb({ token: localStorage.getItem('token') }),
});

// Registered here, synchronously with the socket itself, because the first
// connection attempt begins the moment this module is imported — before any
// component has mounted. A handler registered inside a component effect misses
// that event, and Socket.IO does NOT retry after a *middleware* rejection
// (socket.active stays false), so it never fires again.
//
// That combination is what made an expired token look like a broken app: the
// socket was dead, nothing sent the user back to login, and every later emit
// silently buffered forever. Tokens last 24h, so this hit anyone who came back
// the next day and pressed a button.
socket.on('connect_error', (err) => {
  if (!String(err?.message || '').includes('unauthorized')) return;
  localStorage.removeItem('token');
  localStorage.removeItem('user');
  localStorage.removeItem('roomId');
  // Full navigation rather than a router push: it rebuilds the socket cleanly,
  // and the guard stops a redirect loop once we're already on the login page.
  if (!window.location.pathname.startsWith('/login')) {
    window.location.replace('/login?expired=1');
  }
});

/**
 * Emit that always answers.
 *
 * A plain `emit(event, cb)` on a disconnected socket buffers the packet and
 * never runs the callback, so a button wired to it simply does nothing.
 * `.timeout()` guarantees the callback runs either way.
 *
 * Resolves to the server's reply, or `{ error: 'no-connection' }`.
 */
export function emitWithAck(event, payload, timeoutMs = 8000) {
  return new Promise((resolve) => {
    const done = (err, res) => resolve(err ? { error: 'no-connection' } : (res || {}));
    if (payload === undefined) {
      socket.timeout(timeoutMs).emit(event, done);
    } else {
      socket.timeout(timeoutMs).emit(event, payload, done);
    }
  });
}

/**
 * Bring the socket back after a fresh login.
 *
 * An auth rejection leaves the socket inactive with no automatic retry, so
 * without this, signing in again would still leave every action dead. The auth
 * callback re-reads localStorage, so the new token is picked up.
 */
export function reconnectWithFreshToken() {
  if (!socket.connected) socket.connect();
}

export default socket;
