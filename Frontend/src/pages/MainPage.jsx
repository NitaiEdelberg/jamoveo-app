import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import socket from '../socket';
import { Wordmark, BRAND_COLOR } from '../brand';

function MainPage() {
  const navigate = useNavigate();
  const [user, setUser] = useState(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [error, setError] = useState('');
  const [liveSong, setLiveSong] = useState(null);
  const [roomCount, setRoomCount] = useState(0);

  useEffect(() => {
    const userStr = localStorage.getItem('user');
    if (!userStr) {
      navigate('/login');
      return;
    }
    const userObj = JSON.parse(userStr);
    setUser(userObj); // Set user state from localStorage

    socket.emit('joinRehearsal', { ...userObj, socketId: socket.id }); // Join the rehearsal room with user info, using socket.io

    socket.on('liveSong', (song) => { // Listen for live song updates
      setLiveSong(song);
      if (song) {
        navigate(`/live?song=${song.fileName}`);
      }
    });

    socket.on('quitRehearsal', () => {
      setLiveSong(null);
    });

    socket.on('updateUsers', (users) => { // Live count of people in the room
      setRoomCount(Array.isArray(users) ? users.length : 0);
    });

    socket.on('connect_error', (err) => { // rejected by the server's auth gate (e.g. expired token)
      if (String(err?.message || '').includes('unauthorized')) {
        localStorage.clear();
        navigate('/login');
      }
    });

    return () => {
      socket.off('liveSong');
      socket.off('quitRehearsal');
      socket.off('updateUsers');
      socket.off('connect_error');
    };
  }, [navigate]);

  const handleSearch = e => { // Handle search form submission
    e.preventDefault();
    if (searchQuery.trim() === '') return;
    navigate(`/results?q=${encodeURIComponent(searchQuery)}`); // Navigate to results page with search query
  };

  if (error) return <div className="alert alert-danger">{error}</div>;
  if (!user) return <div className="p-4">Loading...</div>;

  return (
    <div className="d-flex align-items-center justify-content-center" style={{ minHeight: '100vh', background: '#f8f9fa' }}>
      <div className="card shadow" style={{ width: 440, maxWidth: '92vw', padding: 24 }}>
        <Wordmark tagline={false} size={28} />

        <div className="d-flex justify-content-between align-items-center mb-3">
          <span className="fw-bold fs-5" style={{ color: BRAND_COLOR }}>Welcome, {user.username}!</span>
          <button
            className="btn btn-outline-danger btn-sm"
            onClick={() => {
              localStorage.clear();
              navigate('/login');
            }}
          > Logout
          </button>
        </div>

        {/* Live room status — makes it feel like a real, shared session. */}
        <div className="d-flex justify-content-center gap-2 mb-3">
          <span className="badge rounded-pill text-bg-success">🟢 In the room: {roomCount}</span>
          <span className="badge rounded-pill text-bg-secondary">
            {user.isAdmin ? '🎙️ You are the session leader' : `🎸 ${user.instrument || 'player'}`}
          </span>
        </div>

        {user.isAdmin ? (
          <>
            <div className="alert alert-light border small mb-3">
              <strong>How it works:</strong> search for a song below and pick it — it opens
              <em> live for everyone</em> in the room at the same time. Hit <strong>Quit</strong>
              on the live screen to end the song and bring everyone back here.
            </div>
            <h2 className="text-center fs-6 text-muted mb-2">Search any song…</h2>
            <form onSubmit={handleSearch}>
              <div className="mb-3">
                <input
                  type="text"
                  className="form-control"
                  placeholder="Search by name or artist"
                  value={searchQuery}
                  onChange={e => setSearchQuery(e.target.value)}
                />
              </div>
              <button type="submit" className="btn btn-primary w-100">
                Search
              </button>
            </form>
          </>
        ) : (
          <div className="text-center">
            <div className="spinner-border text-secondary my-2" role="status" aria-hidden="true"></div>
            <h2 className="fs-5 mb-2">
              {liveSong ? 'Loading song…' : 'Waiting for the leader to start a song'}
            </h2>
            <p className="text-muted small mb-0">
              Keep this page open — the song will open here automatically the moment the
              session leader picks one.
            </p>
          </div>
        )}
      </div>
    </div>
  );
}

export default MainPage;
