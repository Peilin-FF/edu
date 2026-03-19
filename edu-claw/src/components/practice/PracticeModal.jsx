import { useState, useEffect, useCallback, useRef } from 'react';
import { generatePractice } from '../../utils/llmClient';
import { recordPractice } from '../../utils/progressStore';
import PracticeQuestion from './PracticeQuestion';
import './Practice.css';

export default function PracticeModal({ question, studentId, onClose, onNewAchievements }) {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [currentIdx, setCurrentIdx] = useState(0);
  const [answers, setAnswers] = useState({});     // { questionId: userAnswer }
  const [submitted, setSubmitted] = useState({});  // { questionId: true }
  const [score, setScore] = useState(null);        // final score after all submitted

  const fetchPractice = useCallback(async () => {
    setLoading(true);
    setError(null);
    setAnswers({});
    setSubmitted({});
    setScore(null);
    setCurrentIdx(0);
    recordedRef.current = false;
    try {
      const result = await generatePractice(question);
      setData(result);
    } catch (e) {
      setError(e.message);
    } finally {
      setLoading(false);
    }
  }, [question]);

  useEffect(() => {
    fetchPractice();
  }, [fetchPractice]);

  useEffect(() => {
    const handleKey = (e) => {
      if (e.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', handleKey);
    return () => window.removeEventListener('keydown', handleKey);
  }, [onClose]);

  const currentQ = data?.questions?.[currentIdx];
  const totalQ = data?.questions?.length || 0;
  const allSubmitted = data?.questions?.every((q) => submitted[q.id]);

  const recordedRef = useRef(false);

  // Calculate score when all submitted & record progress
  useEffect(() => {
    if (!data || !allSubmitted) return;
    const correct = data.questions.filter(
      (q) => normalizeAnswer(answers[q.id]) === normalizeAnswer(q.answer)
    ).length;
    setScore(correct);

    if (!recordedRef.current && studentId) {
      recordedRef.current = true;
      const kp = data.knowledgePoint || question['知识点'];
      const before = JSON.parse(localStorage.getItem('edu_progress') || '{}')[studentId]?.achievements?.length || 0;
      recordPractice(studentId, kp, data.questions.length, correct);
      const after = JSON.parse(localStorage.getItem('edu_progress') || '{}')[studentId]?.achievements?.length || 0;
      if (after > before && onNewAchievements) {
        const achs = JSON.parse(localStorage.getItem('edu_progress'))[studentId].achievements;
        onNewAchievements(achs.slice(before));
      }
    }
  }, [allSubmitted, data, answers, studentId, question, onNewAchievements]);

  const handleAnswer = (qId, value) => {
    if (submitted[qId]) return;
    setAnswers((prev) => ({ ...prev, [qId]: value }));
  };

  const handleSubmit = (qId) => {
    setSubmitted((prev) => ({ ...prev, [qId]: true }));
  };

  return (
    <div className="prac-overlay" onClick={onClose}>
      <div className="prac-modal" onClick={(e) => e.stopPropagation()}>
        <button className="prac-close" onClick={onClose}>&#x2715;</button>

        <div className="prac-header">
          <h2>强化练习</h2>
          <span className="prac-kp">{data?.knowledgePoint || question['知识点']}</span>
        </div>

        {loading && (
          <div className="prac-loading">
            <div className="prac-spinner" />
            <p>AI 正在出题中...</p>
          </div>
        )}

        {error && (
          <div className="prac-error">
            <p>出题失败：{error}</p>
            <button className="prac-retry-btn" onClick={fetchPractice}>重试</button>
          </div>
        )}

        {data && !loading && !error && (
          <>
            <div className="prac-tabs">
              {data.questions.map((q, i) => (
                <button
                  key={q.id}
                  className={`prac-tab ${i === currentIdx ? 'active' : ''} ${submitted[q.id] ? (normalizeAnswer(answers[q.id]) === normalizeAnswer(q.answer) ? 'correct' : 'wrong') : ''}`}
                  onClick={() => setCurrentIdx(i)}
                >
                  <span className="prac-tab-num">第{q.id}题</span>
                  <span className="prac-tab-diff">{q.difficulty}</span>
                </button>
              ))}
            </div>

            <div className="prac-body">
              {currentQ && (
                <PracticeQuestion
                  q={currentQ}
                  userAnswer={answers[currentQ.id] || ''}
                  isSubmitted={!!submitted[currentQ.id]}
                  onAnswer={(val) => handleAnswer(currentQ.id, val)}
                  onSubmit={() => handleSubmit(currentQ.id)}
                />
              )}
            </div>

            <div className="prac-footer">
              <button
                className="prac-nav-btn"
                disabled={currentIdx <= 0}
                onClick={() => setCurrentIdx((v) => v - 1)}
              >
                &#x25C0; 上一题
              </button>
              <span className="prac-progress">{currentIdx + 1} / {totalQ}</span>
              <button
                className="prac-nav-btn"
                disabled={currentIdx >= totalQ - 1}
                onClick={() => setCurrentIdx((v) => v + 1)}
              >
                下一题 &#x25B6;
              </button>
            </div>

            {score !== null && (
              <div className="prac-result">
                <div className="prac-result-icon">{score === totalQ ? '\uD83C\uDF89' : score >= 2 ? '\uD83D\uDC4D' : '\uD83D\uDCAA'}</div>
                <div className="prac-result-text">
                  {score === totalQ
                    ? `全部正确！你已经掌握了这个知识点！`
                    : `答对 ${score}/${totalQ} 题，${score >= 2 ? '掌握得不错，再巩固一下！' : '别灰心，回顾讲解后再试试！'}`
                  }
                </div>
                <button className="prac-retry-btn" onClick={fetchPractice}>再练一组</button>
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
}

function normalizeAnswer(a) {
  if (!a) return '';
  return String(a).trim().toUpperCase().split('').sort().join('');
}
