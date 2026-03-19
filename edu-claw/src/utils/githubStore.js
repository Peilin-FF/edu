/**
 * GitHub-based persistent storage layer.
 * Each student gets a private repo: edu-memory-{username}
 *
 * Repo structure:
 * ├── README.md                  (auto-generated)
 * ├── profile.json               (学生身份信息)
 * ├── progress.json              (学习进度+成就+连续天数)
 * ├── chat-summary.md            (小智老师对话记忆摘要)
 * ├── knowledge-mastery.json     (知识图谱掌握情况)
 * ├── gen-cache/                 (AI 生成缓存：练习题、互动实验)
 * │   ├── practice-001.json
 * │   ├── interactive-004.json
 * │   └── ...
 * └── wrong-questions.json       (个人错题本)
 */

const API = 'https://api.github.com';
const REPO_PREFIX = 'edu-memory';

function headers(token) {
  return {
    Authorization: `Bearer ${token}`,
    Accept: 'application/vnd.github+json',
    'Content-Type': 'application/json',
  };
}

function repoName(username) {
  return `${REPO_PREFIX}-${username}`;
}

// ===== Token & Config =====
// Token persisted in localStorage, bound to student account

export function getGithubConfig() {
  const token = localStorage.getItem('github_token');
  const username = localStorage.getItem('github_username');
  const avatar = localStorage.getItem('github_avatar');
  return { token, username, avatar };
}

export function saveGithubConfig(token, username, avatar) {
  localStorage.setItem('github_token', token);
  localStorage.setItem('github_username', username);
  if (avatar) localStorage.setItem('github_avatar', avatar);
}

export function clearGithubConfig() {
  localStorage.removeItem('github_token');
  localStorage.removeItem('github_username');
  localStorage.removeItem('github_avatar');
}

export function isGithubConnected() {
  const { token, username } = getGithubConfig();
  return !!(token && username);
}

// ===== API Helpers =====

async function ghFetch(path, token, options = {}) {
  const res = await fetch(`${API}${path}`, {
    ...options,
    headers: { ...headers(token), ...options.headers },
  });
  return res;
}

// ===== Validate Token =====

export async function validateToken(token) {
  const res = await ghFetch('/user', token);
  if (!res.ok) throw new Error('Token 无效或已过期');
  const user = await res.json();
  return { username: user.login, avatar: user.avatar_url, name: user.name };
}

// ===== Repo Management =====

export async function ensureRepo(token, username) {
  const repo = repoName(username);
  const check = await ghFetch(`/repos/${username}/${repo}`, token);
  if (check.ok) return { created: false, repo };

  const create = await ghFetch('/user/repos', token, {
    method: 'POST',
    body: JSON.stringify({
      name: repo,
      description: 'EduClaw 学习记忆存储（自动创建，请勿删除）',
      private: true,
      auto_init: true,
    }),
  });

  if (!create.ok) {
    const err = await create.json();
    throw new Error(`创建仓库失败: ${err.message}`);
  }

  return { created: true, repo };
}

// ===== File Operations =====

/** Read a file from the repo. Returns { content, sha } or null if not found. */
export async function readFile(token, username, path) {
  const repo = repoName(username);
  const res = await ghFetch(`/repos/${username}/${repo}/contents/${path}`, token);
  if (res.status === 404) return null;
  if (!res.ok) throw new Error(`读取文件失败: ${res.status}`);

  const data = await res.json();
  const decoded = new TextDecoder().decode(
    Uint8Array.from(atob(data.content.replace(/\n/g, '')), (c) => c.charCodeAt(0))
  );
  return { content: decoded, sha: data.sha };
}

/** Write (create or update) a file in the repo. */
export async function writeFile(token, username, path, content, message) {
  const repo = repoName(username);

  let sha = undefined;
  const existing = await readFile(token, username, path);
  if (existing) sha = existing.sha;

  const encoded = btoa(
    new Uint8Array(new TextEncoder().encode(content))
      .reduce((data, byte) => data + String.fromCharCode(byte), '')
  );

  const res = await ghFetch(`/repos/${username}/${repo}/contents/${path}`, token, {
    method: 'PUT',
    body: JSON.stringify({
      message: message || `update ${path}`,
      content: encoded,
      ...(sha ? { sha } : {}),
    }),
  });

  if (!res.ok) {
    const err = await res.json();
    throw new Error(`写入文件失败: ${err.message}`);
  }
  return true;
}

