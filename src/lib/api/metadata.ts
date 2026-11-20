// Game metadata: systems, games, ROMs, media and metadata submissions.

import { api, pagedQuery, type PagedList, type UploadResponse } from "./client";

export type MetadataStatus = "created" | "pending" | "approved" | "rejected";

export type MediaKind = "cover" | "boxfront" | "boxback" | "screenshot" | "logo" | "fanart" | "video";

export interface MetadataSystem {
	id: string;
	name: string;
	short_name: string;
	region: string;
	description: string;
	external_id?: string;
	family?: string;
	group?: string;
	virtual?: boolean;
	total_games?: number;
	base?: number;
	hack?: number;
	homebrew?: number;
	bootleg?: number;
	aftermarket?: number;
	metadata_pct?: number;
	text_pct?: number;
	media_pct?: number;
}

export interface MetadataFamily {
	family: string;
	systems: number;
	total_games: number;
}

export interface MetadataGroup {
	group: string;
	family: string;
	systems: number;
	total_games: number;
}

export interface Language {
	code: string;
	name: string;
	native_name: string;
}

export interface GameSummary {
	id: string;
	system_id: string;
	name: string;
	description: string;
	release_year?: number | null;
	release_month?: number | null;
	publisher: string;
	developer: string;
	genre: string;
	rating?: number;
	system_name: string;
	cover?: string | null;
	cover_updated?: string;
	type?: string; // base | homebrew | hack | bootleg | aftermarket
	text_complete?: boolean;
	has_translations?: boolean;
	has_screenshot?: boolean;
	has_fanart?: boolean;
	has_video?: boolean;
	has_logo?: boolean;
	scrapes?: number;
}

export interface Rom {
	id: string;
	name: string;
	size: number;
	crc: string;
	md5: string;
	sha1: string;
	sha256: string;
	region: string;
}

export interface MetadataMedia {
	id: string;
	kind: MediaKind;
	object_key: string;
	mime: string;
	size: number;
	region?: string;
	created_at?: string;
	submitted_by?: string;
	submitted_by_name?: string;
}

export interface GameContributor {
	id: string;
	username: string;
	avatar_key?: string;
	count: number;
}

export interface GameRegion {
	region: string;
	name?: string;
	release_year?: number | null;
	release_month?: number | null;
	media?: MetadataMedia[];
}

export interface GameDetail extends GameSummary {
	roms: Rom[];
	media: MetadataMedia[];
	regions?: GameRegion[];
	region?: string;
	lang?: string;
	translations?: Language[];
	contributors?: GameContributor[];
}

export interface MetadataSubmission {
	id: string;
	game_id?: string | null;
	system_id?: string | null;
	user_id: string;
	status: MetadataStatus;
	kind?: "edit" | "new_game";
	payload: Record<string, unknown>;
	// Snapshot of the target's published text and media at approval time, so the
	// review detail can show the "old" side after the target was updated.
	old_payload?: Record<string, unknown>;
	old_media?: MetadataMedia[];
	review_comment: string;
	created_at: string;
	reviewed_at?: string | null;
	reviewed_by_name?: string;
	submitted_by_name?: string;
	game_name?: string;
	system_name?: string;
	cover?: string;
	cover_updated?: string;
	change_kinds?: string[];
	// Uploaded media, populated on the review feed so the submitted media can be
	// shown before the submission is approved.
	files?: MetadataSubmissionFile[];
	points_earned?: number;
	base_points_earned?: number;
}

export interface MetadataSubmissionFile {
	id: string;
	kind: MediaKind;
	object_key: string;
	file_name: string;
	mime: string;
	size: number;
	region?: string;
	created_at?: string;
	video_format?: string;
	video_codec?: string;
	width?: number;
	height?: number;
	fps?: number;
	duration_sec?: number;
}

export function fetchMetadataSystems(): Promise<MetadataSystem[]> {
	return api<{ systems: MetadataSystem[] }>("/api/v1/metadata/systems").then((d) => d.systems || []);
}

export interface Genre {
	id: string;
	name: string;
}

