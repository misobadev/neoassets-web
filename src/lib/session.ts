import { useEffect, useSyncExternalStore } from "react";
import {
	cachedUser,
	clearStoredAuth,
	fetchMe,
	logoutRequest,
	storeCachedUser,
	subscribeSession,
	type CachedUser,
} from "./api";

export type Role = "user" | "reviewer" | "admin";

export interface Session {
	user: CachedUser | null;
	authed: boolean;
	role: string;
	isReviewer: boolean;
	isAdmin: boolean;
}

// useSession returns the signed-in user (from the cached profile) and
// re-renders when it changes: login, logout, a 401, a role refresh, or a
// change made in another tab.
export function useSession(): Session {
	const user = useSyncExternalStore(subscribeSession, cachedUser, () => null);
	const role = user?.role || "user";
	return {
		user,
		authed: !!user,
		role,
		isReviewer: role === "admin" || role === "reviewer",
		isAdmin: role === "admin",
	};
}

// hasRole reports whether a session's role grants the required one (admins
// can do everything a reviewer can).
export function hasRole(session: Session, required: Role): boolean {
	if (required === "admin") return session.isAdmin;
	if (required === "reviewer") return session.isReviewer;
	return session.authed;
}

// useRoleRefresh reloads the role from the server once a session exists, so a
// promotion or demotion takes effect without logging out and back in.
export function useRoleRefresh(): void {
	const { authed, role } = useSession();
	useEffect(() => {
		if (!authed) return;
		let cancelled = false;
		fetchMe()
			.then((u) => {
				if (!cancelled && u.role && u.role !== role) storeCachedUser({ role: u.role });
			})
			.catch(() => {});
		return () => {
			cancelled = true;
		};
		// Only on login / first load, not on every role change it triggers.
		// eslint-disable-next-line react-hooks/exhaustive-deps
	}, [authed]);
}

// signOut clears the server session cookies, then the cached profile. The
// local clear runs regardless so the UI logs out even if the request fails.
export function signOut(): Promise<void> {
	return logoutRequest()
		.then(() => undefined)
		.catch(() => undefined)
		.finally(() => clearStoredAuth());
}
