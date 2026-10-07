import { K, json, redis, requireAuth } from './_lib.js';

// GET ?since=<version> → everything, or { unchanged: true } when nothing changed.
export async function GET(request) {
  const denied = requireAuth(request);
  if (denied) return denied;
  const version = String((await redis.get(K.version)) ?? '0');
  const since = new URL(request.url).searchParams.get('since');
  if (since === version) return json({ version, unchanged: true });

  const [rawItems, rawSettings] = await Promise.all([redis.hgetall(K.items), redis.get(K.settings)]);
  const items = hashEntries(rawItems).map(([id, v]) => ({ ...JSON.parse(v), id }));
  const settings = rawSettings ? JSON.parse(rawSettings) : {};
  return json({ version, items, settings });
}

/** HGETALL comes back as a flat [field, value, ...] list or as an object, depending on the client's settings. */
function hashEntries(raw) {
  if (!raw) return [];
  if (!Array.isArray(raw)) return Object.entries(raw);
  const out = [];
  for (let i = 0; i < raw.length; i += 2) out.push([raw[i], raw[i + 1]]);
  return out;
}
