import { useState, useEffect, useCallback } from 'react';
import { Link } from 'react-router-dom';
import MindMap from '../components/MindMap';
import StudentSelector from '../components/StudentSelector';
import WeakPointDrawer from '../components/WeakPointDrawer';
import MasteryLegend from '../components/MasteryLegend';
import PptModal from '../components/ppt/PptModal';
import PracticeModal from '../components/practice/PracticeModal';
import ChatBubble from '../components/chat/ChatBubble';
import ProgressPanel from '../components/progress/ProgressPanel';
import AchievementToast from '../components/progress/AchievementToast';
import { recordPptView, recordChat, getProgress } from '../utils/progressStore';
import { collectNodeNames, computeStudentMastery } from '../utils/masteryCalculator';

export default function StudentPortal() {
  const [tree, setTree] = useState(null);
  const [student, setStudent] = useState(null);
  const [masteryMap, setMasteryMap] = useState(null);
  const [selectedNode, setSelectedNode] = useState(null);
  const [weakOnly, setWeakOnly] = useState(false);
  const [pptQuestion, setPptQuestion] = useState(null);
  const [practiceQuestion, setPracticeQuestion] = useState(null);
  const [showProgress, setShowProgress] = useState(false);
  const [toastQueue, setToastQueue] = useState([]);

  useEffect(() => {
    fetch('/data/knowledge.json').then(r => r.json()).then(setTree);
  }, []);

  const handleSelectStudent = useCallback(async (file) => {
    const res = await fetch(`/data/students/${file}`);
    const data = await res.json();
    setStudent(data);
    if (tree) {
      const names = collectNodeNames(tree);
      const mastery = computeStudentMastery(data, names);
      setMasteryMap(mastery);
    }
    setSelectedNode(null);
  }, [tree]);

  const handleNodeClick = useCallback((nodeData) => {
    if (!masteryMap) return;
    const cleanName = nodeData.name.replace(/\s*【.*】$/, '');
    const data = masteryMap.get(cleanName);
    if (data && data.wrongQuestions.length > 0) {
      setSelectedNode({ name: cleanName, ...data });
    }
  }, [masteryMap]);

  const studentId = student?.['学生ID'] || student?.['姓名'];

  // Record PPT view
  const handlePptRequest = (q) => {
    setPptQuestion(q);
    if (studentId && q['知识点']) {
      recordPptView(studentId, q['知识点']);
    }
  };

  // Handle new achievements from practice
  const handleNewAchievements = (newAchs) => {
    setToastQueue((prev) => [...prev, ...newAchs]);
  };

  const handleToastDone = () => {
    setToastQueue((prev) => prev.slice(1));
  };

  // Get streak for display
  const progress = studentId ? getProgress(studentId) : null;

  if (!student) {
    return (
      <div className="app">
        <header className="header">
          <Link to="/" className="back-link">← 返回首页</Link>
          <h1 className="title">学生端 - 选择身份</h1>
        </header>
        <div className="selector-container">
          <StudentSelector onSelect={handleSelectStudent} />
        </div>
      </div>
    );
  }

  const wrongCount = masteryMap
    ? Array.from(masteryMap.values()).reduce((s, v) => s + v.wrongQuestions.length, 0)
    : 0;

  const allWrongQuestions = masteryMap
    ? Array.from(masteryMap.values()).flatMap((v) => v.wrongQuestions)
    : [];

  return (
    <div className="app">
      <header className="header">
        <div className="header-left">
          <Link to="/" className="back-link">← 首页</Link>
          <span className="header-sep">|</span>
          <button className="switch-btn" onClick={() => { setStudent(null); setMasteryMap(null); }}>
            切换学生
          </button>
          <button className={`switch-btn ${weakOnly ? 'active' : ''}`} onClick={() => setWeakOnly(v => !v)}>
            {weakOnly ? '查看全部' : '只看未掌握'}
          </button>
          <button className="progress-btn" onClick={() => setShowProgress(true)}>
            {progress?.streak > 0 && <span className="streak-fire">{'\uD83D\uDD25'}</span>}
            学习进度
          </button>
        </div>
        <div className="header-center">
          <h1 className="title">{student['姓名']} 的知识图谱</h1>
          <div className="subtitle">
            总分：{student['总分']}分 | 错题：{wrongCount}道 | 考试：{student['作业考试时间']}
            {progress?.streak > 0 && ` | 连续学习 ${progress.streak} 天`}
          </div>
        </div>
        <MasteryLegend />
      </header>

      <div className="chart-container">
        {tree && (
          <MindMap
            data={tree}
            masteryMap={masteryMap}
            mode="student"
            onNodeClick={handleNodeClick}
            weakOnly={weakOnly}
          />
        )}
      </div>

      {selectedNode && (
        <WeakPointDrawer
          node={selectedNode}
          onClose={() => setSelectedNode(null)}
          onPptRequest={handlePptRequest}
          onPracticeRequest={(q) => setPracticeQuestion(q)}
        />
      )}

      {pptQuestion && (
        <PptModal
          question={pptQuestion}
          onClose={() => setPptQuestion(null)}
        />
      )}

      {practiceQuestion && (
        <PracticeModal
          question={practiceQuestion}
          studentId={studentId}
          onClose={() => setPracticeQuestion(null)}
          onNewAchievements={handleNewAchievements}
        />
      )}

      {showProgress && (
        <ProgressPanel
          studentId={studentId}
          onClose={() => setShowProgress(false)}
        />
      )}

      <AchievementToast
        achievement={toastQueue[0] || null}
        onDone={handleToastDone}
      />

      <ChatBubble
        studentName={student['姓名']}
        wrongQuestions={allWrongQuestions}
        masteryMap={masteryMap}
        knowledgeTree={tree}
      />
    </div>
  );
}