// GENRE_FALLBACK mirrors the backend catalog and is only used when the genres
// endpoint is unavailable, so the metadata forms never render an empty select.
export const GENRE_FALLBACK: Genre[] = [
	{ id: "action", name: "Action" },
	{ id: "adventure", name: "Adventure" },
	{ id: "beat-em-up", name: "Beat 'em Up" },
	{ id: "fighting", name: "Fighting" },
	{ id: "platformer", name: "Platformer" },
	{ id: "puzzle", name: "Puzzle" },
	{ id: "racing", name: "Racing" },
	{ id: "rpg", name: "Role-Playing (RPG)" },
	{ id: "shooter", name: "Shooter" },
	{ id: "shoot-em-up", name: "Shoot 'em Up" },
	{ id: "simulation", name: "Simulation" },
	{ id: "sports", name: "Sports" },
	{ id: "strategy", name: "Strategy" },
	{ id: "music", name: "Music & Rhythm" },
	{ id: "board-card", name: "Board & Card" },
	{ id: "pinball", name: "Pinball" },
	{ id: "educational", name: "Educational" },
	{ id: "quiz", name: "Quiz" },
	{ id: "compilation", name: "Compilation" },
	{ id: "miscellaneous", name: "Miscellaneous" },
];

export function fetchGenres(): Promise<Genre[]> {
	return api<{ genres: Genre[] }>("/api/v1/metadata/genres")
		.then((d) => (d.genres && d.genres.length > 0 ? d.genres : GENRE_FALLBACK))
		.catch(() => GENRE_FALLBACK);
}

export interface Region {
	id: string;
	name: string;
}

// REGION_FALLBACK mirrors the backend catalog (priority/display order) and is
// only used when the regions endpoint is unavailable.
export const REGION_FALLBACK: Region[] = [
	{ id: "world", name: "World" },
	{ id: "usa", name: "USA" },
	{ id: "europe", name: "Europe" },
	{ id: "japan", name: "Japan" },
	{ id: "brazil", name: "Brazil" },
	{ id: "asia", name: "Asia" },
	{ id: "spain", name: "Spain" },
	{ id: "france", name: "France" },
	{ id: "germany", name: "Germany" },
	{ id: "italy", name: "Italy" },
	{ id: "korea", name: "Korea" },
	{ id: "china", name: "China" },
];

export function fetchRegions(): Promise<Region[]> {
	return api<{ regions: Region[] }>("/api/v1/metadata/regions")
		.then((d) => (d.regions && d.regions.length > 0 ? d.regions : REGION_FALLBACK))
		.catch(() => REGION_FALLBACK);
}

export function fetchMetadataGamesBySystem(
	systemId: string,
	limit = 48,
	offset = 0,
	type = "",
	sort = "",
	signal?: AbortSignal,
): Promise<{ games: GameSummary[]; total: number }> {
	const params = new URLSearchParams({ limit: String(limit), offset: String(offset) });
	if (type) params.set("type", type);
	if (sort) params.set("sort", sort);
	return api<{ games: GameSummary[]; total: number }>(
		`/api/v1/metadata/systems/${systemId}/games?${params.toString()}`,
		{ signal },
	);
}

export function searchMetadataGames(
	q: string,
	systemId = "",
	limit = 48,
	offset = 0,
	type = "",
	sort = "",
	signal?: AbortSignal,
): Promise<{ games: GameSummary[]; total: number }> {
	const params = new URLSearchParams({ q, limit: String(limit), offset: String(offset) });
	if (systemId) params.set("system_id", systemId);
	if (type) params.set("type", type);
	if (sort) params.set("sort", sort);
	return api<{ games: GameSummary[]; total: number }>(`/api/v1/metadata/games?${params.toString()}`, { signal });
}

export function lookupMetadataGames(hashes: {
	crc?: string;
	md5?: string;
	sha1?: string;
	sha256?: string;
}): Promise<GameSummary[]> {
	const params = new URLSearchParams();
	Object.entries(hashes).forEach(([k, v]) => v && params.set(k, v));
	return api<{ games: GameSummary[] }>(`/api/v1/metadata/games/lookup?${params.toString()}`).then(
		(d) => d.games || [],
	);
}

