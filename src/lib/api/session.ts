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
