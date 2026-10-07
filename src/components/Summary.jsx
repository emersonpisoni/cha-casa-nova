import { useState } from 'react';
import { DONE } from '../lib/constants.js';
import { totals } from '../lib/costs.js';
import { fmtInput, money, num, parseMoney } from '../lib/format.js';

export default function Summary({ items, budget, canWrite, onSaveBudget }) {
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState('');
  const t = totals(items);
  const left = budget - t.est;
  const done = items.filter(i => DONE.has(i.status)).length;
  const base = Math.max(budget, t.est, 1);
  const pct = v => `${((v / base) * 100).toFixed(2)}%`;

  const startEdit = () => { setDraft(fmtInput(budget)); setEditing(true); };
  const save = () => { setEditing(false); onSaveBudget(parseMoney(draft)); };

  return (
    <section className="summary" aria-label="Resumo do orçamento">
      <div className="tiles">
        <div className="tile">
          <span className="eyebrow">Orçamento</span>
          {editing ? (
            <div className="budget-edit">
              <input className="field num" id="budgetIn" inputMode="decimal" autoFocus value={draft} placeholder="0,00" aria-label="Orçamento total"
                onChange={e => setDraft(e.target.value)} onFocus={e => e.target.select()}
                onKeyDown={e => { if (e.key === 'Enter') save(); if (e.key === 'Escape') setEditing(false); }} />
              <button className="btn primary" onClick={save}>Ok</button>
            </div>
          ) : (
            <>
              <span className="v num">{budget ? money(budget) : '—'}</span>
              {canWrite && <button className="linkish" onClick={startEdit}>{budget ? 'Alterar' : 'Definir orçamento'}</button>}
            </>
          )}
        </div>
        <div className="tile">
          <span className="eyebrow">Estimado</span>
          <span className="v num">{money(t.est)}</span>
          <span className="s">{t.noPrice ? `${t.noPrice} ${t.noPrice === 1 ? 'item' : 'itens'} sem preço ainda` : 'todos os itens com preço'}</span>
        </div>
        <div className="tile">
          <span className="eyebrow">Já comprado</span>
          <span className="v num">{money(t.spent)}</span>
          <span className="s">{done} de {items.length} itens</span>
        </div>
        <div className="tile">
          <span className="eyebrow">{budget ? (left >= 0 ? 'Sobra' : 'Passou') : 'Falta pagar'}</span>
          <span className={`v num ${budget ? (left >= 0 ? 'pos' : 'neg') : ''}`}>{budget ? money(Math.abs(left)) : money(t.est - t.spent)}</span>
          <span className="s">{budget ? 'orçamento menos estimado' : 'estimado menos comprado'}</span>
        </div>
      </div>
      <div>
        <div className="progress" role="img" aria-label={`Comprado ${money(t.spent)} de ${money(base)}`}>
          <i className="spent" style={{ width: pct(t.spent) }} />
          <i className="planned" style={{ width: pct(Math.max(t.est - t.spent, 0)) }} />
        </div>
        <div className="legend">
          <span style={{ '--c': 'var(--good)' }}>Comprado</span>
          <span style={{ '--c': 'var(--accent)' }}>Ainda a comprar</span>
          {num(budget) > 0 && <span style={{ '--c': 'var(--surface-2)' }}>Folga do orçamento</span>}
        </div>
      </div>
    </section>
  );
}
