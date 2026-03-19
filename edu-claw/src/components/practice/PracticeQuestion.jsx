import { useState } from 'react';

export default function PracticeQuestion({ q, userAnswer, isSubmitted, onAnswer, onSubmit }) {
  const isCorrect = isSubmitted && normalizeAnswer(userAnswer) === normalizeAnswer(q.answer);
  const isChoice = q.type === '单选题' || q.type === '多选题';
  const isJudge = q.type === '判断题';

  return (
    <div className="prac-question">
      <div className="prac-q-meta">
        <span className="prac-q-type">{q.type}</span>
        <span className={`prac-q-diff prac-q-diff--${q.difficulty === '基础' ? 'easy' : q.difficulty === '中等' ? 'mid' : 'hard'}`}>
          {q.difficulty}
        </span>
      </div>

      <div className="prac-q-text">{q.question}</div>

      {/* Choice questions */}
      {isChoice && q.options && (
        <div className="prac-q-options">
          {Object.entries(q.options).map(([key, text]) => {
            const selected = q.type === '多选题'
              ? userAnswer.includes(key)
              : userAnswer === key;
            let cls = 'prac-q-opt';
            if (selected) cls += ' selected';
            if (isSubmitted) {
              if (q.answer.includes(key)) cls += ' correct';
              else if (selected) cls += ' wrong';
            }
            return (
              <button
                key={key}
                className={cls}
                disabled={isSubmitted}
                onClick={() => {
                  if (q.type === '多选题') {
                    const cur = userAnswer ? userAnswer.split('') : [];
                    const next = cur.includes(key) ? cur.filter((c) => c !== key) : [...cur, key];
                    onAnswer(next.sort().join(''));
                  } else {
                    onAnswer(key);
                  }
                }}
              >
                <span className="prac-q-opt-key">{key}</span>
                <span>{text}</span>
              </button>
            );
          })}
        </div>
      )}

      {/* True/False */}
      {isJudge && (
        <div className="prac-q-judge">
          {['对', '错'].map((val) => {
            let cls = 'prac-q-judge-btn';
            if (userAnswer === val) cls += ' selected';
            if (isSubmitted) {
              if (q.answer === val) cls += ' correct';
              else if (userAnswer === val) cls += ' wrong';
            }
            return (
              <button key={val} className={cls} disabled={isSubmitted} onClick={() => onAnswer(val)}>
                {val === '对' ? '\u2713 对' : '\u2717 错'}
              </button>
            );
          })}
        </div>
      )}

      {/* Fill-in-the-blank */}
      {!isChoice && !isJudge && (
        <div className="prac-q-fill">
          <input
            className={`prac-q-input ${isSubmitted ? (isCorrect ? 'correct' : 'wrong') : ''}`}
            type="text"
            placeholder="请输入答案..."
            value={userAnswer}
            disabled={isSubmitted}
            onChange={(e) => onAnswer(e.target.value)}
            onKeyDown={(e) => { if (e.key === 'Enter' && userAnswer) onSubmit(); }}
          />
          {isSubmitted && !isCorrect && (
            <div className="prac-q-correct-ans">正确答案：{q.answer}</div>
          )}
        </div>
      )}

      {/* Submit / Result */}
      {!isSubmitted && (
        <button
          className="prac-submit-btn"
          disabled={!userAnswer}
          onClick={onSubmit}
        >
          提交答案
        </button>
      )}

      {isSubmitted && (
        <div className={`prac-feedback ${isCorrect ? 'correct' : 'wrong'}`}>
          <div className="prac-feedback-tag">
            {isCorrect ? '\u2713 回答正确！' : '\u2717 回答错误'}
          </div>
          <div className="prac-explanation">
            <strong>解析：</strong>{q.explanation}
          </div>
        </div>
      )}
    </div>
  );
}

function normalizeAnswer(a) {
  if (!a) return '';
  return String(a).trim().toUpperCase().split('').sort().join('');
}
