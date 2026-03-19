import { useState, useEffect } from 'react';
import { getUnreadNotifications, getAllNotifications, markAsRead, markAllAsRead } from '../utils/notificationStore';

export default function NotificationBell({ studentId }) {
  const [open, setOpen] = useState(false);
  const [notifications, setNotifications] = useState([]);
  const [unreadCount, setUnreadCount] = useState(0);

  // Poll for new notifications every 5 seconds
  useEffect(() => {
    const check = () => {
      const unread = getUnreadNotifications(studentId);
      setUnreadCount(unread.length);
    };
    check();
    const timer = setInterval(check, 5000);
    return () => clearInterval(timer);
  }, [studentId]);

  const handleOpen = () => {
    setOpen(true);
    setNotifications(getAllNotifications(studentId));
  };

  const handleClose = () => {
    markAllAsRead(studentId);
    setUnreadCount(0);
    setOpen(false);
  };

  return (
    <>
      <button className="notif-bell" onClick={open ? handleClose : handleOpen}>
        &#x1F514;
        {unreadCount > 0 && <span className="notif-badge">{unreadCount}</span>}
      </button>

      {open && (
        <div className="notif-dropdown">
          <div className="notif-dropdown-header">
            <span>通知</span>
            <button className="notif-close" onClick={handleClose}>&times;</button>
          </div>
          <div className="notif-list">
            {notifications.length === 0 && (
              <p className="notif-empty">暂无通知</p>
            )}
            {[...notifications].reverse().map((n) => (
              <div key={n.id} className={`notif-item ${n.read ? '' : 'notif-unread'}`}>
                <div className="notif-from">{n.from}</div>
                <div className="notif-msg">{n.message}</div>
                <div className="notif-time">{new Date(n.timestamp).toLocaleString('zh-CN')}</div>
              </div>
            ))}
          </div>
        </div>
      )}
    </>
  );
}
