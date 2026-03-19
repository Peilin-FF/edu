import { useState, useEffect, useCallback } from 'react';
import { Link, useParams, useSearchParams } from 'react-router-dom';
import MindMap from '../components/MindMap';
import NodeDetailPanel from '../components/NodeDetailPanel';
import ClassReport from '../components/ClassReport';
import MasteryLegend from '../components/MasteryLegend';
import SubmissionView from '../components/assignment/SubmissionView';
import TeacherChatBubble from '../components/teacher-chat/TeacherChatBubble';
import { collectNodeNames, computeStudentMastery, computeClassMastery } from '../utils/masteryCalculator';

export default function TeacherPortal() {
  const { courseId } = useParams();
  const [searchParams] = useSearchParams();
  const classFilter = searchParams.get('class'); // null = all classes

  const [tree, setTree] = useState(null);
  const [classMastery, setClassMastery] = useState(null);
  const [allStudents, setAllStudents] = useState([]);
  const [studentRoster, setStudentRoster] = useState([]); // full roster with class info
  const [selectedNode, setSelectedNode] = useState(null);
  const [summary, setSummary] = useState(null);
  const [weakOnly, setWeakOnly] = useState(false);
  const [tab, setTab] = useState('graph');
  const [className, setClassName] = useState('');

  useEffect(() => {
    const basePath = `/data/courses/${courseId}`;

    Promise.all([
      fetch(`${basePath}/knowledge.json`).then(r => r.json()),
      fetch(`${basePath}/students/index.json`).then(r => r.json()),
    ]).then(async ([treeData, manifest]) => {
      setTree(treeData);
      const names = collectNodeNames(treeData);

      // Filter students by class if specified
      let students = manifest.students;
      if (classFilter) {
        students = students.filter(s => s.class === classFilter);
        const cls = manifest.classes?.find(c => c.id === classFilter);
        setClassName(cls?.name || classFilter);
      } else {
        setClassName('全部班级');
      }

      // Save full roster for submission view
      setStudentRoster(students.map(s => ({ '学生ID': s.id, '姓名': s.name, class: s.class })));

      // Only load students that have data files
      const studentsWithData = students.filter(s => s.file);

      const allData = await Promise.all(
        studentsWithData.map(s => fetch(`${basePath}/students/${s.file}`).then(r => r.json()))
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

      const avgScore = allData.length > 0
        ? (allData.reduce((s, d) => s + (d['总分'] || 0), 0) / allData.length).toFixed(1)
        : '0';
      const weakPoints = Array.from(cm.entries())
        .sort((a, b) => a[1].avgMastery - b[1].avgMastery)
        .slice(0, 5);

      setSummary({ studentCount: allData.length, totalEnrolled: students.length, avgScore, weakPoints });
    });
  }, [courseId, classFilter]);

  const handleNodeClick = useCallback((nodeData) => {
    if (!classMastery) return;
    const cleanName = nodeData.name.replace(/\s*【.*】$/, '');
    const data = classMastery.get(cleanName);
    if (data) setSelectedNode({ name: cleanName, ...data });
  }, [classMastery]);

  return (
    <div className="app">
      <header className="header">
        <div className="header-left">
          <Link to="/teacher-courses" className="back-link">&larr; 课程</Link>
          <span className="header-sep">|</span>
          <div className="tab-group">
            <button className={`tab-btn ${tab === 'graph' ? 'active' : ''}`} onClick={() => setTab('graph')}>
              知识图谱
            </button>
            <button className={`tab-btn ${tab === 'report' ? 'active' : ''}`} onClick={() => setTab('report')}>
              班级报告
            </button>
            <button className={`tab-btn ${tab === 'assignments' ? 'active' : ''}`} onClick={() => setTab('assignments')}>
              作业提交
            </button>
          </div>
          {tab === 'graph' && (
            <button className={`switch-btn ${weakOnly ? 'active' : ''}`} onClick={() => setWeakOnly(v => !v)}>
              {weakOnly ? '查看全部' : '只看薄弱'}
            </button>
          )}
        </div>
        <div className="header-center">
          <h1 className="title">{className} — {tab === 'graph' ? '知识掌握全览' : tab === 'report' ? '学习诊断报告' : '作业提交情况'}</h1>
          {summary && (
            <div className="subtitle">
              已有数据：{summary.studentCount}/{summary.totalEnrolled}人 | 均分：{summary.avgScore}分 |
              最薄弱：{summary.weakPoints.slice(0, 3).map(([n]) => n).join('、')}
            </div>
          )}
        </div>
        {tab === 'graph' && <MasteryLegend teacher />}
      </header>

      {tab === 'graph' && (
        <div className="chart-container">
          {tree && classMastery ? (
            <MindMap data={tree} masteryMap={classMastery} mode="teacher" onNodeClick={handleNodeClick} weakOnly={weakOnly} />
          ) : (
            <div className="loading">加载中...</div>
          )}
        </div>
      )}

      {tab === 'report' && (
        <div className="report-container">
          {allStudents.length > 0 && classMastery ? (
            <ClassReport students={allStudents} classMastery={classMastery} />
          ) : (
            <div className="loading">加载中...</div>
          )}
        </div>
      )}

      {tab === 'assignments' && (
        <div className="report-container">
          <SubmissionView courseId={courseId} students={studentRoster} studentsWithData={allStudents.map(s => s['学生ID'])} />
        </div>
      )}

      {selectedNode && (
        <NodeDetailPanel node={selectedNode} onClose={() => setSelectedNode(null)} />
      )}

      <TeacherChatBubble
        classMastery={classMastery}
        allStudents={allStudents}
        studentRoster={studentRoster}
        courseId={courseId}
      />
    </div>
  );
}
