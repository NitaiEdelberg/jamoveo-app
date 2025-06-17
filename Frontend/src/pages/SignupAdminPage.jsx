import React, { useState } from 'react';
import axios from 'axios';
import { useNavigate } from 'react-router-dom';

function SignupAdminPage() {
  const [form, setForm] = useState({ username: '', password: '', instrument: '' });
  const [error, setError] = useState('');
  const navigate = useNavigate();

  const handleChange = e => {
    const { name, value } = e.target;
    setForm(prev => ({ ...prev, [name]: value }));
  };

  const handleSubmit = async e => {
    e.preventDefault();
    setError('');
    try {
      await axios.post('http://localhost:3001/api/auth/signup', {
        ...form,
        isAdmin: true
      });
      navigate('/login');
    } catch (err) {
      setError(err.response?.data?.error || "Signup failed");
    }
  };

  return (
    <div className="d-flex align-items-center justify-content-center" style={{ minHeight: '100vh', background: '#f8f9fa' }}>
      <div className="card shadow" style={{ width: 400, padding: 24 }}>
        <form onSubmit={handleSubmit}>
          <h2 className="text-center mb-4">Sign Up as Admin</h2>
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
          <div className="mb-3">
            <select
              name="instrument"
              className="form-select"
              value={form.instrument}
              onChange={handleChange}
              required
            >
              <option value="">Choose Instrument</option>
              <option value="guitar">Guitar</option>
              <option value="drums">Drums</option>
              <option value="bass">Bass</option>
              <option value="piano">Piano</option>
              <option value="vocals">Vocals</option>
              <option value="saxophone">Saxophone</option>
            </select>
          </div>
          <button type="submit" className="btn btn-danger w-100">Register as Admin</button>
          {error && <div className="alert alert-danger mt-3">{error}</div>}
        </form>
      </div>
    </div>
  );
}

export default SignupAdminPage;