export function fetchMetadataGameDetail(id: string, lang = ""): Promise<GameDetail> {
	const params = lang ? `?lang=${encodeURIComponent(lang)}` : "";
	return api<GameDetail>(`/api/v1/metadata/games/${id}${params}`);
}

export function fetchMetadataLanguages(): Promise<Language[]> {
	return api<{ languages: Language[] }>("/api/v1/metadata/languages").then((d) => d.languages || []);
}

// fetchMetadataPendingKeys returns the fields/media kinds that already have a
// pending submission from the current user for a game.
export function fetchMetadataPendingKeys(gameId: string): Promise<string[]> {
	return api<{ keys: string[] }>(`/api/v1/metadata/games/${gameId}/pending`).then((d) => d.keys || []);
}

export function createMetadataSubmission(body: {
	game_id?: string;
	system_id?: string;
	kind?: "edit" | "new_game";
	payload: Record<string, unknown>;
	files?: {
		kind: MediaKind;
		object_key: string;
		file_name: string;
		mime_type: string;
		size: number;
		region?: string;
		delete?: boolean;
		move?: boolean;
	}[];
}): Promise<MetadataSubmission> {
	return api<MetadataSubmission>("/api/v1/metadata/submissions", { method: "POST", body });
}

export function requestMetadataUploadUrl(body: {
	game_id?: string;
	system_id?: string;
	kind: MediaKind;
	file_name: string;
	mime_type: string;
	size: number;
	region?: string;
}): Promise<UploadResponse> {
	return api<UploadResponse>("/api/v1/metadata/submissions/upload-url", { method: "POST", body });
}

export function requestMetadataUpload(
	id: string,
	body: { kind: MediaKind; file_name: string; mime_type: string; size: number },
): Promise<UploadResponse> {
	return api<UploadResponse>(`/api/v1/metadata/submissions/${id}/upload`, {
		method: "POST",
		body,
	});
}

export function submitMetadataSubmission(id: string): Promise<MetadataSubmission> {
	return api<MetadataSubmission>(`/api/v1/metadata/submissions/${id}/submit`, { method: "POST" });
}

export function fetchMyMetadataSubmissions(opts?: {
	limit?: number;
	offset?: number;
	status?: string;
}): Promise<PagedList<MetadataSubmission>> {
	return api<{ submissions: MetadataSubmission[]; total: number; total_xp: number }>(
		`/api/v1/auth/metadata/submissions${pagedQuery(opts)}`,
	).then((d) => ({ items: d.submissions || [], total: d.total || 0, totalXP: d.total_xp || 0 }));
}

// cancelMetadataSubmission deletes the current user's own metadata submission
// (draft, pending or rejected) so a mistake can be cleared and submitted again.
export function cancelMetadataSubmission(id: string): Promise<{ ok: boolean }> {
	return api<{ ok: boolean }>(`/api/v1/metadata/submissions/${id}`, { method: "DELETE" });
}

// Admin
export function fetchMetadataSubmissions(status = ""): Promise<MetadataSubmission[]> {
	const q = status ? `?status=${status}` : "";
	return api<{ submissions: MetadataSubmission[] }>(`/api/v1/admin/metadata/submissions${q}`, {}).then(
		(d) => d.submissions || [],
	);
}

export interface MetadataSubmissionDetail {
	submission: MetadataSubmission;
	files: MetadataSubmissionFile[];
	game?: GameDetail;
	system?: MetadataSystem;
	media: MetadataMedia[];
}

export function fetchMetadataSubmissionDetail(id: string): Promise<MetadataSubmissionDetail> {
	return api<MetadataSubmissionDetail>(`/api/v1/admin/metadata/submissions/${id}`);
}

export function approveMetadataSubmission(id: string, comment = ""): Promise<MetadataSubmission> {
	return api<MetadataSubmission>(`/api/v1/admin/metadata/submissions/${id}/approve`, {
		method: "POST",
		body: { comment },
	});
}

export function rejectMetadataSubmission(id: string, comment = ""): Promise<MetadataSubmission> {
	return api<MetadataSubmission>(`/api/v1/admin/metadata/submissions/${id}/reject`, {
		method: "POST",
		body: { comment },
	});
}
