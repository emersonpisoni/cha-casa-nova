import { useState } from 'react';
import { totals } from '../lib/costs.js';
import { money } from '../lib/format.js';
import ItemRow from './ItemRow.jsx';

/** One room page: title with rename/delete, the item rows, and an add row. */
export default function ItemList({ tab, items, allCount, canWrite, photoUrl, renaming, setRenaming, onOpen, onAdd, onPick, onRename, onDeleteRoom }) {
  const [openIds, setOpenIds] = useState(() => new Set());
  const [confirmDelete, setConfirmDelete] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const title = tab || 'Todos os ambientes';
  const t = totals(items);

  const toggle = id => setOpenIds(s => { const n = new Set(s); n.has(id) ? n.delete(id) : n.add(id); return n; });
  const doDelete = async () => { setDeleting(true); await onDeleteRoom(); setDeleting(false); setConfirmDelete(false); };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
      <div className="sheet-title">
        {renaming
          ? <RenameField initial={tab} onSave={name => onRename(name)} onCancel={() => setRenaming(false)} />
          : (
            <span className="left">
              <h2>{title}</h2>
              {tab && canWrite && (
                <span className="tools">
                  <button className="linkish" onClick={() => setRenaming(true)}>Renomear</button>
                  <button className="linkish" style={{ color: 'var(--bad)' }} onClick={() => setConfirmDelete(true)}>Excluir página</button>
                </span>
              )}
            </span>
          )}
        <span>
          <span className="num">{money(t.est)}</span>{' '}
          <span className="muted">· {items.length} {items.length === 1 ? 'item' : 'itens'}</span>
        </span>
      </div>

      {confirmDelete && (
        <div className="confirm">
          <p>
            Excluir a página <b>{tab}</b>
            {items.length > 0 && (items.length === 1 ? ' e o item dela' : ` e os ${items.length} itens dela`)}? Isso não pode ser desfeito.
          </p>
          <span className="actions">
            <button className="btn" onClick={() => setConfirmDelete(false)}>Cancelar</button>
            <button className="btn danger armed" disabled={deleting} onClick={doDelete}>{deleting ? 'Excluindo…' : 'Excluir página'}</button>
          </span>
        </div>
      )}

      <div className="rows">
        {items.length
          ? items.map(it => (
            <ItemRow key={it.id} item={it} showRoom={!tab} open={openIds.has(it.id)} canWrite={canWrite} photoUrl={photoUrl}
              onOpen={() => onOpen(it.id)} onToggle={() => toggle(it.id)} onPick={qid => onPick(it, qid)} />
          ))
          : <p className="muted" style={{ margin: 0, padding: '16px 14px' }}>{allCount ? `Nada em ${title} ainda.` : 'Nenhum item ainda. Adicione o primeiro abaixo.'}</p>}
        {canWrite && <button className="addrow" onClick={onAdd}>+ Adicionar item{tab ? ' em ' + tab : ''}</button>}
      </div>
    </div>
  );
}

function RenameField({ initial, onSave, onCancel }) {
  const [value, setValue] = useState(initial);
  return (
    <span className="rename">
      <input className="field" autoFocus value={value} maxLength={40} aria-label="Novo nome da página"
        onFocus={e => e.target.select()} onChange={e => setValue(e.target.value)}
        onKeyDown={e => { if (e.key === 'Enter') onSave(value); if (e.key === 'Escape') onCancel(); }} />
      <button className="btn primary" onClick={() => onSave(value)}>Salvar</button>
      <button className="btn" onClick={onCancel}>Cancelar</button>
    </span>
  );
}
