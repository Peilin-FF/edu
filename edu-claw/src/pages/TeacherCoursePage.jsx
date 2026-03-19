import { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';

export default function TeacherCoursePage() {
  const [courses, setCourses] = useState([]);
  const [selectedCourse, setSelectedCourse] = useState(null);
  const [classes, setClasses] = useState([]);
  const navigate = useNavigate();

  useEffect(() => {
    fetch('/data/courses/index.json')
      .then((r) => r.json())
      .then((data) => setCourses(data.courses));
  }, []);

  const handleSelectCourse = async (course) => {
    setSelectedCourse(course);
    // Load class list for this course
    const res = await fetch(`${course.dataPath}/students/index.json`);
    const data = await res.json();
    setClasses(data.classes || []);
  };

  const handleSelectClass = (classId) => {
    navigate(`/teacher/${selectedCourse.id}?class=${classId}`);
  };

  const handleViewAll = () => {
    navigate(`/teacher/${selectedCourse.id}`);
  };

  return (
    <div className="app">
      <header className="header">
        <Link to="/" className="back-link">&larr; 首页</Link>
        <h1 className="title">教师端 — {selectedCourse ? '选择班级' : '选择课程'}</h1>
      </header>

      <div className="course-grid">
        {!selectedCourse && courses.map((c) => (
          <div key={c.id} className="course-card" onClick={() => handleSelectCourse(c)}>
            <div className="course-cover-wrap">
              <img className="course-cover" src={c.cover} alt={c.name} />
            </div>
            <div className="course-info">
              <h3 className="course-name">{c.name}</h3>
              <p className="course-author">{c.author}</p>
              <span className="course-enter">选择课程 &rarr;</span>
            </div>
          </div>
        ))}

        {selectedCourse && (
          <>
            <div className="class-header">
              <button className="switch-btn" onClick={() => setSelectedCourse(null)}>&larr; 重选课程</button>
              <h2>{selectedCourse.name}</h2>
            </div>
            <div className="class-grid">
              <div className="class-card" onClick={handleViewAll}>
                <div className="class-icon">&#x1F465;</div>
                <h3>全部学生</h3>
                <p>查看所有班级的综合数据</p>
              </div>
              {classes.map((cls) => (
                <div key={cls.id} className="class-card" onClick={() => handleSelectClass(cls.id)}>
                  <div className="class-icon">&#x1F3EB;</div>
                  <h3>{cls.name}</h3>
                  <p>班级代码：{cls.id}</p>
                </div>
              ))}
            </div>
          </>
        )}
      </div>
    </div>
  );
}
