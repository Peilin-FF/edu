import { useState, useMemo } from 'react';
import { getProgress, getAllAchievements } from '../../utils/progressStore';
import './Progress.css';

export default function ProgressPanel({ studentId, onClose }) {
  const [tab, setTab] = useState('overview'); // overview | achievements | history
  const progress = useMemo(() => getProgress(studentId), [studentId]);
  const achievements = useMemo(() => getAllAchievements(studentId), [studentId]);

  const totalPractice = progress.practiceHistory.length;
  const totalCorrect = progress.practiceHistory.reduce((s, h) => s + h.correct, 0);
  const totalAttempts = progress.practiceHistory.reduce((s, h) => s + h.total, 0);
  const overallAccuracy = totalAttempts > 0 ? Math.round((totalCorrect / totalAttempts) * 100) : 0;
  const unlockedCount = achievements.filter((a) => a.unlocked).length;

  // Knowledge point breakdown
  const kpMap = {};
  for (const h of progress.practiceHistory) {
    if (!kpMap[h.knowledgePoint]) kpMap[h.knowledgePoint] = { sessions: 0, correct: 0, total: 0 };
    kpMap[h.knowledgePoint].sessions += 1;
    kpMap[h.knowledgePoint].correct += h.correct;
    kpMap[h.knowledgePoint].total += h.total;
  }
  const kpList = Object.entries(kpMap)
    .map(([name, d]) => ({ name, ...d, accuracy: Math.round((d.correct / d.total) * 100) }))
    .sort((a, b) => a.accuracy - b.accuracy);

  return (
    <div className="prog-overlay" onClick={onClose}>
      <div className="prog-panel" onClick={(e) => e.stopPropagation()}>
        <button className="prog-close" onClick={onClose}>&#x2715;</button>
        <h2 className="prog-title">学习进度</h2>

        {/* Tabs */}
        <div className="prog-tabs">
          {[
            ['overview', '概览'],
            ['achievements', `成就 ${unlockedCount}/${achievements.length}`],
            ['history', '练习记录'],
          ].map(([key, label]) => (
            <button key={key} className={`prog-tab ${tab === key ? 'active' : ''}`} onClick={() => setTab(key)}>
              {label}
            </button>
          ))}
        </div>

        <div className="prog-body">
          {/* ===== Overview ===== */}
          {tab === 'overview' && (
            <>
              <div className="prog-stats">
                <div className="prog-stat">
                  <div className="prog-stat-value">{totalPractice}</div>
                  <div className="prog-stat-label">练习次数</div>
                </div>
                <div className="prog-stat">
                  <div className="prog-stat-value">{overallAccuracy}%</div>
                  <div className="prog-stat-label">总正确率</div>
                </div>
                <div className="prog-stat">
                  <div className="prog-stat-value">{progress.streak}</div>
                  <div className="prog-stat-label">连续天数</div>
                </div>
                <div className="prog-stat">
                  <div className="prog-stat-value">{progress.pptViewed.length}</div>
                  <div className="prog-stat-label">已看讲解</div>
                </div>
              </div>

              {kpList.length > 0 && (
                <>
                  <h3 className="prog-section-title">各知识点正确率</h3>
                  <div className="prog-kp-list">
                    {kpList.map((kp) => (
                      <div key={kp.name} className="prog-kp-item">
                        <span className="prog-kp-name">{kp.name}</span>
                        <div className="prog-kp-bar-wrap">
                          <div
                            className="prog-kp-bar"
                            style={{
                              width: `${kp.accuracy}%`,
                              background: kp.accuracy >= 80 ? '#059669' : kp.accuracy >= 50 ? '#d97706' : '#dc2626',
                            }}
                          />
                        </div>
                        <span className="prog-kp-pct">{kp.accuracy}%</span>
                        <span className="prog-kp-count">{kp.sessions}次</span>
                      </div>
                    ))}
                  </div>
                </>
              )}

              {totalPractice === 0 && (
                <div className="prog-empty">还没有练习记录，去做题吧！</div>
              )}
            </>
          )}

          {/* ===== Achievements ===== */}
          {tab === 'achievements' && (
            <div className="prog-achievements">
              {achievements.map((a) => (
                <div key={a.id} className={`prog-ach ${a.unlocked ? 'unlocked' : 'locked'}`}>
                  <span className="prog-ach-icon">{a.icon}</span>
                  <div className="prog-ach-info">
                    <div className="prog-ach-name">{a.name}</div>
                    <div className="prog-ach-desc">{a.desc}</div>
                  </div>
                  {a.unlocked && <span className="prog-ach-check">&#x2713;</span>}
                </div>
              ))}
            </div>
          )}

          {/* ===== History ===== */}
          {tab === 'history' && (
            <div className="prog-history">
              {progress.practiceHistory.length === 0 && (
                <div className="prog-empty">暂无练习记录</div>
              )}
              {[...progress.practiceHistory].reverse().map((h, i) => (
                <div key={i} className="prog-hist-item">
                  <span className="prog-hist-date">{h.date}</span>
                  <span className="prog-hist-kp">{h.knowledgePoint}</span>
                  <span className={`prog-hist-score ${h.correct === h.total ? 'perfect' : ''}`}>
                    {h.correct}/{h.total}
                  </span>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
