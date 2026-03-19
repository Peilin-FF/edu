import { useState, useEffect } from 'react';
import './Assignment.css';

/**
 * Teacher view: show assignment submission status.
 * studentsWithData = IDs of students who have submitted exam data (have JSON files).
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

  // Students with data files are considered "submitted" for the selected assignment
  const dataIds = new Set(studentsWithData || []);
  const hw = assignments.find((a) => a.id === selectedHw);
  const submittedCount = students.filter((s) => dataIds.has(s['学生ID'])).length;

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
              </tr>
            </thead>
            <tbody>
              {students.map((s) => {
                const hasData = dataIds.has(s['学生ID']);
                return (
                  <tr key={s['学生ID']}>
                    <td>{s['学生ID']}</td>
                    <td>{s['姓名']}</td>
                    <td>{s.class || '-'}</td>
                    <td>
                      <span className={`sub-badge ${hasData ? 'sub-badge--done' : 'sub-badge--pending'}`}>
                        {hasData ? '已提交' : '未提交'}
                      </span>
                    </td>
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
