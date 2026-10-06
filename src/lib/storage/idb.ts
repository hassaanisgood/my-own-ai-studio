/**
 * IndexedDB blob store for uploaded files (reference images). Metadata lives
 * in localStorage alongside history; only binaries go here.
 */
const DB_NAME = "studio-assets";
const STORE = "files";
const VERSION = 1;

let dbPromise: Promise<IDBDatabase> | null = null;

function openDb(): Promise<IDBDatabase> {
  if (dbPromise) return dbPromise;
  dbPromise = new Promise((resolve, reject) => {
    if (typeof indexedDB === "undefined") return reject(new Error("IndexedDB is not available"));
    const req = indexedDB.open(DB_NAME, VERSION);
    req.onupgradeneeded = () => {
      if (!req.result.objectStoreNames.contains(STORE)) req.result.createObjectStore(STORE);
    };
    req.onsuccess = () => resolve(req.result);
    req.onerror = () => reject(req.error ?? new Error("Could not open IndexedDB"));
    req.onblocked = () => reject(new Error("IndexedDB is blocked"));
  });
  dbPromise.catch(() => {
    dbPromise = null;
  });
  return dbPromise;
}

function run<T>(mode: IDBTransactionMode, fn: (store: IDBObjectStore) => IDBRequest<T>): Promise<T> {
  return openDb().then(
    (db) =>
      new Promise<T>((resolve, reject) => {
        const tx = db.transaction(STORE, mode);
        const req = fn(tx.objectStore(STORE));
        tx.oncomplete = () => resolve(req.result);
        tx.onerror = () => reject(tx.error ?? req.error);
        tx.onabort = () => reject(tx.error ?? new Error("Transaction aborted"));
      }),
  );
}

export const fileStore = {
  put: (id: string, blob: Blob) => run("readwrite", (s) => s.put(blob, id)).then(() => undefined),
  get: (id: string) => run<Blob | undefined>("readonly", (s) => s.get(id) as IDBRequest<Blob | undefined>),
  delete: (id: string) => run("readwrite", (s) => s.delete(id)).then(() => undefined),
  keys: () => run<IDBValidKey[]>("readonly", (s) => s.getAllKeys()),
  clear: () => run("readwrite", (s) => s.clear()).then(() => undefined),
};

/** In-memory fallback so uploads still work for the session if IndexedDB fails. */
const memory = new Map<string, Blob>();
const urls = new Map<string, string>();

export async function saveReference(id: string, blob: Blob): Promise<{ persisted: boolean }> {
  memory.set(id, blob);
  try {
    await fileStore.put(id, blob);
    return { persisted: true };
  } catch {
    return { persisted: false };
  }
}

export async function loadReferenceUrl(id: string): Promise<string | null> {
  const cached = urls.get(id);
  if (cached) return cached;
  let blob = memory.get(id);
  if (!blob) {
    try {
      blob = await fileStore.get(id);
    } catch {
      blob = undefined;
    }
  }
  if (!blob) return null;
  memory.set(id, blob);
  const url = URL.createObjectURL(blob);
  urls.set(id, url);
  return url;
}

/** Deletes every stored file not listed in `keep`. */
export async function pruneReferences(keep: Set<string>) {
  for (const id of [...memory.keys()]) if (!keep.has(id)) memory.delete(id);
  try {
    const keys = await fileStore.keys();
    await Promise.all(keys.filter((k) => !keep.has(String(k))).map((k) => fileStore.delete(String(k))));
  } catch {
    /* storage unavailable — nothing to prune */
  }
}
