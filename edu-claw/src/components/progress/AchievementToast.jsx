import { useState, useEffect } from 'react';
import './Progress.css';

export default function AchievementToast({ achievement, onDone }) {
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    if (!achievement) return;
    setVisible(true);
    const t = setTimeout(() => { setVisible(false); setTimeout(onDone, 400); }, 3500);
    return () => clearTimeout(t);
  }, [achievement, onDone]);

  if (!achievement) return null;

  return (
    <div className={`ach-toast ${visible ? 'show' : ''}`}>
      <span className="ach-toast-icon">{achievement.icon}</span>
      <div>
        <div className="ach-toast-title">成就解锁！</div>
        <div className="ach-toast-name">{achievement.name} — {achievement.desc}</div>
      </div>
    </div>
  );
}
