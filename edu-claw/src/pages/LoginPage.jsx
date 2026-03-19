import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { registerAccount, login, getCurrentAccount } from '../utils/accountStore';
import { saveGithubConfig } from '../utils/githubStore';

export default function LoginPage() {
  const [students, setStudents] = useState([]);
  const [studentId, setStudentId] = useState('');
  const [password, setPassword] = useState('');
  const [mode, setMode] = useState('login'); // login | register
  const [error, setError] = useState('');
  const navigate = useNavigate();

  // Load student roster for registration
  useEffect(() => {
    fetch('/data/students/index.json')
      .then((r) => r.json())
      .then((data) => setStudents(data.students));
  }, []);

  // Auto-login if already logged in
  // Auto-login: restore GitHub binding and redirect
  useEffect(() => {
    const account = getCurrentAccount();
    if (account) {
      const accounts = JSON.parse(localStorage.getItem('edu_accounts') || '{}');
      const github = accounts[account.studentId]?.github;
      if (github) {
        saveGithubConfig(github.token, github.username, github.avatar);
      }
      navigate('/student');
    }
  }, [navigate]);

  const handleLogin = () => {
    setError('');
    const result = login(studentId, password);
    if (!result) {
      setError('学号或密码错误');
      return;
    }
    // Restore GitHub config from account binding
    const accounts = JSON.parse(localStorage.getItem('edu_accounts') || '{}');
    const github = accounts[studentId]?.github;
    if (github) {
      saveGithubConfig(github.token, github.username, github.avatar);
    }
    navigate('/student');
  };

  const handleRegister = () => {
    setError('');
    if (!studentId || !password) {
      setError('请选择身份并设置密码');
      return;
    }
    if (password.length < 4) {
      setError('密码至少 4 位');
      return;
    }
    const student = students.find((s) => s.id === studentId);
    if (!student) {
      setError('请选择你的身份');
      return;
    }
    registerAccount(studentId, password, student.name, student.file);
    // Auto login after register
    login(studentId, password);
    navigate('/student');
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    if (mode === 'login') handleLogin();
    else handleRegister();
  };

  return (
    <div className="app">
      <div className="login-page">
        <div className="login-card">
          <div className="login-logo">&#x1F393;</div>
          <h1 className="login-title">EduClaw 智能学习</h1>
          <p className="login-subtitle">个性化 AI 学习伙伴</p>

          <div className="login-tabs">
            <button className={`login-tab ${mode === 'login' ? 'active' : ''}`} onClick={() => { setMode('login'); setError(''); }}>
              登录
            </button>
            <button className={`login-tab ${mode === 'register' ? 'active' : ''}`} onClick={() => { setMode('register'); setError(''); }}>
              注册
            </button>
          </div>

          <form className="login-form" onSubmit={handleSubmit}>
            {mode === 'register' ? (
              <select
                className="login-input login-select"
                value={studentId}
                onChange={(e) => setStudentId(e.target.value)}
              >
                <option value="">选择你的身份...</option>
                {students.map((s) => (
                  <option key={s.id} value={s.id}>{s.name}（{s.id}）</option>
                ))}
              </select>
            ) : (
              <input
                className="login-input"
                type="text"
                placeholder="请输入学号"
                value={studentId}
                onChange={(e) => setStudentId(e.target.value)}
                autoComplete="username"
              />
            )}

            <input
              className="login-input"
              type="password"
              placeholder={mode === 'register' ? '设置密码（至少4位）' : '请输入密码'}
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              autoComplete={mode === 'register' ? 'new-password' : 'current-password'}
            />

            {error && <p className="login-error">{error}</p>}

            <button className="login-btn" type="submit">
              {mode === 'login' ? '登录' : '注册'}
            </button>
          </form>

          <p className="login-hint">
            {mode === 'login'
              ? '首次使用？请先点击"注册"创建账号'
              : '密码用于保护你的学习数据，请牢记'}
          </p>
        </div>
      </div>
    </div>
  );
}
