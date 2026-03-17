import { Link } from 'react-router-dom';

export default function LandingPage() {
  return (
    <div className="landing">
      <div className="landing-header">
        <h1 className="landing-title">EduClaw 知识图谱</h1>
        <p className="landing-subtitle">物联网技术及应用 - 个性化学习分析平台</p>
      </div>
      <div className="portal-cards">
        <Link to="/student" className="portal-card student-card">
          <div className="portal-icon">🎓</div>
          <h2>学生端</h2>
          <p>查看个人知识掌握情况，追踪薄弱知识点，回顾错题解析</p>
        </Link>
        <Link to="/teacher" className="portal-card teacher-card">
          <div className="portal-icon">📊</div>
          <h2>教师端</h2>
          <p>总览班级知识掌握全貌，定位共性薄弱环节，精准教学干预</p>
        </Link>
      </div>
    </div>
  );
}
