import { useState, useEffect, useCallback } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import MindMap from '../components/MindMap';
import WeakPointDrawer from '../components/WeakPointDrawer';
import MasteryLegend from '../components/MasteryLegend';
import PptModal from '../components/ppt/PptModal';
import PracticeModal from '../components/practice/PracticeModal';
import ChatBubble from '../components/chat/ChatBubble';
import ProgressPanel from '../components/progress/ProgressPanel';
import AchievementToast from '../components/progress/AchievementToast';
import InteractiveModal from '../components/interactive/InteractiveModal';
import SyncStatus from '../components/SyncStatus';
import { recordPptView, getProgress, pullFromGithub } from '../utils/progressStore';
import { isGithubConnected, saveFullContext, saveGithubConfig } from '../utils/githubStore';
import { getCurrentAccount, logout } from '../utils/accountStore';
import { collectNodeNames, computeStudentMastery } from '../utils/masteryCalculator';

export default function StudentPortal() {
  const navigate = useNavigate();
  const { courseId } = useParams();
  const [course, setCourse] = useState(null);
  const [tree, setTree] = useState(null);
  const [student, setStudent] = useState(null);
  const [masteryMap, setMasteryMap] = useState(null);
  const [selectedNode, setSelectedNode] = useState(null);
  const [weakOnly, setWeakOnly] = useState(false);
  const [pptQuestion, setPptQuestion] = useState(null);
  const [practiceQuestion, setPracticeQuestion] = useState(null);
  const [interactiveQuestion, setInteractiveQuestion] = useState(null);
  const [showProgress, setShowProgress] = useState(false);
  const [toastQueue, setToastQueue] = useState([]);
  const [syncing, setSyncing] = useState(false);

  useEffect(() => {
    const account = getCurrentAccount();
    if (!account) { navigate('/login'); return; }

    // Restore GitHub
    const accounts = JSON.parse(localStorage.getItem('edu_accounts') || '{}');
    const github = accounts[account.studentId]?.github;
    const globalToken = localStorage.getItem('github_token');
    const globalUsername = localStorage.getItem('github_username');
    if (github) {
      saveGithubConfig(github.token, github.username, github.avatar);
    } else if (globalToken && globalUsername) {
      const accs = JSON.parse(localStorage.getItem('edu_accounts') || '{}');
      if (accs[account.studentId]) {
        accs[account.studentId].github = { token: globalToken, username: globalUsername, avatar: localStorage.getItem('github_avatar') };
        localStorage.setItem('edu_accounts', JSON.stringify(accs));
      }
    }

    // Load course info + course data + student data
    const basePath = `/data/courses/${courseId}`;

    Promise.all([
      fetch('/data/courses/index.json').then((r) => r.json()),
      fetch(`${basePath}/knowledge.json`).then((r) => r.json()),
      fetch(`${basePath}/students/${account.file}`).then((r) => r.json()),
    ]).then(([courseIndex, treeData, studentData]) => {
      const courseInfo = courseIndex.courses.find((c) => c.id === courseId);
      setCourse(courseInfo);
      setTree(treeData);
      setStudent(studentData);

      const names = collectNodeNames(treeData);
      const mastery = computeStudentMastery(studentData, names);
      setMasteryMap(mastery);

      // Sync to GitHub — use course-scoped paths
      const sid = studentData['学生ID'] || studentData['姓名'];
      // Store current course in localStorage for other components
      localStorage.setItem('edu_current_course', courseId);
      localStorage.setItem('edu_current_student', sid);

      if (isGithubConnected()) {
        setSyncing(true);
        pullFromGithub(sid).finally(() => setSyncing(false));
        const wrongQs = Array.from(mastery.values()).flatMap((v) => v.wrongQuestions);
        saveFullContext(sid, {
          student: studentData,
          masteryMap: mastery,
          wrongQuestions: wrongQs,
          knowledgeTree: treeData,
          courseId,
        }).catch((e) => console.error('[Upload]', e));
      }
    }).catch(() => {
      // Course data not found
      navigate('/courses');
    });
  }, [navigate, courseId]);

  const studentId = student?.['学生ID'] || student?.['姓名'];

  const handleNodeClick = useCallback((nodeData) => {
    if (!masteryMap) return;
    const cleanName = nodeData.name.replace(/\s*【.*】$/, '');
    const data = masteryMap.get(cleanName);
    if (data && data.wrongQuestions.length > 0) {
      setSelectedNode({ name: cleanName, ...data });
    }
  }, [masteryMap]);

  const handlePptRequest = (q) => {
    setPptQuestion(q);
    if (studentId && q['知识点']) recordPptView(studentId, q['知识点']);
  };

  const handleNewAchievements = (newAchs) => setToastQueue((prev) => [...prev, ...newAchs]);
  const handleToastDone = () => setToastQueue((prev) => prev.slice(1));

  const handleWrongQuestionsAdd = useCallback((newWrongQs) => {
    if (!masteryMap || newWrongQs.length === 0) return;
    const kp = newWrongQs[0]['知识点'];
    const updated = new Map(masteryMap);
    const existing = updated.get(kp);
    if (!existing) return;
    existing.wrongQuestions = [...existing.wrongQuestions, ...newWrongQs];
    existing.possible += newWrongQs.length;
    existing.mastery = existing.possible > 0 ? existing.earned / existing.possible : 0;
    setMasteryMap(updated);
    if (selectedNode && selectedNode.name === kp) {
      setSelectedNode({ ...selectedNode, ...existing });
    }
  }, [masteryMap, selectedNode]);

  const handleDeleteQuestion = useCallback((nodeName, questionId) => {
    if (!masteryMap) return;
    const updated = new Map(masteryMap);
    const entry = updated.get(nodeName);
    if (!entry) return;
    entry.wrongQuestions = entry.wrongQuestions.filter((q, i) => (q['题目ID'] || i) !== questionId);
    if (entry.possible > 0) {
      entry.earned = Math.min(entry.earned + 1, entry.possible);
      entry.mastery = entry.earned / entry.possible;
    }
    setMasteryMap(updated);
    if (selectedNode && selectedNode.name === nodeName) {
      if (entry.wrongQuestions.length === 0) setSelectedNode(null);
      else setSelectedNode({ ...selectedNode, ...entry });
    }
  }, [masteryMap, selectedNode]);

  const progress = studentId ? getProgress(studentId) : null;

  if (!student || !tree) {
    return (
      <div className="app">
        <header className="header"><h1 className="title">加载中...</h1></header>
        <div className="loading">正在加载课程数据...</div>
      </div>
    );
  }

  const wrongCount = masteryMap
    ? Array.from(masteryMap.values()).reduce((s, v) => s + v.wrongQuestions.length, 0) : 0;
  const allWrongQuestions = masteryMap
    ? Array.from(masteryMap.values()).flatMap((v) => v.wrongQuestions) : [];

  return (
    <div className="app">
      <header className="header">
        <div className="header-left">
          <Link to="/courses" className="back-link">&larr; 课程</Link>
          <span className="header-sep">|</span>
          <button className={`switch-btn ${weakOnly ? 'active' : ''}`} onClick={() => setWeakOnly((v) => !v)}>
            {weakOnly ? '查看全部' : '只看未掌握'}
          </button>
          <button className="progress-btn" onClick={() => setShowProgress(true)}>
            {progress?.streak > 0 && <span className="streak-fire">{'\uD83D\uDD25'}</span>}
            学习进度
          </button>
          <Link to="/settings" className="switch-btn">设置</Link>
          <SyncStatus syncing={syncing} />
        </div>
        <div className="header-center">
          <h1 className="title">{course?.name || tree.name}</h1>
          <div className="subtitle">
            {student['姓名']} | 总分：{student['总分']}分 | 错题：{wrongCount}道
            {progress?.streak > 0 && ` | 连续学习 ${progress.streak} 天`}
          </div>
        </div>
        <MasteryLegend />
      </header>

      <div className="chart-container">
        <MindMap data={tree} masteryMap={masteryMap} mode="student" onNodeClick={handleNodeClick} weakOnly={weakOnly} />
      </div>

      {selectedNode && (
        <WeakPointDrawer
          node={selectedNode}
          onClose={() => setSelectedNode(null)}
          onPptRequest={handlePptRequest}
          onPracticeRequest={(q) => setPracticeQuestion(q)}
          onInteractiveRequest={(q) => setInteractiveQuestion(q)}
          onDeleteQuestion={handleDeleteQuestion}
        />
      )}

      {pptQuestion && <PptModal question={pptQuestion} onClose={() => setPptQuestion(null)} />}

      {practiceQuestion && (
        <PracticeModal
          question={practiceQuestion} studentId={studentId}
          onClose={() => setPracticeQuestion(null)}
          onNewAchievements={handleNewAchievements}
          onWrongQuestionsAdd={handleWrongQuestionsAdd}
        />
      )}

      {interactiveQuestion && <InteractiveModal question={interactiveQuestion} onClose={() => setInteractiveQuestion(null)} />}
      {showProgress && <ProgressPanel studentId={studentId} onClose={() => setShowProgress(false)} />}
      <AchievementToast achievement={toastQueue[0] || null} onDone={handleToastDone} />

      <ChatBubble
        studentName={student['姓名']}
        wrongQuestions={allWrongQuestions}
        masteryMap={masteryMap}
        knowledgeTree={tree}
      />
    </div>
  );
}
