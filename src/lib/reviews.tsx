import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState, type ReactNode } from "react";
import { fetchMyMetadataSubmissions, fetchMySubmissions, fetchReviewSummary, userToken, type MetadataSubmission, type SubmissionDetail } from "./api";

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
	newGame?: boolean;
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
	// baseXP is the XP before the donor boost, so the UI can flag boosted awards.
	baseXP?: number;
	changeKinds?: string[];
	// Target and submitted content, used to render the approved result.
	gameId?: string;
	systemId?: string;
	packId?: string;
	payload?: Record<string, unknown>;
	// Submitted media (not yet published), shown while the item is pending.
	media?: { kind: string; object_key: string; region?: string }[];
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

// REVIEW_PAGE is how many items each source contributes to the review feed. The
// badge only needs the newest page; the Reviews page grows it per page.
export const REVIEW_PAGE = 20;
// STALE_MS bounds how often the badge refetches when the tab regains focus.
const STALE_MS = 60_000;

// buildReviewItems merges the user's metadata and system art pack submissions
// into the combined, date-sorted review feed.
export function buildReviewItems(meta: MetadataSubmission[], sap: SubmissionDetail[]): ReviewItem[] {
	const items: ReviewItem[] = [];
	for (const m of meta) {
		if (m.status === "created") continue;
		items.push({
			key: `metadata:${m.id}:${m.status}`,
			id: m.id,
			kind: "metadata",
			newGame: m.kind === "new_game",
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
			baseXP: m.base_points_earned,
			changeKinds: m.change_kinds,
			gameId: m.game_id || undefined,
			systemId: m.system_id || undefined,
			payload: m.payload,
			media: (m.files || []).map((f) => ({ kind: f.kind, object_key: f.object_key, region: f.region })),
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
			baseXP: s.base_points_earned,
			packId: s.pack_id || undefined,
			media: (s.files || []).map((f) => ({ kind: f.kind, object_key: f.object_key })),
		});
	}
	return items.sort((a, b) => (a.at < b.at ? 1 : -1));
}

export interface ReviewsData {
	items: ReviewItem[];
	total: number;
	totalXP: number;
}

// loadReviews fetches the newest `limit` review items from each source (the top
// N of the merged feed is contained in the union of the top N of both) and
// builds the combined list. status filters by review state.
export async function loadReviews(limit: number, status = ""): Promise<ReviewsData> {
	const [meta, sap] = await Promise.all([
		fetchMyMetadataSubmissions({ limit, status }).catch(() => ({ items: [], total: 0, totalXP: 0 })),
		fetchMySubmissions({ limit, status }).catch(() => ({ items: [], total: 0, totalXP: 0 })),
	]);
	return {
		items: buildReviewItems(meta.items, sap.items),
		total: meta.total + sap.total,
		totalXP: meta.totalXP + sap.totalXP,
	};
}

interface ReviewsContextValue {
	unread: number;
	totalXP: number;
	loading: boolean;
	refresh: () => void;
	markAllSeen: () => void;
}

// ReviewKey is the lightweight per-review state the badge needs: the unique key
// and its status. The full item (payload, cover, ...) is only loaded by the
// Reviews page.
interface ReviewKey {
	key: string;
	status: string;
}

const ReviewsContext = createContext<ReviewsContextValue | null>(null);

export function ReviewsProvider({ children }: { children: ReactNode }) {
	const [keys, setKeys] = useState<ReviewKey[]>([]);
	const [seen, setSeen] = useState<string[]>(() => loadSeen() ?? []);
	const [totalXP, setTotalXP] = useState(0);
	const [loading, setLoading] = useState(false);
	// On the very first run (no persisted state) the current reviews are marked
	// as already seen, so only reviews that arrive afterwards raise the badge.
	const initialized = useRef(loadSeen() !== null);
	// lastFetch gates the focus refresh so the badge is not refetched on every
	// tab switch.
	const lastFetch = useRef(0);

	const refresh = useCallback(() => {
		if (!userToken()) return;
		setLoading(true);
		// The badge only needs the review keys and the XP, so it uses the light
		// summary endpoint instead of downloading the full review feed.
		fetchReviewSummary(REVIEW_PAGE)
			.then(({ items, total_xp }) => {
				const list = items.map((i) => ({ key: `${i.kind}:${i.id}:${i.status}`, status: i.status }));
				setKeys(list);
				setTotalXP(total_xp);
				if (!initialized.current) {
					const ks = list.map((i) => i.key);
					setSeen(ks);
					saveSeen(ks);
					initialized.current = true;
				}
			})
			.catch(() => {})
			.finally(() => {
				setLoading(false);
				lastFetch.current = Date.now();
			});
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
		else {
			setKeys([]);
			setTotalXP(0);
		}
	});

	// Keep the badge fresh when the user comes back to the tab, but not more
	// often than STALE_MS.
	useEffect(() => {
		const onFocus = () => {
			if (Date.now() - lastFetch.current > STALE_MS) refresh();
		};
		window.addEventListener("focus", onFocus);
		return () => window.removeEventListener("focus", onFocus);
	}, [refresh]);

	const markAllSeen = useCallback(() => {
		const ks = keys.map((i) => i.key);
		setSeen(ks);
		saveSeen(ks);
	}, [keys]);

	const unread = useMemo(() => keys.filter((i) => i.status !== "pending" && !seen.includes(i.key)).length, [keys, seen]);

	return <ReviewsContext.Provider value={{ unread, totalXP, loading, refresh, markAllSeen }}>{children}</ReviewsContext.Provider>;
}

export function useReviews(): ReviewsContextValue {
	const ctx = useContext(ReviewsContext);
	if (!ctx) throw new Error("useReviews must be used within ReviewsProvider");
	return ctx;
}
