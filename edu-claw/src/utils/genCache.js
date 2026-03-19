/**
 * LLM generation result cache.
 * Uses localStorage as primary store, syncs to GitHub via scheduleSyncToGithub.
 */

import { scheduleSyncToGithub } from './githubStore';

const CACHE_KEY = 'edu_gen_cache';

function loadCache() {
  try {
    return JSON.parse(localStorage.getItem(CACHE_KEY) || '{}');
  } catch { return {}; }
}

function saveCache(cache) {
  localStorage.setItem(CACHE_KEY, JSON.stringify(cache));
}

function questionKey(question, prefix) {
  const id = question['题目ID'] || '';
  const text = question['题目'] || '';
  const key = id || text.substring(0, 50);
  return `${prefix}:${key}`;
}

/**
 * Get cached result, or generate and cache it.
 * Also triggers GitHub sync for the new cache entry.
 */
export async function cachedGenerate(prefix, question, generator) {
  const key = questionKey(question, prefix);
  const cache = loadCache();

  if (cache[key]) {
    return { data: cache[key], fromCache: true };
  }

  const result = await generator();
  cache[key] = result;
  saveCache(cache);

  // Trigger GitHub sync (will upload the new cache entry)
  const studentId = localStorage.getItem('edu_current_student');
  if (studentId) scheduleSyncToGithub(studentId);

  return { data: result, fromCache: false };
}

export function clearCacheEntry(prefix, question) {
  const key = questionKey(question, prefix);
  const cache = loadCache();
  delete cache[key];
  saveCache(cache);
}

export function clearAllCache() {
  localStorage.removeItem(CACHE_KEY);
}
