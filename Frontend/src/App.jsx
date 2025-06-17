import { BrowserRouter, Routes, Route } from "react-router-dom";
import SignupPage from './pages/SignupPage';
import LoginPage from './pages/LoginPage';
import MainPage from './pages/MainPage';
import ResultsPage from './pages/ResultsPage';
import LivePage from './pages/LivePage';
import SignupAdminPage from './pages/SignupAdminPage';

function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/signup" element={<SignupPage />} />
        <Route path="/login" element={<LoginPage />} />
        <Route path="/main" element={<MainPage />} />
        <Route path="/results" element={<ResultsPage />} />
        <Route path="/live" element={<LivePage />} />
        <Route path="*" element={<LoginPage />} />
        <Route path="/signup-admin" element={<SignupAdminPage />} />
      </Routes>
    </BrowserRouter>
  );
}

export default App;
