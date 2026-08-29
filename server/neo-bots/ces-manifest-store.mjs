export function createMemoryCesManifestStore() {
  const manifests = new Map();

  function keyFor(exchangeId, interfaceMode = 'legacy') {
    return `${String(exchangeId || '').toUpperCase()}:${interfaceMode}`;
  }

  return {
    async save(manifest) {
      if (!manifest?.exchange?.exchangeId) throw new Error('manifest exchangeId is required');
      const key = keyFor(manifest.exchange.exchangeId, manifest.interface || 'legacy');
      const stored = Object.freeze({
        ...manifest,
        persistedAt: new Date().toISOString(),
      });
      manifests.set(key, stored);
      return stored;
    },
    async get(exchangeId, interfaceMode = 'legacy') {
      return manifests.get(keyFor(exchangeId, interfaceMode)) || null;
    },
    async list() {
      return [...manifests.values()];
    },
    async remove(exchangeId, interfaceMode = 'legacy') {
      return manifests.delete(keyFor(exchangeId, interfaceMode));
    },
  };
}

export function createJsonFileCesManifestStore({ fs, directory }) {
  if (!fs?.mkdir || !fs?.writeFile || !fs?.readFile) throw new Error('fs promises implementation is required');
  if (!directory) throw new Error('manifest directory is required');

  function filename(exchangeId, interfaceMode = 'legacy') {
    const safeExchange = String(exchangeId || '').toUpperCase().replace(/[^A-Z0-9_-]/g, '_');
    const safeMode = String(interfaceMode).replace(/[^a-z0-9_-]/gi, '_');
    return `${directory}/${safeExchange}.${safeMode}.json`;
  }

  return {
    async save(manifest) {
      if (!manifest?.exchange?.exchangeId) throw new Error('manifest exchangeId is required');
      await fs.mkdir(directory, { recursive: true });
      const stored = { ...manifest, persistedAt: new Date().toISOString() };
      await fs.writeFile(filename(manifest.exchange.exchangeId, manifest.interface || 'legacy'), `${JSON.stringify(stored, null, 2)}\n`, 'utf8');
      return stored;
    },
    async get(exchangeId, interfaceMode = 'legacy') {
      try {
        const raw = await fs.readFile(filename(exchangeId, interfaceMode), 'utf8');
        return JSON.parse(raw);
      } catch (error) {
        if (error?.code === 'ENOENT') return null;
        throw error;
      }
    },
  };
}
