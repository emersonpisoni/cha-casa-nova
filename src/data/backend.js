import { createClaudeBackend } from './claudeBackend.js';
import { createLocalBackend } from './localBackend.js';
import { createVercelBackend } from './vercelBackend.js';

/** True when this site has the project's API (deployed on Vercel, or `vercel dev`). */
async function hasApi() {
  try {
    const res = await fetch('/api/state', { credentials: 'same-origin' });
    return (res.headers.get('content-type') || '').includes('application/json');
  } catch {
    return false;
  }
}

/**
 * Picks where the data lives:
 * - claude.ai artifact → the artifact's shared database;
 * - Vercel (or `vercel dev`) → the project's API with Redis and Blob;
 * - plain `npm run dev` → this browser's localStorage.
 * Resolves null on claude.ai without database access.
 */
export async function connectBackend() {
  const C = window.claude;
  if (C?.use) {
    const use = n => C.use(n).catch(() => null);
    const [db, user, assets, downloads] = await Promise.all([use('db'), use('user'), use('assets'), use('downloads')]);
    return db ? createClaudeBackend({ db, user, assets, downloads }) : null;
  }
  return (await hasApi()) ? createVercelBackend() : createLocalBackend();
}
