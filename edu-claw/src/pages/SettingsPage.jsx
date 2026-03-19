import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import {
  getGithubConfig, saveGithubConfig, clearGithubConfig,
  validateToken, ensureRepo, isGithubConnected,
} from '../utils/githubStore';
import { getCurrentAccount, bindGithub, unbindGithub } from '../utils/accountStore';
import './SettingsPage.css';

const TOKEN_URL = 'https://github.com/settings/tokens/new?scopes=repo,read:user,user:email,gist,workflow,write:packages,delete:packages,admin:org,admin:public_key,admin:repo_hook,admin:org_hook,notifications,delete_repo,write:discussion,admin:enterprise,audit_log,project,admin:gpg_key,admin:ssh_signing_key,codespace&description=EduClaw%20%E5%AD%A6%E4%B9%A0%E8%AE%B0%E5%BF%86';

export default function SettingsPage() {
  const [tokenInput, setTokenInput] = useState('');
  const [status, setStatus] = useState('idle'); // idle | validating | connected | error
  const [userInfo, setUserInfo] = useState(null); // { username, avatar, name }
  const [repoStatus, setRepoStatus] = useState(''); // '' | 'exists' | 'created'
  const [error, setError] = useState('');

  // Check existing config on mount
  useEffect(() => {
    const { token, username, avatar } = getGithubConfig();
    if (token && username) {
      setUserInfo({ username, avatar });
      setStatus('connected');
    }
  }, []);

  const handleConnect = async () => {
    const token = tokenInput.trim();
    if (!token) return;

    setStatus('validating');
    setError('');
    setRepoStatus('');

    try {
      const user = await validateToken(token);
      setUserInfo(user);

      // Ensure current student is set so repo name uses student ID
      const account = getCurrentAccount();
      if (account) {
        localStorage.setItem('edu_current_student', account.studentId);
      }

      const result = await ensureRepo(token, user.username);
      setRepoStatus(result.created ? 'created' : 'exists');

      // Save to global config (localStorage)
      saveGithubConfig(token, user.username, user.avatar);

      // Bind to current account (if logged in)
      console.log('[Settings] Binding GitHub to account:', account?.studentId || 'NOT LOGGED IN');
      if (account) {
        bindGithub(account.studentId, token, user.username, user.avatar);
      }

      setStatus('connected');
      setTokenInput('');
    } catch (e) {
      setError(e.message);
      setStatus('error');
    }
  };

  const handleDisconnect = () => {
    const account = getCurrentAccount();
    if (account) unbindGithub(account.studentId);
    clearGithubConfig();
    setStatus('idle');
    setUserInfo(null);
    setRepoStatus('');
    setTokenInput('');
  };

  return (
    <div className="app">
      <header className="header">
        <Link to="/courses" className="back-link">&larr; 返回课程</Link>
        <h1 className="title">数据安全设置</h1>
      </header>

      <div className="settings-container">
        <div className="settings-card">
          <h2 className="settings-card-title">GitHub 云端存储</h2>
          <p className="settings-card-desc">
            将你的学习数据安全地存储在你自己的 GitHub 私有仓库中。
            数据由你完全掌控，换设备也不会丢失。
          </p>

          {/* Connected state */}
          {status === 'connected' && userInfo && (
            <div className="settings-connected">
              <div className="settings-user">
                {userInfo.avatar && (
                  <img className="settings-avatar" src={userInfo.avatar} alt="" />
                )}
                <div>
                  <div className="settings-username">{userInfo.name || userInfo.username}</div>
                  <div className="settings-repo">
                    edu-memory-{userInfo.username}
                    <span className="settings-repo-badge">私有仓库</span>
                  </div>
                </div>
                <span className="settings-check">&#x2713; 已连接</span>
              </div>
              <button className="settings-disconnect" onClick={handleDisconnect}>
                断开连接
              </button>
            </div>
          )}

          {/* Setup / Error state */}
          {(status === 'idle' || status === 'error' || status === 'validating') && (
            <div className="settings-setup">
              <div className="settings-steps">
                <div className="settings-step">
                  <span className="settings-step-num">1</span>
                  <div>
                    <p className="settings-step-text">
                      点击下方按钮，在 GitHub 上创建一个访问令牌（Token）
                    </p>
                    <a
                      className="settings-step-link"
                      href={TOKEN_URL}
                      target="_blank"
                      rel="noopener noreferrer"
                    >
                      打开 GitHub Token 创建页面 &#x2197;
                    </a>
                  </div>
                </div>
                <div className="settings-step">
                  <span className="settings-step-num">2</span>
                  <p className="settings-step-text">
                    权限已自动全部勾选，直接滑到页面底部点击绿色的 <b>"Generate token"</b> 按钮即可
                  </p>
                </div>
                <div className="settings-step">
                  <span className="settings-step-num">3</span>
                  <p className="settings-step-text">
                    复制生成的 Token（以 <code>ghp_</code> 开头），粘贴到下面：
                  </p>
                </div>
              </div>

              <div className="settings-input-row">
                <input
                  className="settings-input"
                  type="password"
                  placeholder="粘贴你的 GitHub Token (ghp_...)"
                  value={tokenInput}
                  onChange={(e) => setTokenInput(e.target.value)}
                  onKeyDown={(e) => { if (e.key === 'Enter') handleConnect(); }}
                  disabled={status === 'validating'}
                />
                <button
                  className="settings-connect-btn"
                  onClick={handleConnect}
                  disabled={!tokenInput.trim() || status === 'validating'}
                >
                  {status === 'validating' ? '验证中...' : '验证并连接'}
                </button>
              </div>

              {error && <p className="settings-error">{error}</p>}

              {repoStatus === 'created' && (
                <p className="settings-success">私有仓库已自动创建！</p>
              )}
            </div>
          )}

          {/* Security info */}
          <div className="settings-security">
            <h3>&#x1F512; 安全说明</h3>
            <ul>
              <li>Token 仅保存在你的浏览器本地，不会上传到任何服务器</li>
              <li>学习数据存储在你自己的 GitHub 私有仓库，只有你能访问</li>
              <li>所有数据变更通过 git commit 记录，可追溯、可回滚</li>
              <li>你可以随时在 GitHub 上删除 Token 来撤销访问权限</li>
            </ul>
          </div>
        </div>
      </div>
    </div>
  );
}
