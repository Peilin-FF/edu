import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { registerAccount, login, getCurrentAccount, accountExists } from '../utils/accountStore';
import { saveGithubConfig } from '../utils/githubStore';

export default function LoginPage() {
  const [studentId, setStudentId] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const navigate = useNavigate();

  // Auto-register all students with default password on first load
  useEffect(() => {
    fetch('/data/courses/sensor/students/index.json')
      .then((r) => r.json())
      .then((data) => {
        for (const s of data.students) {
          if (!accountExists(s.id)) {
            registerAccount(s.id, '1234', s.name, s.file || null);
          }
        }
      });
  }, []);

  // Auto-login if already logged in
  useEffect(() => {
    const account = getCurrentAccount();
    if (account) {
      const accounts = JSON.parse(localStorage.getItem('edu_accounts') || '{}');
      const github = accounts[account.studentId]?.github;
      if (github) {
        saveGithubConfig(github.token, github.username, github.avatar);
      }
      navigate('/courses');
    }
  }, [navigate]);

  const handleLogin = () => {
    setError('');
    const result = login(studentId, password);
    if (!result) {
      setError('学号或密码错误（默认密码：1234）');
      return;
    }
    const accounts = JSON.parse(localStorage.getItem('edu_accounts') || '{}');
    const github = accounts[studentId]?.github;
    if (github) {
      saveGithubConfig(github.token, github.username, github.avatar);
    }
    navigate('/courses');
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    handleLogin();
  };

  return (
    <div className="app">
      <div className="login-page">
        <div className="login-card">
          <div className="login-logo">&#x1F393;</div>
          <h1 className="login-title">EduClaw 智能学习</h1>
          <p className="login-subtitle">个性化 AI 学习伙伴</p>

          <form className="login-form" onSubmit={handleSubmit}>
            <input
              className="login-input"
              type="text"
              placeholder="请输入学号"
              value={studentId}
              onChange={(e) => setStudentId(e.target.value)}
              autoComplete="username"
            />
            <input
              className="login-input"
              type="password"
              placeholder="请输入密码（默认 1234）"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              autoComplete="current-password"
            />

            {error && <p className="login-error">{error}</p>}

            <button className="login-btn" type="submit">登录</button>
          </form>

          <p className="login-hint">所有同学已预注册，直接输入学号和密码即可登录</p>
        </div>
      </div>
    </div>
  );
}
