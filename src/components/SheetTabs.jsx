import { useEffect, useRef, useState } from 'react';

/** Room pages along the bottom, like spreadsheet tabs. Double-click renames. */
export default function SheetTabs({ rooms, items, tab, canWrite, onSelect, onCreate, onRename }) {
  const [adding, setAdding] = useState(false);
  const [name, setName] = useState('');
  const activeRef = useRef(null);

  useEffect(() => { activeRef.current?.scrollIntoView({ block: 'nearest', inline: 'nearest' }); }, [tab]);

  const count = r => items.filter(i => (i.room || 'Geral') === r).length;
  const create = () => { setAdding(false); onCreate(name); setName(''); };

  const tabButton = (value, label, n) => (
    <button key={value || '__all'} ref={tab === value ? activeRef : null} className={`tab ${tab === value ? 'on' : ''}`}
      onClick={() => onSelect(value)}
      onDoubleClick={() => { if (value && canWrite) onRename(value); }}>
      {label}{n > 0 && <span className="n">{n}</span>}
    </button>
  );

  return (
    <nav className="tabs" aria-label="Ambientes">
      <div className="tabs-in">
        {tabButton('', 'Tudo', items.length)}
        {rooms.map(r => tabButton(r, r, count(r)))}
        {canWrite && (adding ? (
          <span className="tab-new">
            <input className="field" autoFocus value={name} placeholder="Novo ambiente" aria-label="Nome do novo ambiente" maxLength={40}
              onChange={e => setName(e.target.value)}
              onKeyDown={e => { if (e.key === 'Enter') create(); if (e.key === 'Escape') setAdding(false); }} />
            <button className="btn primary" onClick={create}>Criar</button>
          </span>
        ) : (
          <button className="tab plus" title="Criar ambiente" onClick={() => setAdding(true)}>+</button>
        ))}
      </div>
    </nav>
  );
}