/** Read JSON file, returns parsed object or null */
async function readJson(token, username, path) {
  const file = await readFile(token, username, path);
  if (!file) return null;
  try { return JSON.parse(file.content); } catch { return null; }
}

/** Write JSON file */
async function writeJson(token, username, path, data, message) {
  return writeFile(token, username, path, JSON.stringify(data, null, 2), message);
}

// ===== High-Level Data Operations =====

// --- Progress ---
export async function loadProgress(token, username) {
  return readJson(token, username, 'progress.json');
}

export async function saveProgress(token, username, data) {
  const date = new Date().toLocaleDateString('zh-CN');
  return writeJson(token, username, 'progress.json', data, `学习进度更新 ${date}`);
}

// --- Chat Summary ---
export async function loadChatSummary(token, username) {
  const file = await readFile(token, username, 'chat-summary.md');
  return file?.content || '';
}

export async function saveChatSummary(token, username, markdown) {
  return writeFile(token, username, 'chat-summary.md', markdown, '对话记忆更新');
}

// --- Knowledge Mastery (知识图谱掌握情况) ---
export async function loadKnowledgeMastery(token, username) {
  return readJson(token, username, 'knowledge-mastery.json');
}

export async function saveKnowledgeMastery(token, username, masteryData) {
  return writeJson(token, username, 'knowledge-mastery.json', masteryData, '知识掌握度更新');
}

// --- Wrong Questions (个人错题本) ---
export async function loadWrongQuestions(token, username) {
  return readJson(token, username, 'wrong-questions.json');
}

export async function saveWrongQuestions(token, username, questions) {
  return writeJson(token, username, 'wrong-questions.json', questions, '错题本更新');
}

// --- Student Profile ---
export async function loadProfile(token, username) {
  return readJson(token, username, 'profile.json');
}

export async function saveProfile(token, username, profile) {
  return writeJson(token, username, 'profile.json', profile, '个人信息更新');
}

// --- Gen Cache (AI 生成缓存) ---
export async function loadGenCache(token, username, cacheKey) {
  return readJson(token, username, `gen-cache/${cacheKey}.json`);
}

export async function saveGenCache(token, username, cacheKey, data) {
  return writeJson(token, username, `gen-cache/${cacheKey}.json`, data, `缓存生成内容: ${cacheKey}`);
}

// ===== Full Sync =====

let syncTimer = null;

/** Debounced sync: triggers 2s after last data change */
export function scheduleSyncToGithub(studentId) {
  if (syncTimer) clearTimeout(syncTimer);
  syncTimer = setTimeout(() => doFullSync(studentId), 2000);
}

async function doFullSync(studentId) {
  const { token, username } = getGithubConfig();
  if (!token || !username) return;

  try {
    // 1. Sync progress
    const progressData = localStorage.getItem('edu_progress');
    if (progressData) {
      const all = JSON.parse(progressData);
      if (all[studentId]) {
        await saveProgress(token, username, all[studentId]);
      }
    }

    // 2. Sync gen cache
    const cacheData = localStorage.getItem('edu_gen_cache');
    if (cacheData) {
      const cache = JSON.parse(cacheData);
      // Only sync entries that haven't been synced yet
      const syncedKeys = JSON.parse(localStorage.getItem('edu_gen_cache_synced') || '[]');
      const newKeys = Object.keys(cache).filter((k) => !syncedKeys.includes(k));

      for (const key of newKeys) {
        const safeKey = key.replace(/[^a-zA-Z0-9_-]/g, '_');
        await saveGenCache(token, username, safeKey, cache[key]);
        syncedKeys.push(key);
      }
      localStorage.setItem('edu_gen_cache_synced', JSON.stringify(syncedKeys));
    }

    console.log('[GitHub Sync] Full sync completed');
  } catch (e) {
    console.warn('[GitHub Sync] Failed:', e.message);
  }
}

