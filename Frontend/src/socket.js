import { io } from "socket.io-client";

// Send the login token on every (re)connect. Using the callback form so the
// CURRENT token is read each time — the server verifies it and rejects the
// connection if it's missing/invalid/expired.
const socket = io(import.meta.env.VITE_API_URL, {
  transports: ['websocket', 'polling'],
  auth: (cb) => cb({ token: localStorage.getItem('token') }),
});

export default socket;
