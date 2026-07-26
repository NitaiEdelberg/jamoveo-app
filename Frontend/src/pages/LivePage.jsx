import React, { useEffect, useState, useRef } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import axios from 'axios';
import socket from '../socket';

const isSinger = () => {
  const userStr = localStorage.getItem('user');
  if (!userStr) return false;
  try { return JSON.parse(userStr).instrument === 'vocals'; } catch { return false; }
};

function LivePage() {
  const navigate = useNavigate();
  const location = useLocation();
  const [song, setSong] = useState(null);
  const [meta, setMeta] = useState(null);
  const [loading, setLoading] = useState(true);
  const [isLeader, setIsLeader] = useState(false);

  // Auto-scroll: everyone controls their own view; the leader can also push a
  // synced scroll to the whole band.
  const [isScrolling, setIsScrolling] = useState(false);
  const [speed, setSpeed] = useState(2); // px per tick (1 slow … 6 fast)
  const [syncOn, setSyncOn] = useState(false);
  const scrollIntervalRef = useRef(null);
  const scrollRef = useRef(null);

  const params = new URLSearchParams(location.search);
  const songFileName = params.get('song');
  const roomId = params.get('room') || localStorage.getItem('roomId') || '';

  useEffect(() => {
    if (!songFileName) {
      navigate('/main');
      return;
    }
    setLoading(true);
    axios.get(`${import.meta.env.VITE_API_URL}/api/song/${songFileName}`)
      .then((res) => { setSong(res.data.songData); setMeta(res.data.meta || null); })
      .finally(() => setLoading(false));
  }, [songFileName, navigate]);

  // Make sure this socket is in the room (covers a refresh / direct navigation),
  // and react to leader-driven events.
  useEffect(() => {
    if (roomId) socket.emit('joinRehearsal', { roomId });

    const onRoomState = (state) => {
      setIsLeader(!!state.isLeader);
      if (state.scroll && !state.isLeader) {
        setSpeed(state.scroll.speed || 2);
        setIsScrolling(!!state.scroll.on);
      }
    };
    const onScrollSync = (sc) => { // only non-leaders receive this
      setSpeed(sc.speed || 2);
      setIsScrolling(!!sc.on);
    };
    const onQuit = () => navigate('/main');

    socket.on('roomState', onRoomState);
    socket.on('scrollSync', onScrollSync);
    socket.on('quitRehearsal', onQuit);
    return () => {
      socket.off('roomState', onRoomState);
      socket.off('scrollSync', onScrollSync);
      socket.off('quitRehearsal', onQuit);
    };
  }, [roomId, navigate]);

  // The actual auto-scroll loop, restarted whenever on/off or speed changes.
  useEffect(() => {
    if (isScrolling) {
      scrollIntervalRef.current = setInterval(() => {
        const el = scrollRef.current;
        if (el) el.scrollTop += speed;
      }, 25);
    }
    return () => {
      if (scrollIntervalRef.current) {
        clearInterval(scrollIntervalRef.current);
        scrollIntervalRef.current = null;
      }
    };
  }, [isScrolling, speed]);

  // When the leader has "scroll everyone with me" on, broadcast changes.
  useEffect(() => {
    if (isLeader && syncOn) socket.emit('scrollControl', { on: isScrolling, speed });
  }, [isLeader, syncOn, isScrolling, speed]);

  const handleQuit = () => {
    socket.emit('quitRehearsal');
    navigate('/main');
  };

  if (loading) return <div className="text-center mt-5">Loading song...</div>;
  if (!song) return <div className="text-center mt-5">Song not found.</div>;

  const showChords = !isSinger();

  return (
    <div
      className="d-flex align-items-center justify-content-center"
      style={{ minHeight: '100vh', background: '#f8f9fa', position: 'relative' }}
    >
      <div className="card shadow" style={{ width: '100%', maxWidth: 900, padding: 32 }}>
        <h1 className="text-center mb-1 fw-bold" style={{ fontSize: 36 }}>
          {meta?.title || songFileName.replace('.json', '')}
        </h1>
        {meta?.artist && (
          <div className="text-center text-muted mb-3" style={{ fontSize: 18 }}>{meta.artist}</div>
        )}

        <div
          ref={scrollRef}
          style={{
            maxHeight: '70vh',
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
                direction:
                  meta?.language === 'he' || line.some((w) => /[֐-׿]/.test(w.lyrics || ''))
                    ? 'rtl'
                    : 'ltr',
                display: 'flex',
                flexWrap: 'wrap',
                justifyContent: 'center',
              }}
            >
              {line.map((word, j) => (
                <span key={j} className="mx-2" style={{ display: 'inline-block', minWidth: 42, textAlign: 'center' }}>
                  {showChords && (
                    <div className="text-info fw-bold" style={{ height: 20, fontSize: 18 }}>
                      {word.chords ? word.chords : ' '}
                    </div>
                  )}
                  <div style={{ fontSize: 26 }}>{word.lyrics}</div>
                </span>
              ))}
            </div>
          ))}
        </div>

        {/* Scroll controls — available to everyone for their own screen. */}
        <div className="d-flex flex-wrap align-items-center justify-content-center gap-3 border-top pt-3">
          <button
            onClick={() => setIsScrolling((s) => !s)}
            className={`btn ${isScrolling ? 'btn-info' : 'btn-dark'} px-4`}
          >
            {isScrolling ? '⏸ Stop scroll' : '▶ Auto-scroll'}
          </button>
          <div className="d-flex align-items-center gap-2" style={{ minWidth: 180 }}>
            <span className="small text-muted">Slow</span>
            <input
              type="range"
              className="form-range"
              min="1"
              max="6"
              step="1"
              value={speed}
              onChange={(e) => setSpeed(Number(e.target.value))}
              style={{ width: 120 }}
              aria-label="Scroll speed"
            />
            <span className="small text-muted">Fast</span>
          </div>
          {isLeader && (
            <div className="form-check form-switch">
              <input
                className="form-check-input"
                type="checkbox"
                id="syncScroll"
                checked={syncOn}
                onChange={(e) => setSyncOn(e.target.checked)}
              />
              <label className="form-check-label small" htmlFor="syncScroll">Scroll everyone with me</label>
            </div>
          )}
        </div>

        {isLeader && (
          <div className="text-center mt-3">
            <button onClick={handleQuit} className="btn btn-danger btn-lg px-5">Quit</button>
          </div>
        )}
      </div>
    </div>
  );
}

export default LivePage;
