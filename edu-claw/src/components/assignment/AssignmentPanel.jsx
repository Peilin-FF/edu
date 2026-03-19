import { useState, useEffect, useRef } from 'react';
import { isGithubConnected, getGithubConfig, uploadBinaryFile, writeFile } from '../../utils/githubStore';
import { parseContentMd } from '../../utils/mdParser';
import { enrichQuestions } from '../../utils/questionEnricher';
import './Assignment.css';

export default function AssignmentPanel({ courseId, studentId, studentName, knowledgeTree, onDataUpdate, onClose }) {
  const [assignments, setAssignments] = useState([]);
  const [submissions, setSubmissions] = useState({});
  const [processing, setProcessing] = useState(null); // assignmentId being processed
  const [status, setStatus] = useState(''); // status message
  const [error, setError] = useState('');
  const fileRef = useRef(null);
  const currentHwRef = useRef(null);

  useEffect(() => {
    fetch(`/data/courses/${courseId}/assignments.json`)
      .then((r) => r.json())
      .then(setAssignments)
      .catch(() => setAssignments([]));

    const key = `edu_submissions_${studentId}_${courseId}`;
    try { setSubmissions(JSON.parse(localStorage.getItem(key) || '{}')); } catch {}
  }, [courseId, studentId]);

  const saveSubmissions = (updated) => {
    setSubmissions(updated);
    localStorage.setItem(`edu_submissions_${studentId}_${courseId}`, JSON.stringify(updated));
  };

  const handleUploadClick = (assignmentId) => {
    currentHwRef.current = assignmentId;
    fileRef.current?.click();
  };

  const handleFileChange = async (e) => {
    const file = e.target.files?.[0];
    if (!file || !currentHwRef.current) return;

    const assignmentId = currentHwRef.current;
    setProcessing(assignmentId);
    setError('');

    try {
      const arrayBuffer = await file.arrayBuffer();

      // Step 1: Upload PDF to GitHub (if connected)
      if (isGithubConnected()) {
        setStatus('上传 PDF 到 GitHub...');
        const { token, username } = getGithubConfig();
        await uploadBinaryFile(token, username,
          `courses/${courseId}/submissions/${assignmentId}_${file.name}`,
          arrayBuffer, `提交作业: ${assignmentId}`
        );
      }

      // Step 2: Send to MinerU for parsing
      setStatus('MinerU 解析 PDF 中（约1-2分钟）...');
      const formData = new FormData();
      formData.append('file', file);

      const parseRes = await fetch('/api/mineru/parse', {
        method: 'POST',
        body: formData,
      });

      if (!parseRes.ok) {
        const err = await parseRes.json().catch(() => ({}));
        throw new Error(err.error || `解析失败: ${parseRes.status}`);
      }

      const { contentMd } = await parseRes.json();

      // Step 3: Parse content.md into structured questions
      setStatus('解析试卷结构...');
      const studentData = parseContentMd(contentMd, studentName, studentId);
      console.log('[Assignment] Parsed questions:', studentData['题目列表'].length, 'total score:', studentData['总分']);

      // Step 4: LLM enrich (knowledge points + deduction reasons)
      if (knowledgeTree) {
        setStatus('AI 批改中（标注知识点 + 分析错因）...');
        await enrichQuestions(studentData['题目列表'], knowledgeTree);
        console.log('[Assignment] Enriched. Sample:', studentData['题目列表'][0]?.['知识点']);
      }

      // Step 5: Save result JSON to GitHub
      if (isGithubConnected()) {
        setStatus('保存批改结果到 GitHub...');
        const { token, username } = getGithubConfig();
        await writeFile(token, username,
          `courses/${courseId}/graded_${studentId}.json`,
          JSON.stringify(studentData, null, 2),
          `批改完成: ${studentName} ${assignmentId}`
        );
        console.log('[Assignment] Saved to GitHub');
      }

      // Step 6: Update submission status
      console.log('[Assignment] Updating submission status and calling onDataUpdate...');
      const updated = {
        ...submissions,
        [assignmentId]: {
          submitted: true,
          date: new Date().toISOString().slice(0, 10),
          fileName: file.name,
          totalScore: studentData['总分'],
          questionCount: studentData['题目列表'].length,
          wrongCount: studentData['题目列表'].filter(q => q['得分'] < q['满分']).length,
        },
      };
      saveSubmissions(updated);

      // Step 7: Callback to update parent (knowledge graph refresh)
      if (onDataUpdate) {
        onDataUpdate(studentData);
      }

      setStatus('完成！试卷已批改并融入知识图谱。');
      setTimeout(() => setStatus(''), 3000);
    } catch (err) {
      setError(err.message);
    } finally {
      setProcessing(null);
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
            <span style={{ fontSize: 12, color: 'var(--text-muted)' }}>提交 PDF → AI 自动批改 → 更新知识图谱</span>
          </div>
          <button className="drawer-close" onClick={onClose}>&times;</button>
        </div>

        <div className="drawer-body">
          {error && <p className="hw-error">{error}</p>}

          {processing && (
            <div className="hw-processing">
              <div className="hw-processing-spinner" />
              <p>{status}</p>
            </div>
          )}

          {assignments.map((hw) => {
            const sub = submissions[hw.id];
            const overdue = today > hw.deadline && !sub?.submitted;
            const isProcessing = processing === hw.id;
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
                  <span>截止：{hw.deadline}</span>
                  {sub?.submitted && <span>提交于：{sub.date}</span>}
                  {sub?.totalScore != null && <span>得分：{sub.totalScore}</span>}
                  {sub?.wrongCount != null && <span>错{sub.wrongCount}题</span>}
                </div>
                {!isProcessing && (
                  <button
                    className={sub?.submitted ? 'hw-resubmit-btn' : 'hw-upload-btn'}
                    onClick={() => handleUploadClick(hw.id)}
                  >
                    {sub?.submitted ? '重新提交' : '上传 PDF 试卷'}
                  </button>
                )}
              </div>
            );
          })}

          {assignments.length === 0 && (
            <p style={{ textAlign: 'center', color: 'var(--text-muted)', padding: 40 }}>暂无作业</p>
          )}
        </div>

        <input ref={fileRef} type="file" accept=".pdf" style={{ display: 'none' }} onChange={handleFileChange} />
      </div>
    </div>
  );
}
