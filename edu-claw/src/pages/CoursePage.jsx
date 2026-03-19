import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { getCurrentAccount, logout } from '../utils/accountStore';

export default function CoursePage() {
  const [courses, setCourses] = useState([]);
  const [account, setAccount] = useState(null);
  const navigate = useNavigate();

  useEffect(() => {
    const acc = getCurrentAccount();
    if (!acc) { navigate('/login'); return; }
    setAccount(acc);

    fetch('/data/courses/index.json')
      .then((r) => r.json())
      .then((data) => setCourses(data.courses));
  }, [navigate]);

  const handleLogout = () => {
    logout();
    navigate('/login');
  };

  return (
    <div className="app">
      <header className="header">
        <div className="header-left">
          <button className="switch-btn" onClick={handleLogout}>退出登录</button>
          <a href="/settings" className="switch-btn">设置</a>
        </div>
        <div className="header-center">
          <h1 className="title">我的课程</h1>
          <div className="subtitle">{account?.name} 同学，选择一门课程开始学习</div>
        </div>
      </header>

      <div className="course-grid">
        {courses.map((c) => (
          <div
            key={c.id}
            className="course-card"
            onClick={() => navigate(`/student/${c.id}`)}
          >
            <div className="course-cover-wrap">
              <img className="course-cover" src={c.cover} alt={c.name} />
            </div>
            <div className="course-info">
              <h3 className="course-name">{c.name}</h3>
              <p className="course-author">{c.author}</p>
              <p className="course-desc">{c.description}</p>
              <span className="course-enter">进入学习 &rarr;</span>
            </div>
          </div>
        ))}

        {/* Placeholder for adding courses */}
        <div className="course-card course-card--add">
          <div className="course-add-icon">+</div>
          <p className="course-add-text">更多课程即将开放</p>
        </div>
      </div>
    </div>
  );
}
