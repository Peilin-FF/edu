import { Routes, Route } from 'react-router-dom';
import LandingPage from './pages/LandingPage';
import StudentPortal from './pages/StudentPortal';
import TeacherPortal from './pages/TeacherPortal';
import './App.css';

export default function App() {
  return (
    <Routes>
      <Route path="/" element={<LandingPage />} />
      <Route path="/student" element={<StudentPortal />} />
      <Route path="/teacher" element={<TeacherPortal />} />
    </Routes>
  );
}
