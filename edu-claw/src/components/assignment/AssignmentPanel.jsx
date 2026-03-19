import { useState, useEffect, useRef } from 'react';
import { isGithubConnected, getGithubConfig, uploadBinaryFile, writeFile } from '../../utils/githubStore';
import './Assignment.css';

export default function AssignmentPanel({ courseId, studentId, onClose }) {
  const [assignments, setAssignments] = useState([]);
  const [submissions, setSubmissions] = useState({}); // { hw1: { submitted: true, date: '...' } }
  const [uploading, setUploading] = useState(null); // assignmentId being uploaded
  const [error, setError] = useState('');
  const fileRef = useRef(null);
  const currentHwRef = useRef(null);

  // Load assignments + submission status
  useEffect(() => {
    fetch(`/data/courses/${courseId}/assignments.json`)
      .then((r) => r.json())
      .then(setAssignments)
      .catch(() => setAssignments([]));

    // Load submission status from localStorage
    const key = `edu_submissions_${studentId}_${courseId}`;
    try {
      const saved = JSON.parse(localStorage.getItem(key) || '{}');
      setSubmissions(saved);
    } catch {}
  }, [courseId, studentId]);

  const saveSubmissions = (updated) => {
    setSubmissions(updated);
    const key = `edu_submissions_${studentId}_${courseId}`;
    localStorage.setItem(key, JSON.stringify(updated));
  };

  const handleUploadClick = (assignmentId) => {
    if (!isGithubConnected()) {
      setError('请先在设置页连接 GitHub');
      return;
    }
    currentHwRef.current = assignmentId;
    fileRef.current?.click();
  };

  const handleFileChange = async (e) => {
    const file = e.target.files?.[0];
    if (!file || !currentHwRef.current) return;

    const assignmentId = currentHwRef.current;
    setUploading(assignmentId);
    setError('');

    try {
      const { token, username } = getGithubConfig();
      const arrayBuffer = await file.arrayBuffer();
      const path = `courses/${courseId}/submissions/${assignmentId}_${file.name}`;

      await uploadBinaryFile(token, username, path, arrayBuffer, `提交作业: ${assignmentId}`);

      // Record submission
      const updated = {
        ...submissions,
        [assignmentId]: {
          submitted: true,
          date: new Date().toISOString().slice(0, 10),
          fileName: file.name,
        },
      };
      saveSubmissions(updated);
    } catch (err) {
      setError(`上传失败: ${err.message}`);
    } finally {
      setUploading(null);
      e.target.value = '';
    }
  };

  const today = new Date().toISOString().slice(0, 10);

  return (
    <div className="drawer-overlay" onClick={onClose}>
      <div className="drawer" onClick={(e) => e.stopPropagation()}>
        <div className="drawer-header">
          <div>
            <h3>课程作业</h3>
            <span style={{ fontSize: 12, color: 'var(--text-muted)' }}>共 {assignments.length} 项</span>
          </div>
          <button className="drawer-close" onClick={onClose}>&times;</button>
        </div>

        <div className="drawer-body">
          {error && <p className="hw-error">{error}</p>}

          {assignments.map((hw) => {
            const sub = submissions[hw.id];
            const overdue = today > hw.deadline && !sub?.submitted;
            return (
              <div key={hw.id} className={`hw-card ${sub?.submitted ? 'hw-done' : overdue ? 'hw-overdue' : ''}`}>
                <div className="hw-card-header">
                  <h4 className="hw-title">{hw.title}</h4>
                  {sub?.submitted ? (
                    <span className="hw-status hw-status--done">&#x2713; 已提交</span>
                  ) : overdue ? (
                    <span className="hw-status hw-status--overdue">已截止</span>
                  ) : (
                    <span className="hw-status hw-status--pending">待提交</span>
                  )}
                </div>
                <p className="hw-desc">{hw.description}</p>
                <div className="hw-meta">
                  <span>截止日期：{hw.deadline}</span>
                  {sub?.submitted && <span>提交于：{sub.date}</span>}
                  {sub?.fileName && <span>文件：{sub.fileName}</span>}
                </div>
                {!sub?.submitted && (
                  <button
                    className="hw-upload-btn"
                    onClick={() => handleUploadClick(hw.id)}
                    disabled={uploading === hw.id}
                  >
                    {uploading === hw.id ? '上传中...' : '上传 PDF'}
                  </button>
                )}
                {sub?.submitted && (
                  <button
                    className="hw-resubmit-btn"
                    onClick={() => handleUploadClick(hw.id)}
                    disabled={uploading === hw.id}
                  >
                    {uploading === hw.id ? '上传中...' : '重新提交'}
                  </button>
                )}
              </div>
            );
          })}

          {assignments.length === 0 && (
            <p style={{ textAlign: 'center', color: 'var(--text-muted)', padding: 40 }}>暂无作业</p>
          )}
        </div>

        <input
          ref={fileRef}
          type="file"
          accept=".pdf"
          style={{ display: 'none' }}
          onChange={handleFileChange}
        />
      </div>
    </div>
  );
}
