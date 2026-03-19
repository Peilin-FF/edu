/**
 * Simple account system.
 * Stores student accounts in localStorage with student ID + password.
 * GitHub config is bound to the account.
 */

const ACCOUNTS_KEY = 'edu_accounts';
const CURRENT_KEY = 'edu_current_account';

function loadAccounts() {
  try { return JSON.parse(localStorage.getItem(ACCOUNTS_KEY) || '{}'); }
  catch { return {}; }
}

function saveAccounts(accounts) {
  localStorage.setItem(ACCOUNTS_KEY, JSON.stringify(accounts));
}

/**
 * Register a new account or update password.
 * @param {string} studentId
 * @param {string} password
 * @param {string} name
 * @param {string} file - student data filename
 */
export function registerAccount(studentId, password, name, file) {
  const accounts = loadAccounts();
  accounts[studentId] = {
    password,
    name,
    file,
    createdAt: accounts[studentId]?.createdAt || new Date().toISOString(),
  };
  saveAccounts(accounts);
}

/**
 * Login with student ID + password.
 * Returns account info or null if failed.
 */
export function login(studentId, password) {
  const accounts = loadAccounts();
  const account = accounts[studentId];
  if (!account) return null;
  if (account.password !== password) return null;

  // Set current account
  localStorage.setItem(CURRENT_KEY, studentId);
  return { studentId, name: account.name, file: account.file };
}

/** Get currently logged-in account */
export function getCurrentAccount() {
  const studentId = localStorage.getItem(CURRENT_KEY);
  if (!studentId) return null;
  const accounts = loadAccounts();
  const account = accounts[studentId];
  if (!account) return null;
  return { studentId, name: account.name, file: account.file };
}

/** Logout */
export function logout() {
  localStorage.removeItem(CURRENT_KEY);
}

/** Check if an account exists */
export function accountExists(studentId) {
  const accounts = loadAccounts();
  return !!accounts[studentId];
}

/** Bind GitHub config to current account */
export function bindGithub(studentId, token, username, avatar) {
  const accounts = loadAccounts();
  if (!accounts[studentId]) return;
  accounts[studentId].github = { token, username, avatar };
  saveAccounts(accounts);
}

/** Get GitHub config for current account */
export function getAccountGithub(studentId) {
  const accounts = loadAccounts();
  return accounts[studentId]?.github || null;
}

/** Remove GitHub binding from account */
export function unbindGithub(studentId) {
  const accounts = loadAccounts();
  if (!accounts[studentId]) return;
  delete accounts[studentId].github;
  saveAccounts(accounts);
}
