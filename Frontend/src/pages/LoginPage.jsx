import React, { useState } from 'react';
import axios from 'axios';
import { useNavigate } from 'react-router-dom';
import { Wordmark } from '../brand';
import { useSlowRequest } from '../wake';
import { reconnectWithFreshToken } from '../socket';

function LoginPage() {
  const [form, setForm] = useState({ username: '', password: '' });
  // socket.js sends people here with ?expired=1 when their token is rejected, so
  // a silent logout reads as an explanation rather than a mystery.
  const [error, setError] = useState(
    new URLSearchParams(window.location.search).has('expired')
      ? 'Your session expired — please log in again.'
      : ''
  );
  const { busy, slow, run } = useSlowRequest();
  const navigate = useNavigate();

  const handleChange = e => {
    const { name, value } = e.target;
    setForm(prev => ({ ...prev, [name]: value }));
  };

  const handleSubmit = async e => {
    e.preventDefault();
    setError('');
    try {
      const res = await run(() =>
        axios.post(`${import.meta.env.VITE_API_URL}/api/auth/login`, form));
      localStorage.setItem('token', res.data.token);
      localStorage.setItem('user', JSON.stringify(res.data.user)); // Store user data in localStorage
      // The socket may be sitting inactive after an earlier auth rejection, and
      // Socket.IO won't retry that on its own — reconnect with the new token or
      // every action on the next page would silently do nothing.
      reconnectWithFreshToken();
      navigate('/main');
    } catch (err) {
      setError(err.response?.data?.error || "Login failed");
    }
  };

  return (
    <div className="d-flex align-items-center justify-content-center" style={{ minHeight: '100vh', background: '#f8f9fa' }}>
      <div className="card shadow" style={{ width: 400, padding: 24 }}>
        <Wordmark />
        <form onSubmit={handleSubmit}>
          <h2 className="text-center mb-4">Login</h2>
          <div className="mb-3">
            <input
              name="username"
              className="form-control"
              placeholder="Username"
              value={form.username}
              onChange={handleChange}
              required
            />
          </div>
          <div className="mb-3">
            <input
              name="password"
              type="password"
              className="form-control"
              placeholder="Password"
              value={form.password}
              onChange={handleChange}
              required
            />
          </div>
          <button type="submit" className="btn btn-primary w-100 mb-2" disabled={busy}>
            {busy ? 'Logging in…' : 'Login'}
          </button>
          {slow && (
            <div className="alert alert-info mt-2 py-2" style={{ fontSize: 14 }}>
              Waking the server up. It sleeps when nobody is playing, so the
              first request of the day takes up to a minute.
            </div>
          )}
          {error && <div className="alert alert-danger mt-2">{error}</div>}
          <div className="text-center mt-3">
            No account? <a href="/signup">Sign Up</a>
          </div>
          <div className="text-center mt-2">
            <span style={{ fontSize: 14 }}>Admin? <a href="/signup-admin">Sign Up as Admin</a></span>
          </div>
        </form>
      </div>
    </div>
  );
}

export default LoginPage;
