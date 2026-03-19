/**
 * Notification system: teacher sends → student receives.
 * Stored in localStorage per student, keyed by student ID.
 */

const NOTIF_KEY = 'edu_notifications';

function loadAll() {
  try { return JSON.parse(localStorage.getItem(NOTIF_KEY) || '{}'); }
  catch { return {}; }
}

function saveAll(data) {
  localStorage.setItem(NOTIF_KEY, JSON.stringify(data));
}

/** Teacher: send notification to a student */
export function sendNotification(studentId, message, from = '小雷助教') {
  const all = loadAll();
  if (!all[studentId]) all[studentId] = [];
  all[studentId].push({
    id: Date.now().toString(),
    from,
    message,
    timestamp: new Date().toISOString(),
    read: false,
  });
  saveAll(all);
}

/** Teacher: send notification to multiple students */
export function sendBatchNotification(studentIds, message, from = '小雷助教') {
  for (const id of studentIds) {
    sendNotification(id, message, from);
  }
}

/** Student: get my unread notifications */
export function getUnreadNotifications(studentId) {
  const all = loadAll();
  return (all[studentId] || []).filter((n) => !n.read);
}

/** Student: get all my notifications */
export function getAllNotifications(studentId) {
  const all = loadAll();
  return all[studentId] || [];
}

/** Student: mark a notification as read */
export function markAsRead(studentId, notifId) {
  const all = loadAll();
  const list = all[studentId] || [];
  const notif = list.find((n) => n.id === notifId);
  if (notif) notif.read = true;
  saveAll(all);
}

/** Student: mark all as read */
export function markAllAsRead(studentId) {
  const all = loadAll();
  const list = all[studentId] || [];
  list.forEach((n) => { n.read = true; });
  saveAll(all);
}
