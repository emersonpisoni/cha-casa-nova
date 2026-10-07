import { useCallback, useEffect, useRef, useState } from 'react';
import { connectBackend } from './backend.js';

/** Connects once and keeps items, settings and author names live. */
export function useStore() {
  const [backend, setBackend] = useState(null);
  // loading | ready | nodb | login | not_configured | error
  const [status, setStatus] = useState('loading');
  const [problem, setProblem] = useState('');
  const [access, setAccess] = useState({ me: null, canWrite: false, canUpload: false, canDownload: false });
  const [items, setItems] = useState([]);
  const [settings, setSettings] = useState({});
  const [names, setNames] = useState({});
  const unsubs = useRef([]);

  const start = useCallback(async b => {
    try {
      setAccess(await b.init());
    } catch (e) {
      if (e?.code === 'unauthenticated') setStatus('login');
      else { setStatus(e?.code === 'not_configured' ? 'not_configured' : 'error'); setProblem(e?.message || ''); }
      return;
    }
    unsubs.current.forEach(u => u());
    unsubs.current = [
      b.onItems(list => { setItems(list); setStatus('ready'); }, () => setStatus('ready')),
      b.onSettings(setSettings),
    ];
  }, []);

  useEffect(() => {
    let cancelled = false;
    connectBackend().then(b => {
      if (cancelled) return;
      if (!b) { setStatus('nodb'); return; }
      setBackend(b);
      start(b);
    });
    return () => { cancelled = true; unsubs.current.forEach(u => u()); unsubs.current = []; };
  }, [start]);

  useEffect(() => {
    if (!backend) return;
    const missing = [...new Set(items.map(i => i.createdBy).filter(id => id && !(id in names)))];
    if (!missing.length) return;
    backend.names(missing).then(found => setNames(n => ({ ...n, ...Object.fromEntries(missing.map(id => [id, found[id] || ''])) })));
  }, [backend, items, names]);

  /** Password login (Vercel version). Throws { code: 'wrong_password' } on a bad password. */
  const login = useCallback(async password => {
    await backend.login(password);
    setStatus('loading');
    await start(backend);
  }, [backend, start]);

  /** Marks the viewer read-only after the store refuses a write. */
  const denyWrites = () => setAccess(a => ({ ...a, canWrite: false }));

  return { backend, status, problem, access, items, settings, names, denyWrites, login };
}
