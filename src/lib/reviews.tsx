import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState, type ReactNode } from "react";
import { fetchMyMetadataSubmissions, fetchMySubmissions, userToken } from "./api";

// A review item is one of the current user's contributions (metadata or system
// art pack) with its review state. There is no notifications table: the list is
// derived from the user's submissions, and "read" state for the reviewed ones is
// kept in localStorage so the bell only counts reviews the user has not opened.
export type ReviewStatus = "pending" | "approved" | "rejected";

export interface ReviewItem {
	// key is unique per (submission, status) so a re-review creates a new entry.
	key: string;
	id: string;
	kind: "metadata" | "sap";
	status: ReviewStatus;
	title: string;
	systemName?: string;
	cover?: string;
	coverUpdated?: string;
	comment?: string;
	reviewer?: string;
	at: string;
	href?: string;
	xp: number;
	changeKinds?: string[];
	// Target and submitted content, used to render the approved result.
	gameId?: string;
	systemId?: string;
	packId?: string;
	payload?: Record<string, unknown>;
}

const SEEN_KEY = "ns-seen-reviews";

function loadSeen(): string[] | null {
	try {
		const raw = localStorage.getItem(SEEN_KEY);
		return raw ? (JSON.parse(raw) as string[]) : null;
	} catch {
		return null;
	}
}

function saveSeen(ids: string[]) {
	try {
		localStorage.setItem(SEEN_KEY, JSON.stringify(ids));
	} catch {}
}

async function loadReviews(): Promise<ReviewItem[]> {
	const [meta, sap] = await Promise.all([
		fetchMyMetadataSubmissions().catch(() => []),
		fetchMySubmissions().catch(() => []),
	]);

	const items: ReviewItem[] = [];
	for (const m of meta) {
		if (m.status === "created") continue;
		items.push({
			key: `metadata:${m.id}:${m.status}`,
			id: m.id,
			kind: "metadata",
			status: m.status,
			title: m.game_name || m.system_name || (m.game_id ? "Game" : "System"),
			systemName: m.system_name,
			cover: m.cover,
			coverUpdated: m.cover_updated,
			comment: m.review_comment,
			reviewer: m.reviewed_by_name,
			at: m.reviewed_at || m.created_at,
			href: m.status === "approved" && m.game_id && m.system_id ? `/app/metadata/${m.system_id}/game/${m.game_id}` : undefined,
			xp: m.points_earned || 0,
			changeKinds: m.change_kinds,
			gameId: m.game_id || undefined,
			systemId: m.system_id || undefined,
			payload: m.payload,
		});
	}
	for (const s of sap) {
		if (s.status === "created" || s.status === "trashed") continue;
		const log = [...(s.logs || [])].reverse().find((l) => l.action === "approved" || l.action === "rejected");
		items.push({
			key: `sap:${s.id}:${s.status}`,
			id: s.id,
			kind: "sap",
			status: s.status,
			title: s.name,
			comment: log?.detail || "",
			reviewer: log?.user_name || s.reviewed_by_name,
			at: log?.created_at || s.reviewed_at || s.created_at,
			href: s.status === "approved" ? "/app/sap" : undefined,
			xp: s.points_earned || 0,
			packId: s.pack_id || undefined,
		});
	}
	return items.sort((a, b) => (a.at < b.at ? 1 : -1));
}

interface ReviewsContextValue {
	items: ReviewItem[];
	unread: number;
	totalXP: number;
	loading: boolean;
	refresh: () => void;
	markAllSeen: () => void;
}

const ReviewsContext = createContext<ReviewsContextValue | null>(null);

export function ReviewsProvider({ children }: { children: ReactNode }) {
	const [items, setItems] = useState<ReviewItem[]>([]);
	const [seen, setSeen] = useState<string[]>(() => loadSeen() ?? []);
	const [loading, setLoading] = useState(false);
	// On the very first run (no persisted state) the current reviews are marked
	// as already seen, so only reviews that arrive afterwards raise the badge.
	const initialized = useRef(loadSeen() !== null);

	const refresh = useCallback(() => {
		if (!userToken()) return;
		setLoading(true);
		loadReviews()
			.then((list) => {
				setItems(list);
				if (!initialized.current) {
					const keys = list.map((i) => i.key);
					setSeen(keys);
					saveSeen(keys);
					initialized.current = true;
				}
			})
			.finally(() => setLoading(false));
	}, []);

	useEffect(() => {
		refresh();
	}, [refresh]);

	// Refresh when the auth token appears (login) and clear when it goes away
	// (logout). The provider lives above the router outlet, so it is not
	// remounted on navigation.
	const tokenRef = useRef(userToken());
	useEffect(() => {
		const tok = userToken();
		if (tok === tokenRef.current) return;
		tokenRef.current = tok;
		if (tok) refresh();
		else setItems([]);
	});

	// Keep the badge fresh when the user comes back to the tab.
	useEffect(() => {
		const onFocus = () => refresh();
		window.addEventListener("focus", onFocus);
		return () => window.removeEventListener("focus", onFocus);
	}, [refresh]);

	const markAllSeen = useCallback(() => {
		const keys = items.map((i) => i.key);
		setSeen(keys);
		saveSeen(keys);
	}, [items]);

	const unread = useMemo(() => items.filter((i) => i.status !== "pending" && !seen.includes(i.key)).length, [items, seen]);
	const totalXP = useMemo(() => items.reduce((sum, i) => sum + (i.status === "approved" ? i.xp : 0), 0), [items]);

	return <ReviewsContext.Provider value={{ items, unread, totalXP, loading, refresh, markAllSeen }}>{children}</ReviewsContext.Provider>;
}

export function useReviews(): ReviewsContextValue {
	const ctx = useContext(ReviewsContext);
	if (!ctx) throw new Error("useReviews must be used within ReviewsProvider");
	return ctx;
}
