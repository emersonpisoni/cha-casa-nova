// Data kept in this browser's localStorage. Used by `npm run dev` and any
// copy of the app opened outside claude.ai. Not shared between people.

const KEY = 'casa-nova-local-db';

function load() {
  try {
    return { items: {}, settings: {}, photos: {}, ...JSON.parse(localStorage.getItem(KEY) || '{}') };
  } catch {
    return { items: {}, settings: {}, photos: {} };
  }
}

export function createLocalBackend() {
  let state = load();
  const itemSubs = new Set(), settingSubs = new Set();

  const list = () => Object.entries(state.items).map(([id, d]) => ({ ...d, id }));
  const emit = () => {
    try {
      localStorage.setItem(KEY, JSON.stringify(state));
    } catch {
      throw { code: 'quota_exceeded', message: 'localStorage is full' };
    }
    itemSubs.forEach(fn => fn(list()));
    settingSubs.forEach(fn => fn({ ...state.settings }));
  };
  const id = () => Math.random().toString(36).slice(2, 12);

  // Another tab of the dev server changed the data.
  window.addEventListener('storage', e => {
    if (e.key === KEY) { state = load(); itemSubs.forEach(fn => fn(list())); settingSubs.forEach(fn => fn({ ...state.settings })); }
  });

  return {
    kind: 'local',
    init: async () => ({ me: 'local', canWrite: true, canUpload: true, canDownload: true }),

    onItems(next) {
      itemSubs.add(next);
      queueMicrotask(() => next(list()));
      return () => itemSubs.delete(next);
    },
    onSettings(next) {
      settingSubs.add(next);
      queueMicrotask(() => next({ ...state.settings }));
      return () => settingSubs.delete(next);
    },

    async saveItem(itemId, data) {
      const key = itemId || id();
      state.items[key] = data;
      emit();
      return key;
    },
    async updateItem(itemId, patch) {
      if (!state.items[itemId]) throw { code: 'invalid_argument', message: 'missing item' };
      state.items[itemId] = { ...state.items[itemId], ...patch };
      emit();
    },
    async deleteItem(itemId) { delete state.items[itemId]; emit(); },
    async saveSettings(data) { state.settings = data; emit(); },

    async uploadPhoto(blob) {
      const dataUrl = await new Promise((resolve, reject) => {
        const r = new FileReader();
        r.onload = () => resolve(r.result);
        r.onerror = reject;
        r.readAsDataURL(blob);
      });
      const key = id();
      state.photos[key] = dataUrl;
      emit();
      return key;
    },
    async deletePhoto(key) { delete state.photos[key]; emit(); },
    photoUrl: key => state.photos[key] || '',

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
