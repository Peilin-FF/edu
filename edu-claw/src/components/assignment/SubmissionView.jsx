import { useState, useEffect } from 'react';
import './Assignment.css';

/**
 * Teacher view: show assignment submission status.
 * Checks two sources:
 * 1. studentsWithData — students who have graded JSON files (static data)
 * 2. localStorage submissions — students who uploaded PDF via the assignment panel
 */
export default function SubmissionView({ courseId, students, studentsWithData }) {
  const [assignments, setAssignments] = useState([]);
  const [selectedHw, setSelectedHw] = useState('');

  useEffect(() => {
    fetch(`/data/courses/${courseId}/assignments.json`)
      .then((r) => r.json())
      .then((data) => {
        setAssignments(data);
        if (data.length > 0) setSelectedHw(data[0].id);
      })
      .catch(() => {});
  }, [courseId]);

  // Collect all submission records from localStorage (all students)
  const allSubmissions = {};
  for (const s of students) {
    const key = `edu_submissions_${s['学生ID']}_${courseId}`;
    try {
      const data = JSON.parse(localStorage.getItem(key) || '{}');
      if (Object.keys(data).length > 0) allSubmissions[s['学生ID']] = data;
    } catch {}
  }

  const dataIds = new Set(studentsWithData || []);
  const hw = assignments.find((a) => a.id === selectedHw);

  // A student is "submitted" if: has data file OR has localStorage submission for this assignment
  const isSubmitted = (studentId) => {
    return dataIds.has(studentId) || allSubmissions[studentId]?.[selectedHw]?.submitted;
  };

  const getSubmissionInfo = (studentId) => {
    return allSubmissions[studentId]?.[selectedHw] || null;
  };

  const submittedCount = students.filter((s) => isSubmitted(s['学生ID'])).length;

  return (
    <div style={{ padding: 24, maxWidth: 800, margin: '0 auto' }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 20 }}>
        <h2 style={{ margin: 0, fontSize: 16, fontWeight: 700 }}>作业提交情况</h2>
        <select className="hw-select" value={selectedHw} onChange={(e) => setSelectedHw(e.target.value)}>
          {assignments.map((a) => (
            <option key={a.id} value={a.id}>{a.title}</option>
          ))}
        </select>
      </div>

      {hw && (
        <>
          <div className="sub-stats">
            <span>截止日期：<span className="sub-stat-value">{hw.deadline}</span></span>
            <span>已提交：<span className="sub-stat-value" style={{ color: 'var(--green)' }}>{submittedCount}</span></span>
            <span>未提交：<span className="sub-stat-value" style={{ color: 'var(--red)' }}>{students.length - submittedCount}</span></span>
            <span>提交率：<span className="sub-stat-value">{students.length > 0 ? Math.round(submittedCount / students.length * 100) : 0}%</span></span>
          </div>

          <table className="sub-table">
            <thead>
              <tr>
                <th>学号</th>
                <th>姓名</th>
                <th>班级</th>
                <th>状态</th>
                <th>得分</th>
                <th>提交时间</th>
              </tr>
            </thead>
            <tbody>
              {students.map((s) => {
                const submitted = isSubmitted(s['学生ID']);
                const info = getSubmissionInfo(s['学生ID']);
                return (
                  <tr key={s['学生ID']}>
                    <td>{s['学生ID']}</td>
                    <td>{s['姓名']}</td>
                    <td>{s.class || '-'}</td>
                    <td>
                      <span className={`sub-badge ${submitted ? 'sub-badge--done' : 'sub-badge--pending'}`}>
                        {submitted ? '已提交' : '未提交'}
                      </span>
                    </td>
                    <td>{info?.totalScore ?? (dataIds.has(s['学生ID']) ? '-' : '-')}</td>
                    <td style={{ color: 'var(--text-muted)' }}>{info?.date || '-'}</td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </>
      )}

      {assignments.length === 0 && (
        <p style={{ textAlign: 'center', color: 'var(--text-muted)', padding: 40 }}>暂无作业</p>
      )}
    </div>
  );
}
