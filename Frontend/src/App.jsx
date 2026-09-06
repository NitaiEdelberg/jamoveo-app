import { useEffect } from 'react';
import { BrowserRouter, Routes, Route } from "react-router-dom";
import { wakeBackend } from './wake';
import SignupPage from './pages/SignupPage';
import LoginPage from './pages/LoginPage';
import MainPage from './pages/MainPage';
import ResultsPage from './pages/ResultsPage';
import LivePage from './pages/LivePage';
import SignupAdminPage from './pages/SignupAdminPage';
import JoinPage from './pages/JoinPage';

function App() {
  // Start the backend booting as early as we possibly can. On a cold Render
  // instance this buys back most of the ~50s spin-up, because it runs while the
  // user is still reading the login form rather than after they submit it.
  useEffect(() => { wakeBackend(); }, []);

  return (
    <BrowserRouter>
      <Routes>
        <Route path="/signup" element={<SignupPage />} />
        <Route path="/login" element={<LoginPage />} />
        <Route path="/main" element={<MainPage />} />
        <Route path="/results" element={<ResultsPage />} />
        <Route path="/live" element={<LivePage />} />
        <Route path="/join/:code" element={<JoinPage />} />
        <Route path="*" element={<LoginPage />} />
        <Route path="/signup-admin" element={<SignupAdminPage />} />
      </Routes>
    </BrowserRouter>
  );
}

export default App;
