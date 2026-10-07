import { useMemo, useState } from 'react';
import ItemEditor from './components/ItemEditor.jsx';
import ItemList from './components/ItemList.jsx';
import Login from './components/Login.jsx';
import SheetTabs from './components/SheetTabs.jsx';
import Summary from './components/Summary.jsx';
import { ToastProvider, useToast } from './components/Toast.jsx';
import { ROOMS, stName } from './lib/constants.js';
import { quoteTotal } from './lib/costs.js';
import { num } from './lib/format.js';
import { allPhotos } from './lib/photos.js';
import { useStore } from './data/useStore.js';

const TAB_KEY = 'casa-nova-tab';
const readTab = () => { try { return localStorage.getItem(TAB_KEY) || ''; } catch { return ''; } };

export default function App() {
  return (
    <ToastProvider>
      <Planner />
    </ToastProvider>
  );
}

function Planner() {
  const toast = useToast();
  const { backend, status, problem, access, items, settings, names, denyWrites, login } = useStore();
  const [tab, setTabState] = useState(readTab);
  const [editing, setEditing] = useState(null); // null | 'new' | item id
  const [renaming, setRenaming] = useState(false);

  const rooms = useMemo(
    () => [...new Set([...(Array.isArray(settings.rooms) ? settings.rooms : ROOMS), ...items.map(i => i.room).filter(Boolean)])],
    [settings.rooms, items],
  );
  const tabItems = useMemo(
    () => items.filter(it => !tab || (it.room || 'Geral') === tab).sort((a, b) => (a.name || '').localeCompare(b.name || '', 'pt-BR')),
    [items, tab],
  );
  const canWrite = status === 'ready' && access.canWrite;

  const setTab = r => {
    setTabState(r);
    setRenaming(false);
    try { localStorage.setItem(TAB_KEY, r); } catch { /* per-viewer convenience only */ }
    window.scrollTo({ top: 0 });
  };

  /** Runs a write; on failure explains it and returns false. */
  async function write(fn, done) {
    try {
      await fn();
      if (done) toast(done);
      return true;
    } catch (e) {
      if (e?.code === 'invalid_argument') { denyWrites(); toast('Sem permissão para editar esta lista'); }
      else if (e?.code === 'quota_exceeded') toast('Limite de armazenamento atingido. Exclua itens antigos.');
      else toast('Não foi possível salvar. Tente de novo.');
      return false;
    }
  }

  const saveSettings = patch => write(() => backend.saveSettings({ ...settings, ...patch }));

  async function createRoom(raw) {
    const name = raw.trim().replace(/\s+/g, ' ').slice(0, 40);
    if (!name) return;
    const existing = rooms.find(r => r.toLowerCase() === name.toLowerCase());
    if (!existing && !(await saveSettings({ rooms: [...rooms, name] }))) return;
    setTab(existing || name);
  }

  async function renameRoom(raw) {
    const old = tab, name = raw.trim().replace(/\s+/g, ' ').slice(0, 40);
    if (!name || name === old) { setRenaming(false); return; }
    if (rooms.some(r => r !== old && r.toLowerCase() === name.toLowerCase())) { toast('Já existe uma página com esse nome'); return; }
    const ok = await write(async () => {
      await backend.saveSettings({ ...settings, rooms: rooms.map(r => (r === old ? name : r)) });
      for (const it of items.filter(i => (i.room || 'Geral') === old)) await backend.updateItem(it.id, { room: name, updatedAt: Date.now() });
    }, 'Página renomeada');
    if (ok) setTab(name);
  }

  async function deleteRoom() {
    const old = tab;
    const ok = await write(async () => {
      for (const it of items.filter(i => (i.room || 'Geral') === old)) {
        await backend.deleteItem(it.id);
        for (const p of allPhotos(it)) backend.deletePhoto(p);
      }
      await backend.saveSettings({ ...settings, rooms: rooms.filter(r => r !== old) });
    }, 'Página excluída');
    if (ok) setTab('');
  }

  async function saveItem(data) {
    const isNew = editing === 'new';
    const now = Date.now();
    const doc = { ...data, updatedAt: now, ...(isNew ? { createdAt: now, ...(access.me ? { createdBy: access.me } : {}) } : {}) };
    const ok = await write(() => backend.saveItem(isNew ? null : editing, doc), isNew ? 'Item adicionado' : 'Item salvo');
    if (ok) setEditing(null);
    return ok;
  }

  async function deleteItem() {
    const it = items.find(i => i.id === editing);
    if (!it) return;
    const ok = await write(() => backend.deleteItem(it.id), 'Item excluído');
    if (ok) {
      setEditing(null);
      for (const p of allPhotos(it)) backend.deletePhoto(p);
    }
  }

  const pickQuote = (it, quoteId) =>
    write(() => backend.updateItem(it.id, { quotes: (it.quotes || []).map(q => ({ ...q, chosen: q.id === quoteId })), updatedAt: Date.now() }), 'Opção escolhida');

  async function exportCsv() {
    const f = n => num(n).toFixed(2).replace('.', ',');
    const rows = [['Item', 'Ambiente', 'Status', 'Qtd', 'Unidade', 'Preço unit.', 'Total', 'Escolhido', 'Link']];
    for (const it of tabItems) {
      const base = [it.name, it.room || 'Geral', stName(it.status), String(it.qty || 1).replace('.', ','), it.unit || 'un'];
      const qs = it.quotes || [];
      if (!qs.length) rows.push([...base, '', '', '', '']);
      for (const q of qs) rows.push([...base, f(q.price), f(quoteTotal(q, it)), q.chosen ? 'sim' : '', q.link]);
    }
    const cell = c => { c = String(c ?? ''); return /[";\n]/.test(c) ? '"' + c.replace(/"/g, '""') + '"' : c; };
    const csv = '﻿' + rows.map(r => r.map(cell).join(';')).join('\r\n');
    try {
      await backend.download('casa-nova-orcamentos.csv', new Blob([csv], { type: 'text/csv' }));
    } catch (e) {
      if (e?.code !== 'declined') toast(e?.code === 'extension_not_enabled' ? 'Exportação indisponível aqui' : 'Não foi possível exportar');
    }
  }

  const editingItem = editing && editing !== 'new' ? items.find(i => i.id === editing) : null;

  if (status === 'login') return <div className="wrap"><Login onLogin={login} /></div>;

  return (
    <>
      <div className="wrap">
        <header className="top">
          <div className="brand">
            <span className="eyebrow">Nosso apartamento</span>
            <h1>Casa Nova</h1>
            <p>Tudo o que falta comprar e instalar, com os orçamentos lado a lado.</p>
          </div>
          <div className="actions">
            {access.canDownload && items.length > 0 && <button className="btn ghost" onClick={exportCsv}>Exportar planilha</button>}
            {canWrite && <button className="btn primary" onClick={() => setEditing('new')}>+ Adicionar item</button>}
          </div>
        </header>

        {status === 'nodb' && <div className="notice">Abra esta página pelo claude.ai, com sua conta conectada, para ver e salvar a lista de vocês.</div>}
        {status === 'ready' && !access.canWrite && (
          <div className="notice">Você pode ver a lista, mas não editar. Peça para quem compartilhou te dar acesso de <b>Editor</b>.</div>
        )}

        <Summary items={items} budget={num(settings.budget)} canWrite={canWrite} onSaveBudget={v => saveSettings({ budget: v }).then(ok => ok && toast('Orçamento salvo'))} />

        {status === 'not_configured' && <div className="notice">O site ainda não está configurado: {problem}</div>}
        {status === 'error' && <div className="notice">Não foi possível carregar a lista. Recarregue a página em instantes.</div>}
        {status === 'loading' && <div className="empty"><p>Carregando a lista de vocês…</p></div>}
        {status === 'ready' && (
          <ItemList key={tab} tab={tab} items={tabItems} allCount={items.length} canWrite={canWrite} photoUrl={backend.photoUrl}
            renaming={renaming} setRenaming={setRenaming}
            onOpen={setEditing} onAdd={() => setEditing('new')} onPick={pickQuote}
            onRename={renameRoom} onDeleteRoom={deleteRoom} />
        )}
      </div>

      {status === 'ready' && (
        <SheetTabs rooms={rooms} items={items} tab={tab} canWrite={canWrite} onSelect={setTab} onCreate={createRoom}
          onRename={r => { if (r !== tab) setTab(r); setRenaming(true); }} />
      )}

      {editing && (editing === 'new' || editingItem) && (
        <ItemEditor key={editing} item={editingItem} defaultRoom={tab} rooms={rooms} access={access}
          authorName={editingItem?.createdBy ? names[editingItem.createdBy] : ''} backend={backend}
          onSave={saveItem} onDelete={deleteItem} onClose={() => setEditing(null)} />
      )}
    </>
  );
}
