import { del, get, put } from '@vercel/blob';
import { blobAccess, fail, json, requireAuth } from './_lib.js';

const MAX_BYTES = 4 * 1024 * 1024; // Vercel functions accept bodies up to 4.5 MB
const TYPES = { 'image/jpeg': 'jpg', 'image/png': 'png', 'image/webp': 'webp', 'image/gif': 'gif' };
const validPath = p => typeof p === 'string' && /^photos\/[A-Za-z0-9._-]+$/.test(p);
const pathParam = request => new URL(request.url).searchParams.get('p');

// POST (image bytes as the body) → { id }, the photo's pathname in the store.
export async function POST(request) {
  const denied = requireAuth(request);
  if (denied) return denied;
  const type = (request.headers.get('content-type') || '').split(';')[0].trim();
  if (!TYPES[type]) return fail('unsupported_type', 'Envie uma imagem JPG, PNG, WebP ou GIF.', 415);
  const bytes = await request.arrayBuffer();
  if (!bytes.byteLength) return fail('invalid_argument', 'Imagem vazia.', 400);
  if (bytes.byteLength > MAX_BYTES) return fail('too_large', 'Foto grande demais.', 413);
  const blob = await put(`photos/foto.${TYPES[type]}`, bytes, { access: blobAccess, contentType: type, addRandomSuffix: true });
  return json({ id: blob.pathname });
}

// GET ?p=<pathname> → the image, only for people logged in.
export async function GET(request) {
  const denied = requireAuth(request);
  if (denied) return denied;
  const p = pathParam(request);
  if (!validPath(p)) return fail('invalid_argument', 'Foto inválida.', 400);
  const found = await get(p, { access: blobAccess });
  if (!found || found.statusCode !== 200) return fail('not_found', 'Foto não encontrada.', 404);
  return new Response(found.stream, {
    headers: { 'content-type': found.blob.contentType, 'cache-control': 'private, max-age=31536000, immutable' },
  });
}

// DELETE ?p=<pathname>
export async function DELETE(request) {
  const denied = requireAuth(request);
  if (denied) return denied;
  const p = pathParam(request);
  if (!validPath(p)) return fail('invalid_argument', 'Foto inválida.', 400);
  await del(p);
  return json({ ok: true });
}
