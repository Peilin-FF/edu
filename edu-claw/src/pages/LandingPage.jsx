import { Link } from 'react-router-dom';

export default function LandingPage() {
  return (
    <div className="landing">
      <div className="landing-header">
        <h1 className="landing-title">EduClaw</h1>
        <p className="landing-subtitle">AI 赋能的个性化学习分析平台</p>
      </div>
      <div className="portal-cards">
        <Link to="/login" className="portal-card student-card">
          <div className="portal-icon">&#x1F393;</div>
          <h2>学生端</h2>
          <p>选择课程，查看知识掌握情况，AI 陪伴式学习</p>
        </Link>
        <Link to="/teacher-courses" className="portal-card teacher-card">
          <div className="portal-icon">&#x1F4CA;</div>
          <h2>教师端</h2>
          <p>选择课程和班级，总览知识掌握全貌，精准教学干预</p>
        </Link>
      </div>
    </div>
  );
}
