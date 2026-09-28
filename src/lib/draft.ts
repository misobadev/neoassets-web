// Client-side draft store for system art submissions. Drafts never hit the
// backend: metadata + the actual image blobs are kept in the browser (IndexedDB
// supports Blob/File, so larger image sets persist across refreshes). The pack
// is only created as `pending` when the user submits it for review.

export interface DraftFile {
	fileName: string;
	kind: string;
	systemId: string;
	size: number;
	mimeType: string;
	objectKey?: string;
	blob?: File;
}

export interface PackDraft {
	createdAt: number;
	name: string;
	author: string;
	description: string;
	donationUrl: string;
	ai: boolean;
	files: DraftFile[];
}

const DB_NAME = "ns-pack-draft-db";
const STORE = "drafts";

// A single connection is reused across every draft read/write. Opening a new
// connection per call leaked them and made later opens slow enough for the
// editor's debounced autosave to overwrite a draft before it was loaded.
let dbPromise: Promise<IDBDatabase> | null = null;

function openDB(): Promise<IDBDatabase> {
	if (dbPromise) return dbPromise;
	dbPromise = new Promise((resolve, reject) => {
		const req = indexedDB.open(DB_NAME, 1);
		req.onupgradeneeded = () => {
			if (!req.result.objectStoreNames.contains(STORE)) req.result.createObjectStore(STORE);
		};
		req.onsuccess = () => {
			const db = req.result;
			db.onversionchange = () => {
				db.close();
				dbPromise = null;
			};
			resolve(db);
		};
		req.onerror = () => {
			dbPromise = null;
			reject(req.error);
		};
	});
	return dbPromise;
}

export async function savePackDraft(draft: PackDraft, key = "current"): Promise<void> {
	const db = await openDB();
	return new Promise((resolve, reject) => {
		const tx = db.transaction(STORE, "readwrite");
		tx.objectStore(STORE).put(draft, key);
		tx.oncomplete = () => resolve();
		tx.onerror = () => reject(tx.error);
	});
}

export async function loadPackDraft(key = "current"): Promise<PackDraft | null> {
	const db = await openDB();
	return new Promise((resolve, reject) => {
		const tx = db.transaction(STORE, "readonly");
		const req = tx.objectStore(STORE).get(key);
		req.onsuccess = () => resolve((req.result as PackDraft) || null);
		req.onerror = () => reject(req.error);
	});
}

export async function clearPackDraft(key = "current"): Promise<void> {
	const db = await openDB();
	return new Promise((resolve, reject) => {
		const tx = db.transaction(STORE, "readwrite");
		tx.objectStore(STORE).delete(key);
		tx.oncomplete = () => resolve();
		tx.onerror = () => reject(tx.error);
	});
}
