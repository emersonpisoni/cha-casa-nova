// Data in the project's own API (api/*.js on Vercel): items and settings in
// Upstash Redis, photos in Vercel Blob. Changes from the other person arrive
// by polling a version number, which costs one tiny request when nothing changed.

const POLL_MS = 3000;

async function api(path, options = {}) {
  const res = await fetch('/api/' + path, { credentials: 'same-origin', ...options });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) throw { code: data.code || 'unavailable', message: data.message || '', status: res.status };
  return data;
}

const sendJson = (method, body) => ({ method, headers: { 'content-type': 'application/json' }, body: JSON.stringify(body) });

export function createVercelBackend() {
  let version = null, items = [], settings = {}, inflight = null, timer = 0;
  const itemSubs = new Set(), settingSubs = new Set();

  function refresh() {
    if (inflight) return inflight;
    inflight = (async () => {
      try {
        const d = await api('state' + (version ? '?since=' + encodeURIComponent(version) : ''));
        if (!d.unchanged) {
          items = d.items;
          settings = d.settings;
          itemSubs.forEach(fn => fn(items));
          settingSubs.forEach(fn => fn(settings));
        }
        version = d.version;
      } finally {
        inflight = null;
      }
    })();
    return inflight;
  }

  const poll = () => { if (document.visibilityState === 'visible') refresh().catch(() => {}); };
  function startPolling() {
    if (timer) return;
    timer = setInterval(poll, POLL_MS);
    document.addEventListener('visibilitychange', poll);
    window.addEventListener('focus', poll);
  }
  function stopPollingIfIdle() {
    if (itemSubs.size || settingSubs.size || !timer) return;
    clearInterval(timer);
    timer = 0;
    document.removeEventListener('visibilitychange', poll);
    window.removeEventListener('focus', poll);
  }

  /** Runs a write, then pulls the new state so both lists show it right away. */
  async function write(path, options) {
    const out = await api(path, options);
    await refresh().catch(() => {});
    return out;
  }

  return {
    kind: 'vercel',

    /** Throws { code: 'unauthenticated' | 'not_configured' } when it can't load yet. */
    async init() {
      await refresh();
      return { me: null, canWrite: true, canUpload: true, canDownload: true };
    },

    login: password => api('login', sendJson('POST', { password })),

    onItems(next) {
      itemSubs.add(next);
      next(items);
      startPolling();
      return () => { itemSubs.delete(next); stopPollingIfIdle(); };
    },
    onSettings(next) {
      settingSubs.add(next);
      next(settings);
      startPolling();
      return () => { settingSubs.delete(next); stopPollingIfIdle(); };
    },

    async saveItem(id, data) {
      return (await write('items' + (id ? '?id=' + encodeURIComponent(id) : ''), sendJson('PUT', { data }))).id;
    },
    updateItem: (id, patch) => write('items?id=' + encodeURIComponent(id), sendJson('PATCH', { patch })),
    deleteItem: id => write('items?id=' + encodeURIComponent(id), { method: 'DELETE' }),
    saveSettings: data => write('settings', sendJson('PUT', { data })),

    async uploadPhoto(blob) {
      const type = ['image/jpeg', 'image/png', 'image/webp', 'image/gif'].includes(blob.type) ? blob.type : 'image/jpeg';
      return (await api('photos', { method: 'POST', headers: { 'content-type': type }, body: blob })).id;
    },
    deletePhoto: id => api('photos?p=' + encodeURIComponent(id), { method: 'DELETE' }).catch(() => {}),
    photoUrl: id => '/api/photos?p=' + encodeURIComponent(id),

    async download(filename, blob) {
      const a = document.createElement('a');
      a.href = URL.createObjectURL(blob);
      a.download = filename;
      a.click();
      setTimeout(() => URL.revokeObjectURL(a.href), 1000);
    },

    names: async () => ({}),
  };
}
