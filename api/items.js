import { randomBytes } from 'node:crypto';
import { K, bumpVersion, fail, json, readJson, redis, requireAuth, validId } from './_lib.js';

const idParam = request => new URL(request.url).searchParams.get('id');

// PUT ?id=<id> (optional) { data } → creates or replaces an item.
export async function PUT(request) {
  const denied = requireAuth(request);
  if (denied) return denied;
  const { body, error } = await readJson(request);
  if (error) return error;
  if (!body.data || typeof body.data !== 'object') return fail('invalid_argument', 'Faltou o item.', 400);
  const id = idParam(request) || randomBytes(10).toString('hex');
  if (!validId(id)) return fail('invalid_argument', 'Id inválido.', 400);
  const { id: _ignored, ...data } = body.data;
  await redis.hset(K.items, { [id]: JSON.stringify(data) });
  return json({ id, version: String(await bumpVersion()) });
}

// PATCH ?id=<id> { patch } → merges fields into an existing item.
export async function PATCH(request) {
  const denied = requireAuth(request);
  if (denied) return denied;
  const id = idParam(request);
  if (!validId(id)) return fail('invalid_argument', 'Id inválido.', 400);
  const { body, error } = await readJson(request);
  if (error) return error;
  const current = await redis.hget(K.items, id);
  if (!current) return fail('invalid_argument', 'Item não existe mais.', 404);
  const { id: _ignored, ...patch } = body.patch || {};
  await redis.hset(K.items, { [id]: JSON.stringify({ ...JSON.parse(current), ...patch }) });
  return json({ id, version: String(await bumpVersion()) });
}

// DELETE ?id=<id>
export async function DELETE(request) {
  const denied = requireAuth(request);
  if (denied) return denied;
  const id = idParam(request);
  if (!validId(id)) return fail('invalid_argument', 'Id inválido.', 400);
  await redis.hdel(K.items, id);
  return json({ id, version: String(await bumpVersion()) });
}
