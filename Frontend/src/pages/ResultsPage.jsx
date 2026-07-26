import React, { useEffect, useState } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import axios from 'axios';
import socket from '../socket';

function ResultsPage() {
  const navigate = useNavigate();
  const location = useLocation();
  const [results, setResults] = useState([]);
  const [loading, setLoading] = useState(true);

  const params = new URLSearchParams(location.search);
  const query = params.get('q'); // search query from URL parameters
  const browse = params.get('browse') === '1'; // "browse all" mode

  useEffect(() => {
    const user = JSON.parse(localStorage.getItem('user'));
    if (!user?.isAdmin) {
      navigate('/main');
      return;
    }
    if (!query && !browse) {
      navigate('/main');
      return;
    }
    setLoading(true);
    // An empty q returns the whole catalog — that's the "browse all songs" list.
    axios.get(`${import.meta.env.VITE_API_URL}/api/song/search?q=${encodeURIComponent(query || '')}`)
      .then(res => setResults(res.data.results))
      .finally(() => setLoading(false));
  }, [query, browse, navigate]);

  const heading = browse ? 'All songs' : query;

  const handleSelectSong = song => {
    socket.emit('selectSong', { ...song }); // Emit the selected song to the server
    navigate(`/live?song=${encodeURIComponent(song.fileName)}`); //move to live page with the selected song
  };

  if (loading) return (
    <div className="d-flex align-items-center justify-content-center" style={{ minHeight: '100vh' }}>
      <div className="text-center">Loading...</div>
    </div>
  );

  if (!results.length) return (
    <div className="d-flex flex-column align-items-center justify-content-center" style={{ minHeight: '100vh' }}>
      <div className="mb-3">
        No results found for: <b>{heading}</b>
      </div>
      <button
        onClick={() => navigate('/main')}
        className="btn btn-secondary px-4"
      >
        Back to search
      </button>
    </div>
  );

  return (
    <div className="d-flex align-items-center justify-content-center" style={{ minHeight: '100vh', background: '#f8f9fa' }}>
      <div className="card shadow" style={{ width: '100%', maxWidth: 450, padding: 24 }}>
        <h2 className="text-center mb-1">
          {browse ? 'All songs' : <>Results for: <b>{query}</b></>}
        </h2>
        <p className="text-center text-muted small mb-4">{results.length} song{results.length === 1 ? '' : 's'}</p>
        <ul className="list-group">
          {results.map(song => (
            <li
              key={song.fileName}
              className="list-group-item list-group-item-action mb-2 d-flex justify-content-between align-items-center"
              style={{ cursor: 'pointer' }}
              onClick={() => handleSelectSong(song)}
            >
              <div>
                <b>{song.title || song.songName}</b>
                {song.artist && <div className="text-muted small">by {song.artist}</div>}
              </div>
              {song.language && (
                <span className="badge rounded-pill text-bg-light">
                  {song.language === 'he' ? 'עברית' : 'EN'}
                </span>
              )}
            </li>
          ))}
        </ul>
        <button
        onClick={() => navigate('/main')}
        className="btn btn-outline-primary w-100"
      >
        Back to main page
      </button>
      </div>
    </div>
  );
}

export default ResultsPage;
