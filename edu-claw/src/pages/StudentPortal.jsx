import { useState, useEffect, useCallback } from 'react';
import { Link } from 'react-router-dom';
import MindMap from '../components/MindMap';
import StudentSelector from '../components/StudentSelector';
import WeakPointDrawer from '../components/WeakPointDrawer';
import MasteryLegend from '../components/MasteryLegend';
import { collectNodeNames, computeStudentMastery } from '../utils/masteryCalculator';

export default function StudentPortal() {
  const [tree, setTree] = useState(null);
  const [student, setStudent] = useState(null);
  const [masteryMap, setMasteryMap] = useState(null);
  const [selectedNode, setSelectedNode] = useState(null);
  const [weakOnly, setWeakOnly] = useState(false);

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
        </div>
        <div className="header-center">
          <h1 className="title">{student['姓名']} 的知识图谱</h1>
          <div className="subtitle">
            总分：{student['总分']}分 | 错题：{wrongCount}道 | 考试：{student['作业考试时间']}
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
        />
      )}
    </div>
  );
}
