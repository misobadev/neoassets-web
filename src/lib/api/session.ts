// Cached, non-secret session state (the session itself is an httpOnly
// cookie): who is signed in and with which role.

export const USER_EMAIL_KEY = "neoassets-user-email";
export const USER_NAME_KEY = "neoassets-user-name";
export const USER_ROLE_KEY = "neoassets-user-role";
export const USER_ID_KEY = "neoassets-user-id";

// The browser session is carried in an httpOnly cookie, so no token is ever
// read from (or written to) JavaScript-accessible storage. Requests authenticate
// via `credentials: "include"`.

// isAuthed reports whether a session is believed to exist, based on the
// non-secret profile cached after login. The server remains the source of truth
// (a 401 clears it).
export function isAuthed(): boolean {
	try {
		return !!localStorage.getItem(USER_ID_KEY);
	} catch {
		return false;
	}
}

// clearStoredAuth removes the cached (non-secret) profile after logout or a 401.
export function clearStoredAuth(): void {
	try {
		localStorage.removeItem(USER_ID_KEY);
		localStorage.removeItem(USER_NAME_KEY);
		localStorage.removeItem(USER_EMAIL_KEY);
		localStorage.removeItem(USER_ROLE_KEY);
	} catch {}
	notifySession();
}

// CachedUser is the non-secret profile kept for the UI.
export interface CachedUser {
	id: string;
	username: string;
	email: string;
	role: string;
}

// storeCachedUser saves the given profile fields after a login or a profile
// change and notifies the UI.
export function storeCachedUser(u: Partial<CachedUser>): void {
	try {
		if (u.id !== undefined) localStorage.setItem(USER_ID_KEY, u.id);
		if (u.username !== undefined) localStorage.setItem(USER_NAME_KEY, u.username);
		if (u.email !== undefined) localStorage.setItem(USER_EMAIL_KEY, u.email);
		if (u.role !== undefined) localStorage.setItem(USER_ROLE_KEY, u.role);
	} catch {}
	notifySession();
}

const SESSION_EVENT = "neoassets:session";

function notifySession(): void {
	if (typeof window !== "undefined") window.dispatchEvent(new Event(SESSION_EVENT));
}

// subscribeSession calls onChange when the cached profile changes in this tab
// (login, logout, a 401, a role refresh) or in another tab.
export function subscribeSession(onChange: () => void): () => void {
	window.addEventListener(SESSION_EVENT, onChange);
	window.addEventListener("storage", onChange);
	return () => {
		window.removeEventListener(SESSION_EVENT, onChange);
		window.removeEventListener("storage", onChange);
	};
}

let snapshot: CachedUser | null = null;
let snapshotKey = "";

// cachedUser returns the cached profile, or null for a guest. The same object
// is returned until the profile changes (as useSyncExternalStore requires).
export function cachedUser(): CachedUser | null {
	let id = "";
	let username = "";
	let email = "";
	let role = "";
	try {
		id = localStorage.getItem(USER_ID_KEY) || "";
		username = localStorage.getItem(USER_NAME_KEY) || "";
		email = localStorage.getItem(USER_EMAIL_KEY) || "";
		role = localStorage.getItem(USER_ROLE_KEY) || "";
	} catch {}
	const key = [id, username, email, role].join("\u0000");
	if (key !== snapshotKey) {
		snapshotKey = key;
		snapshot = id ? { id, username, email, role: role || "user" } : null;
	}
	return snapshot;
}

export function userEmail(): string | null {
	return localStorage.getItem(USER_EMAIL_KEY);
}

export function userUsername(): string | null {
	return localStorage.getItem(USER_NAME_KEY);
}

export function userId(): string | null {
	return localStorage.getItem(USER_ID_KEY);
}

export function userRole(): string | null {
	return localStorage.getItem(USER_ROLE_KEY);
}

export function isAdmin(): boolean {
	return userRole() === "admin";
}

export function isReviewer(): boolean {
	return userRole() === "admin" || userRole() === "reviewer";
}
