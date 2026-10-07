// Data stored in the claude.ai artifact's shared database, photos in its
// asset store. Used when the app runs as the published page on claude.ai.

export function createClaudeBackend({ db, user, assets, downloads }) {
  const items = db.collection('items');
  const settings = db.doc('meta/settings');

  return {
    kind: 'claude',

    async init() {
      let me = null, canWrite = true;
      if (user) {
        try { me = await user.id(); } catch { /* signed out or not told */ }
        try { if ((await user.can('data.write')) === false) canWrite = false; } catch { /* keep inputs */ }
      }
      return { me, canWrite, canUpload: !!assets, canDownload: !!downloads };
    },

    onItems(next, error) {
      return items.onSnapshot(snap => next(snap.docs.map(d => ({ ...d.data(), id: d.id }))), error);
    },

    onSettings(next) {
      return settings.onSnapshot(s => next(s.exists ? { ...s.data() } : {}), () => {});
    },

    async saveItem(id, data) {
      const ref = id ? items.doc(id) : items.doc();
      await ref.set(data);
      return ref.id;
    },

    updateItem: (id, patch) => items.doc(id).update(patch),
    deleteItem: id => items.doc(id).delete(),
    saveSettings: data => settings.set(data),

    async uploadPhoto(blob) {
      const type = ['image/jpeg', 'image/png', 'image/webp', 'image/gif'].includes(blob.type) ? blob.type : 'image/jpeg';
      return (await assets.upload(blob, { type })).id;
    },

    deletePhoto: id => (assets ? assets.delete(id).catch(() => {}) : Promise.resolve()),
    photoUrl: id => '/_blob/' + id,

    download: (filename, blob) => downloads.save({ filename, data: blob }),

    async names(ids) {
      if (!user?.profiles || !ids.length) return {};
      try {
        const ps = await user.profiles(ids);
        return Object.fromEntries(ids.map(id => [id, ps?.[id]?.name || '']));
      } catch {
        return {};
      }
    },
  };
}
