import { Routes, Route } from 'react-router-dom';
import LandingPage from './pages/LandingPage';
import LoginPage from './pages/LoginPage';
import StudentPortal from './pages/StudentPortal';
import TeacherPortal from './pages/TeacherPortal';
import SettingsPage from './pages/SettingsPage';
import './App.css';

export default function App() {
  return (
    <Routes>
      <Route path="/" element={<LandingPage />} />
      <Route path="/login" element={<LoginPage />} />
      <Route path="/student" element={<StudentPortal />} />
      <Route path="/teacher" element={<TeacherPortal />} />
      <Route path="/settings" element={<SettingsPage />} />
    </Routes>
  );
}
