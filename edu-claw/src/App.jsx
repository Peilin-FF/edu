import { Routes, Route } from 'react-router-dom';
import LandingPage from './pages/LandingPage';
import LoginPage from './pages/LoginPage';
import CoursePage from './pages/CoursePage';
import StudentPortal from './pages/StudentPortal';
import TeacherCoursePage from './pages/TeacherCoursePage';
import TeacherPortal from './pages/TeacherPortal';
import SettingsPage from './pages/SettingsPage';
import './App.css';

export default function App() {
  return (
    <Routes>
      <Route path="/" element={<LandingPage />} />
      <Route path="/login" element={<LoginPage />} />
      <Route path="/courses" element={<CoursePage />} />
      <Route path="/student/:courseId" element={<StudentPortal />} />
      <Route path="/teacher-courses" element={<TeacherCoursePage />} />
      <Route path="/teacher/:courseId" element={<TeacherPortal />} />
      <Route path="/settings" element={<SettingsPage />} />
    </Routes>
  );
}
