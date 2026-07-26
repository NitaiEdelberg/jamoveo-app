import { useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';

// Deep-link target for a shared invite link, e.g. /join/AB7K. It remembers the
// room code, then sends the user to log in (if needed) or straight to the main
// page, which auto-joins that room.
function JoinPage() {
  const { code } = useParams();
  const navigate = useNavigate();

  useEffect(() => {
    const room = String(code || '').toUpperCase().trim();
    if (room) localStorage.setItem('roomId', room);
    navigate(localStorage.getItem('token') ? '/main' : '/login', { replace: true });
  }, [code, navigate]);

  return <div className="text-center mt-5">Joining room {String(code || '').toUpperCase()}…</div>;
}

export default JoinPage;
