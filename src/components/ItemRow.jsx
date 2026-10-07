import { useEffect, useState } from 'react';
import { stName } from '../lib/constants.js';
import { coverPhoto, quotePhotos } from '../lib/photos.js';
import { itemCost, qty, quoteTotal } from '../lib/costs.js';
import { host, money, num, safeUrl } from '../lib/format.js';

export default function ItemRow({ item, showRoom, open, canWrite, photoUrl, onOpen, onToggle, onPick }) {
  const c = itemCost(item);
  const status = item.status || 'pesquisando';
  const quotes = (item.quotes || []).filter(q => num(q.price) > 0 || q.link || quotePhotos(q).length);
  const photo = coverPhoto(item);

  const sub = [];
  if (showRoom) sub.push(item.room || 'Geral');
  if (c?.chosen) sub.push(safeUrl(c.q.link) ? 'escolhido: ' + host(safeUrl(c.q.link)) : 'opção escolhida');
  else if (quotes.length === 1 && safeUrl(quotes[0].link)) sub.push(host(safeUrl(quotes[0].link)));

  const onKey = e => { if (e.target === e.currentTarget && (e.key === 'Enter' || e.key === ' ')) { e.preventDefault(); onOpen(); } };

  return (
    <div className="row">
      <div className="card" role="button" tabIndex={0} aria-label={`Editar ${item.name || 'item'}`} onClick={onOpen} onKeyDown={onKey}>
        {photo
          ? <img className="thumb" src={photoUrl(photo)} alt="" loading="lazy" />
          : <span className="thumb" aria-hidden="true">{(item.name || '?').trim().charAt(0).toUpperCase()}</span>}
        <span className="main">
          <span className="name">{item.name || 'Sem nome'}</span>
          {sub.length > 0 && <span className="meta">{sub.join(' · ')}</span>}
          {quotes.length > 0 && (
            <button className="toggle" aria-expanded={open} onClick={e => { e.stopPropagation(); onToggle(); }}>
              {quotes.length === 1 ? 'Ver opção' : `Ver ${quotes.length} opções`} <span className="chev" aria-hidden="true">▾</span>
            </button>
          )}
        </span>
        <span className={`pill st-${status}`}>{stName(status)}</span>
        {c ? <span className="price">{money(c.value)}</span> : <span className="price none">sem preço</span>}
      </div>
      {open && quotes.length > 0 && <Options item={item} quotes={quotes} canWrite={canWrite} photoUrl={photoUrl} onPick={onPick} />}
    </div>
  );
}

function Options({ item, quotes, canWrite, photoUrl, onPick }) {
  const [viewing, setViewing] = useState(null); // { photos, index }
  const priced = quotes.filter(q => num(q.price) > 0).map(q => quoteTotal(q, item));
  const min = priced.length > 1 ? Math.min(...priced) : null;
  const showUnit = qty(item) !== 1;
  const sorted = quotes.slice().sort((a, b) => (num(a.price) || Infinity) - (num(b.price) || Infinity));

  return (
    <div className="opts">
      {sorted.map((q, i) => {
        const url = safeUrl(q.link), tot = quoteTotal(q, item);
        return (
          <div className="opt" key={q.id || i}>
            <span className="i">{i + 1}</span>
            {quotePhotos(q).length ? (
              <button className="opt-photo" aria-label={`Ver fotos da opção ${i + 1}`} onClick={() => setViewing({ photos: quotePhotos(q), index: 0 })}>
                <img src={photoUrl(quotePhotos(q)[0])} alt="" loading="lazy" />
                {quotePhotos(q).length > 1 && <span className="more">+{quotePhotos(q).length - 1}</span>}
              </button>
            ) : <span className="opt-photo empty" aria-hidden="true">sem foto</span>}
            <span className="where">
              {url ? <a href={url} target="_blank" rel="noopener noreferrer">{host(url)} ↗</a> : <span className="muted">sem link</span>}
            </span>
            <span className="tot">
              {num(q.price) > 0
                ? <>{money(tot)}{showUnit && <small>{money(q.price)} / {item.unit || 'un'}</small>}</>
                : <span className="muted">sem preço</span>}
            </span>
            <span className="act">
              {q.chosen
                ? <span className="badge chosen">Escolhido</span>
                : canWrite && <button className="pick" onClick={() => onPick(q.id)}>Escolher</button>}
              {min !== null && num(q.price) > 0 && tot === min && <span className="badge cheap">menor preço</span>}
            </span>
          </div>
        );
      })}
      {viewing && <Lightbox {...viewing} photoUrl={photoUrl} onClose={() => setViewing(null)} />}
    </div>
  );
}

function Lightbox({ photos, index, photoUrl, onClose }) {
  const [i, setI] = useState(index);
  const go = step => setI(n => (n + step + photos.length) % photos.length);
  useEffect(() => {
    const onKey = e => {
      if (e.key === 'Escape') onClose();
      if (e.key === 'ArrowRight') go(1);
      if (e.key === 'ArrowLeft') go(-1);
    };
    document.addEventListener('keydown', onKey);
    return () => document.removeEventListener('keydown', onKey);
  });
  return (
    <div className="lightbox" role="dialog" aria-modal="true" aria-label="Fotos da opção" onClick={e => { if (e.target === e.currentTarget) onClose(); }}>
      <img src={photoUrl(photos[i])} alt={`Foto ${i + 1} de ${photos.length}`} />
      <div className="lb-bar">
        {photos.length > 1 && <button className="btn" onClick={() => go(-1)}>‹ Anterior</button>}
        {photos.length > 1 && <span className="num">{i + 1} / {photos.length}</span>}
        {photos.length > 1 && <button className="btn" onClick={() => go(1)}>Próxima ›</button>}
        <button className="btn primary" onClick={onClose}>Fechar</button>
      </div>
    </div>
  );
}
