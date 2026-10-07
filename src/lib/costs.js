import { DONE } from './constants.js';
import { num } from './format.js';

export const qty = it => Math.max(num(it.qty) || 1, 0.01);

export const quoteTotal = (q, it) => num(q.price) * qty(it);

/**
 * What an item is expected to cost: the chosen option if there is one,
 * otherwise the cheapest priced option. null when nothing has a price.
 */
export function itemCost(it) {
  const priced = (it.quotes || []).filter(q => num(q.price) > 0);
  if (!priced.length) return null;
  const sorted = priced.map(q => ({ q, v: quoteTotal(q, it) })).sort((a, b) => a.v - b.v);
  const chosen = sorted.find(t => t.q.chosen);
  const pick = chosen || sorted[0];
  return { value: pick.v, chosen: !!chosen, q: pick.q, min: sorted[0].v, n: sorted.length };
}

export function totals(items) {
  let est = 0, spent = 0, noPrice = 0;
  for (const it of items) {
    const c = itemCost(it);
    if (!c) { noPrice++; continue; }
    est += c.value;
    if (DONE.has(it.status)) spent += c.value;
  }
  return { est, spent, noPrice };
}
