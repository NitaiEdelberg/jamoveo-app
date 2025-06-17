import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import socket from '../socket';

function MainPage() {
  const navigate = useNavigate();
  const [user, setUser] = useState(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [error, setError] = useState('');
  const [liveSong, setLiveSong] = useState(null);

  useEffect(() => {
    const userStr = localStorage.getItem('user');
    if (!userStr) {
      navigate('/login');
      return;
    }
    const userObj = JSON.parse(userStr);
    setUser(userObj);

    socket.emit('joinRehearsal', { ...userObj, socketId: socket.id });

    socket.on('liveSong', (song) => {
      setLiveSong(song);
      if (song) {
        navigate(`/live?song=${song.fileName}`);
      }
    });

    socket.on('quitRehearsal', () => {
      setLiveSong(null);
    });

    return () => {
      socket.off('liveSong');
      socket.off('quitRehearsal');
    };
  }, [navigate]);

  const handleSearch = e => {
    e.preventDefault();
    if (searchQuery.trim() === '') return;
    navigate(`/results?q=${encodeURIComponent(searchQuery)}`);
  };

  if (error) return <div className="alert alert-danger">{error}</div>;
  if (!user) return <div className="p-4">Loading...</div>;

  return (
    <div className="d-flex align-items-center justify-content-center" style={{ minHeight: '100vh', background: '#f8f9fa' }}>
      <div className="card shadow" style={{ width: 400, padding: 24 }}>
        <div className="d-flex justify-content-between align-items-center mb-4">
          <span className="text-primary fw-bold fs-4"> Welcome, {user.username}! </span>
          <button
            className="btn btn-outline-danger btn-sm"
            onClick={() => {
              localStorage.clear();
              navigate('/login');
            }}
          > Logout
          </button>
        </div>
        {!user.isAdmin && (
          <h2 className="text-center fs-5 mb-0">
            {liveSong ? 'Loading song...' : 'Waiting for next song...'}
          </h2>
        )}
        {user.isAdmin && (
          <>
            <h2 className="text-center fs-5 mb-4">Search any song...</h2>
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
        )}
      </div>
    </div>
  );
}

export default MainPage;
