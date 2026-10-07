import { authCookie, checkConfig, clearCookie, fail, json, passwordMatches, readJson } from './_lib.js';

// POST { password } → sets the login cookie. DELETE → logs out.
export async function POST(request) {
  const cfg = checkConfig();
  if (cfg) return cfg;
  const { body, error } = await readJson(request, 4096);
  if (error) return error;
  if (!passwordMatches(body.password)) {
    await new Promise(r => setTimeout(r, 600)); // slows down guessing
    return fail('wrong_password', 'Senha incorreta.', 401);
  }
  return json({ ok: true }, 200, { 'set-cookie': authCookie() });
}

export function DELETE() {
  return json({ ok: true }, 200, { 'set-cookie': clearCookie() });
}
