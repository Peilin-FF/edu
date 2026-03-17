import { useState, useEffect } from 'react';

export default function StudentSelector({ onSelect }) {
  const [students, setStudents] = useState([]);

  useEffect(() => {
    fetch('/data/students/index.json')
      .then(r => r.json())
      .then(data => setStudents(data.students));
  }, []);

  return (
    <div className="student-selector">
      <h2>请选择你的身份</h2>
      <div className="student-list">
        {students.map(s => (
          <button
            key={s.id}
            className="student-item"
            onClick={() => onSelect(s.file)}
          >
            <span className="student-avatar">{s.name[0]}</span>
            <div>
              <div className="student-name">{s.name}</div>
              <div className="student-id">学号：{s.id}</div>
            </div>
          </button>
        ))}
      </div>
    </div>
  );
}
