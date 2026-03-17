import { useState, useEffect, useCallback } from 'react';
import { Link } from 'react-router-dom';
import MindMap from '../components/MindMap';
import NodeDetailPanel from '../components/NodeDetailPanel';
import ClassReport from '../components/ClassReport';
import MasteryLegend from '../components/MasteryLegend';
import { collectNodeNames, computeStudentMastery, computeClassMastery } from '../utils/masteryCalculator';

export default function TeacherPortal() {
  const [tree, setTree] = useState(null);
  const [classMastery, setClassMastery] = useState(null);
  const [allStudents, setAllStudents] = useState([]);
  const [selectedNode, setSelectedNode] = useState(null);
  const [summary, setSummary] = useState(null);
  const [weakOnly, setWeakOnly] = useState(false);
  const [tab, setTab] = useState('graph'); // 'graph' | 'report'

  useEffect(() => {
    Promise.all([
      fetch('/data/knowledge.json').then(r => r.json()),
      fetch('/data/students/index.json').then(r => r.json()),
    ]).then(async ([treeData, manifest]) => {
      setTree(treeData);
      const names = collectNodeNames(treeData);

      const studentFiles = manifest.students.map(s => s.file);
      const allData = await Promise.all(
        studentFiles.map(f => fetch(`/data/students/${f}`).then(r => r.json()))
      );
      setAllStudents(allData);

      const allMasteries = allData.map(d => ({
        name: d['姓名'],
        studentId: d['学生ID'],
        totalScore: d['总分'],
        masteryMap: computeStudentMastery(d, names),
      }));

      const cm = computeClassMastery(allMasteries);
      setClassMastery(cm);

      const avgScore = allData.reduce((s, d) => s + (d['总分'] || 0), 0) / allData.length;
      const weakPoints = Array.from(cm.entries())
        .sort((a, b) => a[1].avgMastery - b[1].avgMastery)
        .slice(0, 5);

      setSummary({
        studentCount: allData.length,
        avgScore: avgScore.toFixed(1),
        weakPoints,
      });
    });
  }, []);

  const handleNodeClick = useCallback((nodeData) => {
    if (!classMastery) return;
    const cleanName = nodeData.name.replace(/\s*【.*】$/, '');
    const data = classMastery.get(cleanName);
    if (data) {
      setSelectedNode({ name: cleanName, ...data });
    }
  }, [classMastery]);

  return (
    <div className="app">
      <header className="header">
        <div className="header-left">
          <Link to="/" className="back-link">← 首页</Link>
          <div className="tab-group">
            <button className={`tab-btn ${tab === 'graph' ? 'active' : ''}`} onClick={() => setTab('graph')}>
              知识图谱
            </button>
            <button className={`tab-btn ${tab === 'report' ? 'active' : ''}`} onClick={() => setTab('report')}>
              班级报告
            </button>
          </div>
          {tab === 'graph' && (
            <button className={`switch-btn ${weakOnly ? 'active' : ''}`} onClick={() => setWeakOnly(v => !v)}>
              {weakOnly ? '查看全部' : '只看薄弱'}
            </button>
          )}
        </div>
        <div className="header-center">
          <h1 className="title">教师端 - {tab === 'graph' ? '班级知识掌握全览' : '班级学习诊断报告'}</h1>
          {summary && (
            <div className="subtitle">
              学生：{summary.studentCount}人 | 班级均分：{summary.avgScore}分 |
              最薄弱：{summary.weakPoints.slice(0, 3).map(([n]) => n).join('、')}
            </div>
          )}
        </div>
        {tab === 'graph' && <MasteryLegend teacher />}
      </header>

      {tab === 'graph' ? (
        <div className="chart-container">
          {tree && classMastery && (
            <MindMap
              data={tree}
              masteryMap={classMastery}
              mode="teacher"
              onNodeClick={handleNodeClick}
              weakOnly={weakOnly}
            />
          )}
          {!classMastery && <div className="loading">加载中...</div>}
        </div>
      ) : (
        <div className="report-container">
          {allStudents.length > 0 && classMastery ? (
            <ClassReport students={allStudents} classMastery={classMastery} />
          ) : (
            <div className="loading">加载中...</div>
          )}
        </div>
      )}

      {selectedNode && (
        <NodeDetailPanel
          node={selectedNode}
          onClose={() => setSelectedNode(null)}
        />
      )}
    </div>
  );
}
