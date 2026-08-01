import React, { useEffect, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import socket, { emitWithAck } from '../socket';
import { Wordmark, BRAND_COLOR } from '../brand';

function MainPage() {
  const navigate = useNavigate();
  const [user, setUser] = useState(null);
  const [roomId, setRoomId] = useState(localStorage.getItem('roomId') || '');
  const [isLeader, setIsLeader] = useState(false);
  const [joined, setJoined] = useState(false);
  const [roomCodeInput, setRoomCodeInput] = useState('');
  const [error, setError] = useState('');
  const [roomCount, setRoomCount] = useState(0);
  const [copied, setCopied] = useState(false);
  const [busy, setBusy] = useState(false);

  const [songs, setSongs] = useState([]);
  const [query, setQuery] = useState('');

  // Handlers registered once on mount capture room state via a ref to avoid
  // stale closures.
  const roomRef = useRef(roomId);
  useEffect(() => { roomRef.current = roomId; }, [roomId]);

  const persistRoom = (code) => {
    setRoomId(code);
    if (code) localStorage.setItem('roomId', code);
    else localStorage.removeItem('roomId');
  };

  // Load the song library once (also used as the leader's inline picker).
  useEffect(() => {
    fetch(`${import.meta.env.VITE_API_URL}/api/song/search?q=`)
      .then((r) => r.json())
      .then((d) => setSongs(Array.isArray(d.results) ? d.results : []))
      .catch(() => setSongs([]));
  }, []);

  useEffect(() => {
    const userStr = localStorage.getItem('user');
    if (!userStr) {
      navigate('/login');
      return;
    }
    setUser(JSON.parse(userStr));

    const onRoomState = (state) => {
      persistRoom(state.roomId);
      setIsLeader(!!state.isLeader);
      setJoined(true);
      setError('');
    };
    const onLiveSong = (song) => {
      if (song) navigate(`/live?room=${roomRef.current}&song=${encodeURIComponent(song.fileName)}`);
    };
    const onUpdateUsers = (users) => setRoomCount(Array.isArray(users) ? users.length : 0);
    const onRoomNotFound = (code) => {
      // A leader whose room expired (server restart/sleep) should just land back
      // on "Start a session", not see a scary error meant for players.
      let admin = false;
      try { admin = JSON.parse(localStorage.getItem('user') || '{}').isAdmin; } catch { /* ignore */ }
      if (!admin) {
        setError(`No live session found for code "${code}". Ask the leader for the current code.`);
      }
      persistRoom('');
      setJoined(false);
      setIsLeader(false);
    };
    const onConnectError = (err) => {
      if (String(err?.message || '').includes('unauthorized')) {
        localStorage.clear();
        navigate('/login');
      }
    };

    socket.on('roomState', onRoomState);
    socket.on('liveSong', onLiveSong);
    socket.on('updateUsers', onUpdateUsers);
    socket.on('roomNotFound', onRoomNotFound);
    socket.on('connect_error', onConnectError);

    // Rejoin automatically on load/reconnect if we already have a room (e.g. the
    // player followed an invite link, or anyone refreshed the page).
    const existing = localStorage.getItem('roomId');
    if (existing) socket.emit('joinRehearsal', { roomId: existing });

    return () => {
      socket.off('roomState', onRoomState);
      socket.off('liveSong', onLiveSong);
      socket.off('updateUsers', onUpdateUsers);
      socket.off('roomNotFound', onRoomNotFound);
      socket.off('connect_error', onConnectError);
    };
  }, [navigate]);

  const startSession = async () => {
    setError('');
    setBusy(true);
    // emitWithAck rather than a bare emit: on a disconnected socket the ack never
    // arrives and the button appears to do nothing at all.
    const res = await emitWithAck('createRoom');
    setBusy(false);
    if (res?.roomId) {
      persistRoom(res.roomId);
      setIsLeader(true);
      setJoined(true);
    } else if (res?.error === 'no-connection') {
      setError("Can't reach the server — check your connection and try again.");
    } else {
      setError(res?.error || 'Could not start a session.');
    }
  };

  const joinByCode = async (e) => {
    e.preventDefault();
    const code = roomCodeInput.toUpperCase().trim();
    if (!code) return;
    setError('');
    setBusy(true);
    const res = await emitWithAck('joinRehearsal', { roomId: code });
    setBusy(false);
    if (res?.error === 'no-connection') {
      setError("Can't reach the server — check your connection and try again.");
    } else if (res?.error === 'roomNotFound') {
      setError(`No live session found for code "${code}".`);
    }
  };

  const pickSong = (song) => {
    socket.emit('selectSong', song);
    navigate(`/live?room=${roomId}&song=${encodeURIComponent(song.fileName)}`);
  };

  const shareLink = roomId ? `${window.location.origin}/join/${roomId}` : '';
  const copyShare = async () => {
    try {
      await navigator.clipboard.writeText(shareLink);
      setCopied(true);
      setTimeout(() => setCopied(false), 1500);
    } catch { /* clipboard unavailable — the link is shown for manual copy */ }
  };

  const logout = () => {
    localStorage.clear();
    navigate('/login');
  };

  if (!user) return <div className="p-4">Loading...</div>;

  const filtered = songs.filter((s) => {
    const q = query.toLowerCase().trim();
    if (!q) return true;
    return `${s.title || s.songName} ${s.artist || ''}`.toLowerCase().includes(q);
  });

  const SongList = () => (
    <>
      <input
        type="text"
        className="form-control mb-2"
        placeholder="Search the library by song or artist…"
        value={query}
        onChange={(e) => setQuery(e.target.value)}
      />
      <div className="list-group mb-2" style={{ maxHeight: '46vh', overflowY: 'auto' }}>
        {filtered.length === 0 && <div className="text-muted small p-2">No songs match “{query}”.</div>}
        {filtered.map((s) => (
          <button
            key={s.fileName}
            type="button"
            className="list-group-item list-group-item-action d-flex justify-content-between align-items-center"
            onClick={() => pickSong(s)}
          >
            <span>
              <b>{s.title || s.songName}</b>
              {s.artist && <span className="text-muted small"> — {s.artist}</span>}
            </span>
            <span className="badge rounded-pill text-bg-light">
              {s.language === 'he' ? 'עברית' : 'EN'}
            </span>
          </button>
        ))}
      </div>
      <div className="text-muted small">{songs.length} songs in the library</div>
    </>
  );

  return (
    <div className="d-flex align-items-center justify-content-center" style={{ minHeight: '100vh', background: '#f8f9fa', padding: 16 }}>
      <div className="card shadow" style={{ width: 480, maxWidth: '94vw', padding: 24 }}>
        <Wordmark tagline={false} size={28} />

        <div className="d-flex justify-content-between align-items-center mb-3">
          <span className="fw-bold fs-5" style={{ color: BRAND_COLOR }}>Welcome, {user.username}!</span>
          <button className="btn btn-outline-danger btn-sm" onClick={logout}>Logout</button>
        </div>

        {error && <div className="alert alert-warning py-2 small">{error}</div>}

        <div className="d-flex justify-content-center gap-2 mb-3">
          <span className="badge rounded-pill text-bg-success">🟢 In the room: {roomCount}</span>
          <span className="badge rounded-pill text-bg-secondary">
            {isLeader ? '🎙️ Session leader' : `🎸 ${user.instrument || 'player'}`}
          </span>
        </div>

        {/* ── LEADER, in a room: share code + inline library ── */}
        {isLeader && roomId && (
          <>
            <div className="text-center border rounded-3 py-3 mb-3" style={{ background: '#fffdf5' }}>
              <div className="text-muted small">Room code — share it with your band</div>
              <div className="fw-bold" style={{ fontSize: 40, letterSpacing: 6, color: BRAND_COLOR }}>{roomId}</div>
              <div className="input-group input-group-sm mt-2 px-3">
                <input className="form-control" readOnly value={shareLink} onFocus={(e) => e.target.select()} />
                <button className="btn btn-outline-primary" onClick={copyShare}>{copied ? 'Copied!' : 'Copy link'}</button>
              </div>
            </div>
            <h2 className="fs-6 text-muted mb-2">Pick a song — it opens live for everyone</h2>
            <SongList />
          </>
        )}

        {/* ── LEADER, no room yet: start a session ── */}
        {user.isAdmin && !roomId && (
          <div className="text-center">
            <p className="text-muted small mb-3">
              Start a session to get a room code your band can join, then pick songs that open
              live for everyone at once.
            </p>
            <button className="btn btn-primary btn-lg w-100 mb-3" onClick={startSession} disabled={busy}>
              {busy ? 'Starting…' : '🎙️ Start a session'}
            </button>
            <div className="text-muted small">…or join someone else's session below.</div>
            <JoinForm value={roomCodeInput} setValue={setRoomCodeInput} onSubmit={joinByCode} busy={busy} />
          </div>
        )}

        {/* ── PLAYER (or admin joining another room), not yet in a live song ── */}
        {!user.isAdmin && (
          joined && roomId ? (
            <div className="text-center">
              <div className="badge text-bg-light border mb-3" style={{ fontSize: 16, letterSpacing: 3 }}>Room {roomId}</div>
              <div className="spinner-border text-secondary my-2" role="status" aria-hidden="true"></div>
              <h2 className="fs-5 mb-2">Waiting for the leader to start a song</h2>
              <p className="text-muted small mb-3">
                Keep this page open — the song opens here automatically the moment the leader picks one.
              </p>
              <button className="btn btn-outline-secondary btn-sm" onClick={() => { persistRoom(''); setJoined(false); }}>
                Leave room
              </button>
            </div>
          ) : (
            <div className="text-center">
              <h2 className="fs-6 text-muted mb-2">Enter the room code from your session leader</h2>
              <JoinForm value={roomCodeInput} setValue={setRoomCodeInput} onSubmit={joinByCode} busy={busy} />
            </div>
          )
        )}
      </div>
    </div>
  );
}

function JoinForm({ value, setValue, onSubmit, busy }) {
  return (
    <form onSubmit={onSubmit} className="mt-2">
      <div className="input-group">
        <input
          type="text"
          className="form-control text-center text-uppercase"
          placeholder="e.g. AB7K"
          maxLength={6}
          style={{ letterSpacing: 4, fontWeight: 700 }}
          value={value}
          onChange={(e) => setValue(e.target.value)}
        />
        <button type="submit" className="btn btn-primary" disabled={busy}>{busy ? '…' : 'Join'}</button>
      </div>
    </form>
  );
}

export default MainPage;
