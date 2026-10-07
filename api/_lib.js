// Shared helpers for the API routes. Files starting with "_" are not routes on Vercel.
import { Redis } from '@upstash/redis';
import { createHash, timingSafeEqual } from 'node:crypto';

// The Upstash integration from Vercel's Storage tab sets KV_REST_API_*;
// a database created on upstash.com directly uses UPSTASH_REDIS_REST_*.
const url = process.env.KV_REST_API_URL || process.env.UPSTASH_REDIS_REST_URL;
const token = process.env.KV_REST_API_TOKEN || process.env.UPSTASH_REDIS_REST_TOKEN;

export const redis = url && token ? new Redis({ url, token, automaticDeserialization: false }) : null;

/** Redis keys. Items are one hash field each, so saving one item never overwrites another. */
export const K = { items: 'casa:items', settings: 'casa:settings', version: 'casa:version' };

/** Blob stores are created public or private; private keeps photos behind the password. */
export const blobAccess = process.env.BLOB_ACCESS === 'public' ? 'public' : 'private';

export const json = (data, status = 200, headers = {}) =>
  new Response(JSON.stringify(data), { status, headers: { 'content-type': 'application/json', 'cache-control': 'no-store', ...headers } });

export const fail = (code, message, status) => json({ code, message }, status);

const COOKIE = 'casa_auth';
const authToken = () => createHash('sha256').update('casa-nova:' + process.env.APP_PASSWORD).digest('hex');

function safeEqual(a, b) {
  const A = Buffer.from(a), B = Buffer.from(b);
  return A.length === B.length && timingSafeEqual(A, B);
}

export function checkConfig() {
  if (!process.env.APP_PASSWORD) return fail('not_configured', 'Defina APP_PASSWORD nas variáveis de ambiente da Vercel.', 503);
  if (!redis) return fail('not_configured', 'Conecte um banco Upstash Redis ao projeto na aba Storage da Vercel.', 503);
  return null;
}

export const passwordMatches = password => typeof password === 'string' && safeEqual(
  createHash('sha256').update('casa-nova:' + password).digest('hex'), authToken());

/** Returns an error response unless the request carries the login cookie. */
export function requireAuth(request) {
  const cfg = checkConfig();
  if (cfg) return cfg;
  const m = (request.headers.get('cookie') || '').match(new RegExp(`(?:^|;\\s*)${COOKIE}=([a-f0-9]{64})`));
  return m && safeEqual(m[1], authToken()) ? null : fail('unauthenticated', 'Entre com a senha.', 401);
}

export const authCookie = () => `${COOKIE}=${authToken()}; Path=/; HttpOnly; Secure; SameSite=Lax; Max-Age=${60 * 60 * 24 * 365}`;
export const clearCookie = () => `${COOKIE}=; Path=/; HttpOnly; Secure; SameSite=Lax; Max-Age=0`;

/** Every write bumps this so clients can poll cheaply for changes. */
export const bumpVersion = () => redis.incr(K.version);

export async function readJson(request, maxBytes = 256 * 1024) {
  const text = await request.text();
  if (text.length > maxBytes) return { error: fail('too_large', 'Dados grandes demais.', 413) };
  try {
    return { body: JSON.parse(text || '{}') };
  } catch {
    return { error: fail('invalid_argument', 'JSON inválido.', 400) };
  }
}

export const validId = id => typeof id === 'string' && /^[A-Za-z0-9_-]{1,64}$/.test(id);
