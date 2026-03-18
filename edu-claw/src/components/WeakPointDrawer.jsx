export default function WeakPointDrawer({ node, onClose, onPptRequest }) {
  const pct = Math.round(node.mastery * 100);

  return (
    <div className="drawer-overlay" onClick={onClose}>
      <div className="drawer" onClick={e => e.stopPropagation()}>
        <div className="drawer-header">
          <div>
            <h3>{node.name}</h3>
            <span className={`mastery-badge ${pct < 60 ? 'weak' : pct < 80 ? 'mid' : 'good'}`}>
              掌握度 {pct}%
            </span>
          </div>
          <button className="drawer-close" onClick={onClose}>×</button>
        </div>

        <div className="drawer-body">
          <h4>错题回顾 ({node.wrongQuestions.length}题)</h4>
          {node.wrongQuestions.map((q, i) => (
            <div key={i} className="wrong-card">
              <div className="wrong-card-head">
                <span className="q-type">{q['题型']}</span>
                <span className="q-score">{q['得分']}/{q['满分']}分</span>
              </div>
              <div className="q-text">{q['题目']}</div>
              {q['选项'] && (
                <div className="q-options">
                  {Object.entries(q['选项']).map(([k, v]) => (
                    <div
                      key={k}
                      className={`q-opt ${k === q['正确答案'] ? 'correct' : ''} ${q['学生答案']?.includes(k) && k !== q['正确答案'] ? 'wrong' : ''}`}
                    >
                      {k}. {v}
                    </div>
                  ))}
                </div>
              )}
              <div className="q-answers">
                <span className="q-stu">你的答案：<b>{q['学生答案']}</b></span>
                <span className="q-cor">正确答案：<b>{q['正确答案']}</b></span>
              </div>
              {q['扣分原因'] && q['扣分原因'] !== '无' && (
                <div className="q-reason">{q['扣分原因']}</div>
              )}
              {onPptRequest && (
                <button className="ppt-btn" onClick={() => onPptRequest(q)}>
                  查看 PPT 讲解
                </button>
              )}
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
