import { useEffect, useState } from 'react';
import { STATUS, UNITS } from '../lib/constants.js';
import { quoteTotal } from '../lib/costs.js';
import { fmtInput, fmtQty, host, money, parseMoney, rid, safeUrl } from '../lib/format.js';
import { useToast } from './Toast.jsx';

const blankQuote = () => ({ id: rid(), priceText: '', link: '', chosen: false, photos: [] });

function toDraft(item, defaultRoom) {
  const src = item || { name: '', room: defaultRoom || 'Geral', status: 'pesquisando', qty: 1, unit: 'un', quotes: [], photos: [] };
  const quotes = (src.quotes || []).map(q => ({ id: q.id || rid(), priceText: fmtInput(q.price), link: q.link || '', chosen: !!q.chosen, photos: [...(q.photos || [])] }));
  if (!item && !quotes.length) quotes.push(blankQuote());
  // Older items kept photos on the item itself; they move to the first option.
  const legacy = src.photos || [];
  if (legacy.length) {
    if (!quotes.length) quotes.push(blankQuote());
    quotes[0] = { ...quotes[0], photos: [...legacy, ...quotes[0].photos] };
  }
  return { ...src, qtyText: fmtQty(src.qty), quotes, photos: [] };
}

/** Shrinks big photos before upload so they load fast on phones. */
async function shrink(file) {
  try {
    const bmp = await createImageBitmap(file);
    const s = Math.min(1, 1400 / Math.max(bmp.width, bmp.height));
    if (s === 1 && file.size < 900000) return file;
    const c = document.createElement('canvas');
    c.width = Math.round(bmp.width * s);
    c.height = Math.round(bmp.height * s);
    c.getContext('2d').drawImage(bmp, 0, 0, c.width, c.height);
    return await new Promise(r => c.toBlob(b => r(b || file), 'image/jpeg', 0.84));
  } catch {
    return file;
  }
}

