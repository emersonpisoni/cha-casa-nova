const BRL = new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' });

export const money = v => BRL.format(v || 0);

export const num = v => {
  const n = typeof v === 'number' ? v : parseFloat(v);
  return isFinite(n) ? n : 0;
};

/** Reads "1.299,90", "1299,9", "1299.90" or "R$ 1.299" as a number. */
export function parseMoney(s) {
  s = String(s || '').replace(/[^\d.,-]/g, '');
  if (!s) return 0;
  if (s.includes(',')) s = s.replace(/\./g, '').replace(',', '.');
  else if (!/^\d+\.\d{1,2}$/.test(s)) s = s.replace(/\./g, '');
  return Math.round((parseFloat(s) || 0) * 100) / 100;
}

/** Number → "1.299,90" for an input field; empty for zero. */
export const fmtInput = v =>
  num(v) ? num(v).toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 }) : '';

export const fmtQty = v => String(v || 1).replace('.', ',');

export const rid = () => Math.random().toString(36).slice(2, 10);

/** Normalizes a pasted link to an http(s) URL, or '' when it isn't one. */
export function safeUrl(u) {
  u = String(u || '').trim();
  if (!u) return '';
  if (!/^https?:\/\//i.test(u)) u = 'https://' + u;
  try {
    return new URL(u).href;
  } catch {
    return '';
  }
}

export function host(u) {
  try {
    return new URL(u).hostname.replace(/^www\./, '');
  } catch {
    return u;
  }
}
