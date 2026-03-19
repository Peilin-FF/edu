/**
 * Learning progress & achievement system.
 * Persists to localStorage (instant) + GitHub (debounced sync).
 */

import { scheduleSyncToGithub, syncFromGithub as ghPull } from './githubStore';

const STORAGE_KEY = 'edu_progress';

function loadAll() {
  try {
    return JSON.parse(localStorage.getItem(STORAGE_KEY) || '{}');
  } catch { return {}; }
}

function saveAll(data) {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(data));
}

function getStudentData(studentId) {
  const all = loadAll();
  if (!all[studentId]) {
    all[studentId] = {
      practiceHistory: [],  // [{ date, knowledgePoint, total, correct }]
      pptViewed: [],        // [knowledgePoint]
      chatCount: 0,
      achievements: [],     // [{ id, name, icon, unlockedAt }]
      streak: 0,            // consecutive days with practice
      lastPracticeDate: null,
    };
    saveAll(all);
  }
  return all[studentId];
}

function updateStudentData(studentId, updater) {
  const all = loadAll();
  const data = all[studentId] || getStudentData(studentId);
  const updated = updater(data);
  all[studentId] = updated;
  saveAll(all);
  // Trigger async GitHub sync (debounced, non-blocking)
  scheduleSyncToGithub(studentId);
  return updated;
}

/** Pull latest data from GitHub into localStorage */
export async function pullFromGithub(studentId) {
  return ghPull(studentId);
}

// ===== Public API =====

/** Record a practice session result */
export function recordPractice(studentId, knowledgePoint, total, correct) {
  return updateStudentData(studentId, (data) => {
    const today = new Date().toISOString().slice(0, 10);

    data.practiceHistory.push({ date: today, knowledgePoint, total, correct });

    // Update streak
    if (data.lastPracticeDate === today) {
      // Already practiced today, no change
    } else {
      const yesterday = new Date(Date.now() - 86400000).toISOString().slice(0, 10);
      data.streak = data.lastPracticeDate === yesterday ? data.streak + 1 : 1;
      data.lastPracticeDate = today;
    }

    // Check for new achievements
    checkAchievements(data);
    return data;
  });
}

/** Record a PPT viewed */
export function recordPptView(studentId, knowledgePoint) {
  return updateStudentData(studentId, (data) => {
    if (!data.pptViewed.includes(knowledgePoint)) {
      data.pptViewed.push(knowledgePoint);
    }
    checkAchievements(data);
    return data;
  });
}

/** Record a chat message sent */
export function recordChat(studentId) {
  return updateStudentData(studentId, (data) => {
    data.chatCount = (data.chatCount || 0) + 1;
    checkAchievements(data);
    return data;
  });
}

/** Get student progress data */
export function getProgress(studentId) {
  return getStudentData(studentId);
}

/** Get practice stats for a knowledge point */
export function getKnowledgePointStats(studentId, knowledgePoint) {
  const data = getStudentData(studentId);
  const sessions = data.practiceHistory.filter((h) => h.knowledgePoint === knowledgePoint);
  if (sessions.length === 0) return null;

  const totalAttempts = sessions.reduce((s, h) => s + h.total, 0);
  const totalCorrect = sessions.reduce((s, h) => s + h.correct, 0);
  const accuracy = totalAttempts > 0 ? Math.round((totalCorrect / totalAttempts) * 100) : 0;
  const trend = sessions.length >= 2
    ? (sessions[sessions.length - 1].correct / sessions[sessions.length - 1].total) -
      (sessions[0].correct / sessions[0].total)
    : 0;

  return { sessions: sessions.length, totalAttempts, totalCorrect, accuracy, trend };
}

// ===== Achievement Definitions =====

const ACHIEVEMENT_DEFS = [
  { id: 'first_practice', name: '初次练习', icon: '\uD83C\uDF31', desc: '完成第一次强化练习', check: (d) => d.practiceHistory.length >= 1 },
  { id: 'practice_5', name: '勤学好练', icon: '\uD83D\uDD25', desc: '完成 5 次强化练习', check: (d) => d.practiceHistory.length >= 5 },
  { id: 'practice_20', name: '练习达人', icon: '\u2B50', desc: '完成 20 次强化练习', check: (d) => d.practiceHistory.length >= 20 },
  { id: 'perfect_score', name: '满分通关', icon: '\uD83C\uDFC6', desc: '一次练习全部答对', check: (d) => d.practiceHistory.some((h) => h.correct === h.total) },
  { id: 'streak_3', name: '三天连续', icon: '\uD83D\uDD25', desc: '连续 3 天坚持练习', check: (d) => d.streak >= 3 },
  { id: 'streak_7', name: '一周坚持', icon: '\uD83D\uDCAA', desc: '连续 7 天坚持练习', check: (d) => d.streak >= 7 },
  { id: 'ppt_3', name: '好学宝宝', icon: '\uD83D\uDCDA', desc: '查看 3 个知识点的 PPT 讲解', check: (d) => d.pptViewed.length >= 3 },
  { id: 'ppt_10', name: '知识猎人', icon: '\uD83E\uDDD0', desc: '查看 10 个知识点的 PPT 讲解', check: (d) => d.pptViewed.length >= 10 },
  { id: 'chat_10', name: '爱问问题', icon: '\uD83D\uDCAC', desc: '向小智老师提问 10 次', check: (d) => d.chatCount >= 10 },
  { id: 'chat_50', name: '学习伙伴', icon: '\uD83E\uDD1D', desc: '向小智老师提问 50 次', check: (d) => d.chatCount >= 50 },
  { id: 'multi_kp', name: '全面发展', icon: '\uD83C\uDF1F', desc: '在 3 个不同知识点完成练习', check: (d) => {
    const kps = new Set(d.practiceHistory.map((h) => h.knowledgePoint));
    return kps.size >= 3;
  }},
];

function checkAchievements(data) {
  const existingIds = new Set(data.achievements.map((a) => a.id));
  for (const def of ACHIEVEMENT_DEFS) {
    if (!existingIds.has(def.id) && def.check(data)) {
      data.achievements.push({
        id: def.id,
        name: def.name,
        icon: def.icon,
        desc: def.desc,
        unlockedAt: new Date().toISOString(),
      });
    }
  }
}

/** Get all achievement definitions with unlock status */
export function getAllAchievements(studentId) {
  const data = getStudentData(studentId);
  const unlockedIds = new Set(data.achievements.map((a) => a.id));
  return ACHIEVEMENT_DEFS.map((def) => ({
    ...def,
    unlocked: unlockedIds.has(def.id),
    unlockedAt: data.achievements.find((a) => a.id === def.id)?.unlockedAt || null,
  }));
}