export default function ItemEditor({ item, defaultRoom, rooms, access, authorName, backend, onSave, onDelete, onClose }) {
  const toast = useToast();
  const [d, setD] = useState(() => toDraft(item, defaultRoom));
  const [uploading, setUploading] = useState({}); // quote id → photos in flight
  const [activeQuote, setActiveQuote] = useState(null);
  const [saving, setSaving] = useState(false);
  const [armed, setArmed] = useState(false);
  const ro = !access.canWrite;
  const canPhoto = access.canUpload && !ro;

  const set = patch => setD(prev => ({ ...prev, ...patch }));
  const setQuote = (id, patch) => setD(prev => ({ ...prev, quotes: prev.quotes.map(q => (q.id === id ? { ...q, ...patch } : q)) }));
  const qtyNum = parseMoney(d.qtyText) || 1;
  const priced = d.quotes.map(q => ({ ...q, price: parseMoney(q.priceText) })).filter(q => q.price > 0);
  const minTot = priced.length > 1 ? Math.min(...priced.map(q => quoteTotal(q, { qty: qtyNum }))) : null;
  const roomOptions = [...new Set([...rooms, d.room].filter(Boolean))];

  async function upload(files, quoteId) {
    const imgs = [...files].filter(f => f.type.startsWith('image/'));
    if (!imgs.length || !canPhoto) return;
    const bump = n => setUploading(u => ({ ...u, [quoteId]: (u[quoteId] || 0) + n }));
    bump(imgs.length);
    for (const f of imgs) {
      try {
        const id = await backend.uploadPhoto(await shrink(f));
        setD(prev => ({ ...prev, quotes: prev.quotes.map(q => (q.id === quoteId ? { ...q, photos: [...q.photos, id] } : q)) }));
      } catch (e) {
        toast(e?.code === 'too_large' ? 'Foto grande demais (máx. 20 MB)' : 'Não foi possível enviar a foto');
      }
      bump(-1);
    }
  }

  /** A pasted image goes to the option being edited, else the last one (or a new one). */
  function pasteTarget() {
    if (d.quotes.some(q => q.id === activeQuote)) return activeQuote;
    if (d.quotes.length) return d.quotes[d.quotes.length - 1].id;
    const q = blankQuote();
    setD(prev => ({ ...prev, quotes: [...prev.quotes, q] }));
    return q.id;
  }

  useEffect(() => {
    const onPaste = e => {
      const files = [...(e.clipboardData?.files || [])].filter(f => f.type.startsWith('image/'));
      if (files.length && canPhoto) { e.preventDefault(); upload(files, pasteTarget()); }
    };
    const onKey = e => { if (e.key === 'Escape') onClose(); };
    document.addEventListener('paste', onPaste);
    document.addEventListener('keydown', onKey);
    return () => { document.removeEventListener('paste', onPaste); document.removeEventListener('keydown', onKey); };
  });

  async function save() {
    const name = d.name.trim();
    if (!name) { toast('Dê um nome para o item'); return; }
    const quotes = d.quotes
      .map(q => ({ id: q.id, price: parseMoney(q.priceText), link: q.link.trim(), chosen: q.chosen, photos: q.photos }))
      .filter(q => q.price || q.link || q.photos.length);
    const { qtyText, id, ...rest } = d;
    setSaving(true);
    const ok = await onSave({ ...rest, name, qty: qtyNum, quotes });
    if (!ok) setSaving(false);
  }

  async function remove() {
    if (!armed) { setArmed(true); return; }
    await onDelete();
  }

  return (
    <div className="overlay" onClick={e => { if (e.target === e.currentTarget) onClose(); }}>
      <div className="sheet" role="dialog" aria-modal="true" aria-labelledby="sheetTitle">
        <div className="sheet-h">
          <h2 id="sheetTitle">{item ? 'Editar item' : 'Novo item'}</h2>
          <button className="btn ghost" onClick={onClose}>Fechar</button>
        </div>

        <div className="sheet-b">
          <div className="sec">
            <div className="f">
              <label htmlFor="e_name">O que é</label>
              <input className="field" id="e_name" autoFocus={!item} value={d.name} placeholder="Ex.: Geladeira, pintura da sala…" disabled={ro}
                onChange={e => set({ name: e.target.value })} />
            </div>
            <div className="grid2">
              <div className="f">
                <label htmlFor="e_room">Ambiente</label>
                <select className="field" id="e_room" value={d.room} disabled={ro} onChange={e => set({ room: e.target.value })}>
                  {roomOptions.map(r => <option key={r} value={r}>{r}</option>)}
                </select>
              </div>
              <div className="f">
                <label htmlFor="e_status">Status</label>
                <select className="field" id="e_status" value={d.status} disabled={ro} onChange={e => set({ status: e.target.value })}>
                  {STATUS.map(([k, l]) => <option key={k} value={k}>{l}</option>)}
                </select>
              </div>
            </div>
            <div className="grid2">
              <div className="f">
                <label htmlFor="e_qty">Quantidade</label>
                <input className="field num" id="e_qty" inputMode="decimal" value={d.qtyText} disabled={ro} onChange={e => set({ qtyText: e.target.value })} />
              </div>
              <div className="f">
                <label htmlFor="e_unit">Unidade</label>
                <select className="field" id="e_unit" value={d.unit} disabled={ro} onChange={e => set({ unit: e.target.value })}>
                  {UNITS.map(u => <option key={u} value={u}>{u}</option>)}
                </select>
              </div>
            </div>
          </div>

          <div className="sec">
            <div className="sec-h">
              <h3>Opções e preços</h3>
              <span className="byline">preço por {d.unit || 'un'} × quantidade</span>
            </div>
            {canPhoto && <p className="byline" style={{ margin: 0 }}>Cada opção tem suas fotos. Dica: copie uma imagem do site e cole (Ctrl/⌘+V) com a opção selecionada.</p>}
            {!access.canUpload && !ro && <p className="byline" style={{ margin: 0 }}>Para enviar fotos, é preciso acesso de Editor nesta página.</p>}
            {d.quotes.length === 0 && <p className="muted" style={{ margin: 0 }}>Nenhuma opção ainda.</p>}
            {d.quotes.map(q => {
              const price = parseMoney(q.priceText), tot = quoteTotal({ price }, { qty: qtyNum }), url = safeUrl(q.link);
              const cheapest = minTot !== null && price > 0 && tot === minTot;
              return (
                <div key={q.id} className={`quote${q.chosen ? ' chosen' : ''}${cheapest ? ' cheapest' : ''}`} onFocusCapture={() => setActiveQuote(q.id)} onPointerDown={() => setActiveQuote(q.id)}>
                  <div className="qgrid">
                    <div className="f">
                      <label htmlFor={`link_${q.id}`}>Link</label>
                      <input className="field" id={`link_${q.id}`} value={q.link} placeholder="Cole o link do produto ou do orçamento" inputMode="url" disabled={ro}
                        onChange={e => setQuote(q.id, { link: e.target.value })} />
                    </div>
                    <div className="f">
                      <label htmlFor={`price_${q.id}`}>Preço (R$)</label>
                      <input className="field num" id={`price_${q.id}`} inputMode="decimal" value={q.priceText} placeholder="0,00" disabled={ro}
                        onChange={e => setQuote(q.id, { priceText: e.target.value })}
                        onBlur={() => setQuote(q.id, { priceText: fmtInput(parseMoney(q.priceText)) })} />
                    </div>
                  </div>
                  {(q.photos.length > 0 || canPhoto) && (
                    <div className="photos">
                      {q.photos.map(p => (
                        <div className="photo" key={p}>
                          <img src={backend.photoUrl(p)} alt="Foto da opção" />
                          {canPhoto && <button aria-label="Remover foto" onClick={() => setQuote(q.id, { photos: q.photos.filter(x => x !== p) })}>×</button>}
                        </div>
                      ))}
                      {canPhoto && (
                        <label className="addphoto">
                          {uploading[q.id] ? 'Enviando…' : '+ Foto'}
                          <input type="file" accept="image/*" multiple hidden onChange={e => { upload(e.target.files, q.id); e.target.value = ''; }} />
                        </label>
                      )}
                    </div>
                  )}
                  <div className="quote-foot">
                    <label>
                      <input type="radio" name="chosen" checked={q.chosen} disabled={ro}
                        onChange={() => setD(prev => ({ ...prev, quotes: prev.quotes.map(x => ({ ...x, chosen: x.id === q.id })) }))} /> Escolhido
                    </label>
                    <span className="qtot">{price > 0 ? 'Total ' + money(tot) : ''}</span>
                    {url && <a className="openlink" href={url} target="_blank" rel="noopener noreferrer">Abrir {host(url)} ↗</a>}
                    {!ro && <button className="linkish" onClick={() => set({ quotes: d.quotes.filter(x => x.id !== q.id) })}>Remover</button>}
                  </div>
                </div>
              );
            })}
            {!ro && (
              <div>
                <button className="btn" onClick={() => set({ quotes: [...d.quotes, blankQuote()] })}>+ Outra opção</button>
                {d.quotes.some(q => q.chosen) && (
                  <> <button className="linkish" onClick={() => set({ quotes: d.quotes.map(q => ({ ...q, chosen: false })) })}>desmarcar escolhido</button></>
                )}
              </div>
            )}
          </div>

          {(authorName || d.createdAt) && (
            <p className="byline">
              Adicionado{authorName ? ' por ' + authorName : ''}{d.createdAt ? ' em ' + new Date(d.createdAt).toLocaleDateString('pt-BR') : ''}
            </p>
          )}
        </div>

        <div className="sheet-f">
          <div>{item && !ro && <button className={`btn danger ${armed ? 'armed' : ''}`} onClick={remove}>{armed ? 'Confirmar exclusão' : 'Excluir'}</button>}</div>
          <div className="grow">
            <button className="btn" onClick={onClose}>{ro ? 'Fechar' : 'Cancelar'}</button>
            {!ro && <button className="btn primary" disabled={Object.values(uploading).some(Boolean) || saving} onClick={save}>Salvar</button>}
          </div>
        </div>
      </div>
    </div>
  );
}

