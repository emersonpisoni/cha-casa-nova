import { K, bumpVersion, fail, json, readJson, redis, requireAuth } from './_lib.js';

// PUT { data } → replaces the settings (budget, room pages).
export async function PUT(request) {
  const denied = requireAuth(request);
  if (denied) return denied;
  const { body, error } = await readJson(request);
  if (error) return error;
  if (!body.data || typeof body.data !== 'object') return fail('invalid_argument', 'Faltaram as configurações.', 400);
  await redis.set(K.settings, JSON.stringify(body.data));
  return json({ version: String(await bumpVersion()) });
}