/** Pull all data from GitHub and merge into localStorage */
export async function syncFromGithub(studentId) {
  const { token, username } = getGithubConfig();
  if (!token || !username) return false;

  try {
    // 1. Pull progress
    const remote = await loadProgress(token, username);
    if (remote) {
      const localAll = JSON.parse(localStorage.getItem('edu_progress') || '{}');
      const local = localAll[studentId] || {};

      const merged = {
        ...local,
        ...remote,
        practiceHistory: mergeArrays(
          local.practiceHistory || [], remote.practiceHistory || [],
          (a, b) => a.date === b.date && a.knowledgePoint === b.knowledgePoint && a.correct === b.correct
        ),
        pptViewed: [...new Set([...(local.pptViewed || []), ...(remote.pptViewed || [])])],
        achievements: mergeArrays(
          local.achievements || [], remote.achievements || [],
          (a, b) => a.id === b.id
        ),
        chatCount: Math.max(local.chatCount || 0, remote.chatCount || 0),
        streak: Math.max(local.streak || 0, remote.streak || 0),
        lastPracticeDate: [local.lastPracticeDate, remote.lastPracticeDate]
          .filter(Boolean).sort().pop() || null,
      };

      localAll[studentId] = merged;
      localStorage.setItem('edu_progress', JSON.stringify(localAll));
    }

    // 2. Pull gen cache entries
    // List gen-cache directory
    const repo = repoName(username);
    const dirRes = await ghFetch(`/repos/${username}/${repo}/contents/gen-cache`, token);
    if (dirRes.ok) {
      const files = await dirRes.json();
      const localCache = JSON.parse(localStorage.getItem('edu_gen_cache') || '{}');
      const syncedKeys = [];

      for (const file of files) {
        if (!file.name.endsWith('.json')) continue;
        const cacheKey = file.name.replace('.json', '');
        // Only pull if not in local cache
        const localKey = Object.keys(localCache).find(
          (k) => k.replace(/[^a-zA-Z0-9_-]/g, '_') === cacheKey
        );
        if (!localKey) {
          const data = await loadGenCache(token, username, cacheKey);
          if (data) {
            // Store with the sanitized key — user will see it work regardless
            localCache[cacheKey] = data;
          }
        }
        syncedKeys.push(cacheKey);
      }

      localStorage.setItem('edu_gen_cache', JSON.stringify(localCache));
      localStorage.setItem('edu_gen_cache_synced', JSON.stringify(syncedKeys));
    }

    // 3. Pull chat summary
    const chatSummary = await loadChatSummary(token, username);
    if (chatSummary) {
      localStorage.setItem('edu_chat_summary', chatSummary);
    }

    console.log('[GitHub Sync] Pull completed');
    return true;
  } catch (e) {
    console.warn('[GitHub Sync] Pull failed:', e.message);
    return false;
  }
}

/** Save student's full context to GitHub (called on major events) */
export async function saveFullContext(studentId, { student, masteryMap, wrongQuestions }) {
  const { token, username } = getGithubConfig();
  if (!token || !username) return;

  try {
    // Save profile
    if (student) {
      await saveProfile(token, username, {
        studentId: student['学生ID'],
        name: student['姓名'],
        examDate: student['作业考试时间'],
        totalScore: student['总分'],
        savedAt: new Date().toISOString(),
      });
    }

    // Save knowledge mastery
    if (masteryMap) {
      const mastery = {};
      for (const [name, data] of masteryMap.entries()) {
        mastery[name] = {
          mastery: data.mastery,
          earned: data.earned,
          possible: data.possible,
          wrongCount: data.wrongQuestions.length,
        };
      }
      await saveKnowledgeMastery(token, username, mastery);
    }

    // Save wrong questions
    if (wrongQuestions && wrongQuestions.length > 0) {
      await saveWrongQuestions(token, username, wrongQuestions);
    }

    console.log('[GitHub Sync] Full context saved');
  } catch (e) {
    console.warn('[GitHub Sync] Context save failed:', e.message);
  }
}

function mergeArrays(a, b, isEqual) {
  const result = [...a];
  for (const item of b) {
    if (!result.some((existing) => isEqual(existing, item))) {
      result.push(item);
    }
  }
  return result;
}
