import React, { useEffect, useState, useRef } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import axios from 'axios';
import socket from '../socket';

const isSinger = () => {
  const userStr = localStorage.getItem('user');
  if (!userStr) return false;
  const user = JSON.parse(userStr);
  return user.instrument === 'vocals';
};

const isAdmin = () => {
  const userStr = localStorage.getItem('user');
  if (!userStr) return false;
  const user = JSON.parse(userStr);
  return user.isAdmin;
};

function LivePage() {
  const navigate = useNavigate();
  const location = useLocation();
  const [song, setSong] = useState(null);
  const [loading, setLoading] = useState(true);

  const [isScrolling, setIsScrolling] = useState(false);
  const scrollIntervalRef = useRef(null);
  const scrollRef = useRef(null);

  const songFileName = new URLSearchParams(location.search).get('song'); // Get song file name from URL parameters

  useEffect(() => {
    if (!songFileName) {
      navigate('/main');
      return;
    }
    setLoading(true);
    axios.get(`${import.meta.env.VITE_API_URL}/api/song/${songFileName}`) // Fetch song data and then set it
      .then(res => setSong(res.data.songData))
      .finally(() => setLoading(false));
  }, [songFileName, navigate]);

  useEffect(() => {
    socket.on('quitRehearsal', () => { // Listen for quit rehearsal event
      navigate('/main');
    });
    return () => {
      socket.off('quitRehearsal');
    };
  }, [navigate]);

  // container scroll effect
  useEffect(() => {
    if (isScrolling) {
      scrollIntervalRef.current = setInterval(() => {
        const el = scrollRef.current;
        if (el) {
          el.scrollTop = el.scrollTop + 1.5; // for phone scrolling, done by scrolling the container
        }
      }, 25);
    } else if (scrollIntervalRef.current) {
      clearInterval(scrollIntervalRef.current); // Clear the interval when scrolling stops.
      scrollIntervalRef.current = null;
    }
    return () => {
      if (scrollIntervalRef.current) {
        clearInterval(scrollIntervalRef.current);
        scrollIntervalRef.current = null;
      }
    };
  }, [isScrolling]);

  const handleQuit = () => {
    socket.emit('quitRehearsal'); // if quit rehearsal, emit the event to the server and move to main page.
    navigate('/main');
  };

  if (loading) return <div className="text-center mt-5">Loading song...</div>;
  if (!song) return <div className="text-center mt-5">Song not found.</div>;

  const showChords = !isSinger(); // Show chords only if the user is not a singer

//  botstrap syntax: minHight is for the container to take full height of the screen, position relative is for the button to be positioned correctly 
// /[\u0590-\u05FF]/ is a regex to check for Hebrew characters, then direction is set to right to left 
// WebkitOverflowScrolling is for scrolling on iOS devices to be smooth
  return (
    <div
      className="d-flex align-items-center justify-content-center"
      style={{
        minHeight: '100vh',
        background: '#f8f9fa',
        position: 'relative',
      }}
    >
      <div className="card shadow" style={{ width: '100%', maxWidth: 900, padding: 32 }}>
        <h1 className="text-center mb-4 fw-bold" style={{ fontSize: 36 }}>
          {songFileName.replace('.json', '')}
        </h1>
        <div
          ref={scrollRef}
          style={{
            maxHeight: '75vh',
            overflowY: 'auto',
            WebkitOverflowScrolling: 'touch',
            fontSize: 24,
            marginBottom: 16,
            width: '100%',
          }}
        >
          {song.map((line, idx) => (
            <div
              key={idx}
              style={{
                marginBottom: 24,
                direction: line[0]?.lyrics.match(/[\u0590-\u05FF]/) ? 'rtl' : 'ltr',
                display: 'flex',
                flexWrap: 'wrap',
                justifyContent: 'center',
              }}
            >
              {line.map((word, j) => (
                <span
                  key={j}
                  className="mx-2"
                  style={{
                    display: 'inline-block',
                    minWidth: 42,
                    textAlign: 'center',
                  }}
                >
                  {showChords && (
                    <div className="text-info fw-bold" style={{ height: 20, fontSize: 18 }}>
                      {word.chords ? word.chords : '\u00A0'}
                    </div>
                  )}
                  <div style={{ fontSize: 26 }}>
                    {word.lyrics}
                  </div>
                </span>
              ))}
            </div>
          ))}
        </div>
        {isAdmin() && (
          <div className="text-center mt-4">
            <button
              onClick={handleQuit}
              className="btn btn-danger btn-lg px-5"
            >
              Quit
            </button>
          </div>
        )}
      </div>
      <button
        onClick={() => setIsScrolling(sc => !sc)}
        className={`btn ${isScrolling ? 'btn-info' : 'btn-dark'} position-fixed`}
        style={{
          bottom: 32,
          left: 32,
          borderRadius: 32,
          fontSize: 20,
          boxShadow: '0 2px 8px #000',
          zIndex: 999,
        }}
      >
        {isScrolling ? 'Stop Scroll' : 'Start Scroll'}
      </button>
    </div>
  );
}

export default LivePage;
