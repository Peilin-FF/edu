export default function NodeDetailPanel({ node, onClose }) {
  const pct = Math.round(node.avgMastery * 100);

  return (
    <div className="drawer-overlay" onClick={onClose}>
      <div className="drawer drawer-wide" onClick={e => e.stopPropagation()}>
        <div className="drawer-header">
          <div>
            <h3>{node.name}</h3>
            <span className={`mastery-badge ${pct < 60 ? 'weak' : pct < 80 ? 'mid' : 'good'}`}>
              班级平均掌握度 {pct}%
            </span>
            <span className="student-count">{node.studentCount}人参与</span>
          </div>
          <button className="drawer-close" onClick={onClose}>×</button>
        </div>

        <div className="drawer-body">
          <table className="detail-table">
            <thead>
              <tr>
                <th>姓名</th>
                <th>学号</th>
                <th>掌握度</th>
                <th>得分/满分</th>
                <th>错题数</th>
              </tr>
            </thead>
            <tbody>
              {node.students.map(s => (
                <tr key={s.studentId} className={s.mastery < 0.6 ? 'row-weak' : ''}>
                  <td>{s.name}</td>
                  <td>{s.studentId}</td>
                  <td>
                    <div className="mastery-bar-wrap">
                      <div className="mastery-bar" style={{ width: `${Math.round(s.mastery * 100)}%` }} />
                      <span>{Math.round(s.mastery * 100)}%</span>
                    </div>
                  </td>
                  <td>{s.earned}/{s.possible}</td>
                  <td>{s.wrongQuestions.length}</td>
                </tr>
              ))}
            </tbody>
          </table>

          {node.students.some(s => s.wrongQuestions.length > 0) && (
            <div className="common-errors">
              <h4>典型错误</h4>
              {node.students
                .flatMap(s => s.wrongQuestions.map(q => ({ ...q, studentName: s.name })))
                .slice(0, 5)
                .map((q, i) => (
                  <div key={i} className="wrong-card">
                    <div className="wrong-card-head">
                      <span className="q-type">{q['题型']}</span>
                      <span className="q-student-name">{q.studentName}</span>
                      <span className="q-score">{q['得分']}/{q['满分']}分</span>
                    </div>
                    <div className="q-text">{q['题目']}</div>
                    <div className="q-answers">
                      <span className="q-stu">学生答案：<b>{q['学生答案']}</b></span>
                      <span className="q-cor">正确答案：<b>{q['正确答案']}</b></span>
                    </div>
                    {q['扣分原因'] && q['扣分原因'] !== '无' && (
                      <div className="q-reason">{q['扣分原因']}</div>
                    )}
                  </div>
                ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
