export const API_BASE = import.meta.env.VITE_ASSETS_API_URL || "https://neoassets.dev";
export const CDN_BASE = import.meta.env.VITE_CDN_BASE || "https://cdn.neoassets.dev";

export const USER_TOKEN_KEY = "neoassets-user-token";
export const USER_EMAIL_KEY = "neoassets-user-email";
export const USER_NAME_KEY = "neoassets-user-name";
export const USER_ROLE_KEY = "neoassets-user-role";
export const USER_ID_KEY = "neoassets-user-id";
export const ADMIN_TOKEN_KEY = "neoassets-admin-token";
export const ADMIN_EMAIL_KEY = "neoassets-admin-email";

export type SubmissionStatus = "created" | "pending" | "approved" | "rejected" | "trashed";

// Builds the public URL for an R2 object served via the custom domain.
export function cdnUrl(objectKey: string): string {
	return objectKey ? `${CDN_BASE}/${objectKey}` : "";
}

export interface SystemMeta {
	id: string;
	name: string;
	short_name: string;
}

export interface User {
	id: string;
	username: string;
	email: string;
	role: string;
	hidden?: boolean;
	protected?: boolean;
	xp: number;
	donor_status: string;
	avatar_key: string;
	email_verified: boolean;
	created_at: string;
	updated_at: string;
}

export interface AuthResult {
	user: User;
	token: string;
	is_admin?: boolean;
	admin_token?: string;
}

export interface Submission {
	id: string;
	pack_id: string;
	name: string;
	author: string;
	description: string;
	donation_url: string;
	ai: boolean;
	version: string;
	status: SubmissionStatus;
	anon_user_id: string;
	user_id?: string;
	created_at: string;
	reviewed_at?: string | null;
	reviewed_by?: string | null;
	admin_version: string;
}

export interface SubmissionFile {
	id: string;
	submission_id: string;
	object_key: string;
	file_name: string;
	system_id: string;
	kind: string;
	size: number;
	mime_type: string;
	created_at: string;
	reason?: string;
	replaces_object_key?: string;
	changed?: boolean;
}

export interface SubmissionLog {
	id: string;
	submission_id: string;
	action: string;
	user_id: string;
	user_agent: string;
	detail: string;
	created_at: string;
	user_name?: string;
}

export interface SubmissionDetail {
	id: string;
	pack_id: string;
	name: string;
	author: string;
	description: string;	donation_url: string;
	ai: boolean;
	version: string;
	status: SubmissionStatus;
	anon_user_id: string;
	user_id?: string;
	created_at: string;
	reviewed_at?: string | null;
	reviewed_by?: string | null;
	admin_version: string;
	submitted_by?: string;
	reviewed_by_name?: string;
	files?: SubmissionFile[];
	logs?: SubmissionLog[];
	points_earned?: number;
	base_points_earned?: number;
}

export interface Pack {
	folder: string;
	name: string;
	author: string;
	description: string;
	donation_url: string;
	ai: boolean;
	version: string;
	backgrounds?: string[];
	downloads?: number;
	systems_covered?: number;
	submitted_by?: string;
	contributions?: number;
	contributors?: string[];
}

export interface PackContribution {
	id: string;
	status: string;
	username: string;
	created_at: string;
	file_count: number;
}

export interface PackFile {
	kind: string;
	system_id?: string;
	file_name: string;
	object_key: string;
	url: string;
	size?: number;
	mime?: string;
}

export interface PackDetail {
	folder: string;
	name: string;
	author: string;
	description: string;
	donation_url: string;
	ai: boolean;
	version: string;
	backgrounds?: string[];
	downloads?: number;
	systems_covered?: number;
	submitted_by?: string;
	contributors?: string[];
	files: PackFile[];
	contributions?: PackContribution[];
}

export function fetchPackDetail(folder: string): Promise<PackDetail> {
	return api<PackDetail>(`/api/v1/packs/${encodeURIComponent(folder)}`);
}

export interface UploadResponse {
	upload_url: string;
	object_key: string;
	expires_at: string;
}

// ---------------------------------------------------------------------------
// Metadata (game metadata / system metadata)
// ---------------------------------------------------------------------------

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
	type?: string; // base | hack | homebrew
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

export class ApiError extends Error {
	status: number;
	constructor(message: string, status: number) {
		super(message);
		this.status = status;
	}
}

interface ApiOptions {
	method?: string;
	body?: unknown;
	token?: string | null;
	// signal aborts the request (e.g. when a search query changes before the
	// previous response arrives).
	signal?: AbortSignal;
}

export async function api<T = unknown>(path: string, opts: ApiOptions = {}): Promise<T> {
	const headers: Record<string, string> = { "Content-Type": "application/json" };
	if (opts.token) headers.Authorization = `Bearer ${opts.token}`;
	const res = await fetch(`${API_BASE}${path}`, {
		method: opts.method || "GET",
		headers,
		cache: "no-store",
		body: opts.body !== undefined ? JSON.stringify(opts.body) : undefined,
		signal: opts.signal,
	});
	if (!res.ok) {
		let detail = res.statusText;
		try {
			const body = await res.json();
			detail = body.error || detail;
		} catch {
			/* keep statusText */
		}
		throw new ApiError(detail, res.status);
	}
	return res.json() as Promise<T>;
}

export async function fetchSystems(): Promise<SystemMeta[]> {
	return api<SystemMeta[]>("/api/v1/systems");
}

// PublicConfig is the runtime rewards/scrape configuration from the backend.
export interface PublicConfig {
	guest_threads: number;
	admin_threads: number;
	daily_games_per_thread: number;
	points: {
		text_metadata: number;
		image_metadata: number;
		video_metadata: number;
		sap_image: number;
		new_game: number;
	};
	ranks: {
		rank: string;
		min_level: number;
		max_level: number;
		threads: number;
	}[];
	donor_tiers: {
		status: string;
		bonus_threads: number;
		xp_bonus_pct: number;
	}[];
}

export function fetchConfig(): Promise<PublicConfig> {
	return api<PublicConfig>("/api/v1/config");
}

export function userToken(): string | null {
	return localStorage.getItem(USER_TOKEN_KEY);
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

export function fetchMe(): Promise<User> {
	return api<User>("/api/v1/auth/me", { token: userToken() });
}

export function updateProfile(body: { username?: string; email?: string }): Promise<User> {
	return api<User>("/api/v1/auth/me", { method: "PUT", token: userToken(), body });
}

export function changePassword(body: { current_password: string; new_password: string }): Promise<{ message: string }> {
	return api<{ message: string }>("/api/v1/auth/password", { method: "POST", token: userToken(), body });
}

// Avatar: presign an upload (WebP or GIF), then confirm the stored object key.
export function presignAvatarUpload(mimeType: string, size: number): Promise<UploadResponse> {
	return api<UploadResponse>("/api/v1/auth/me/avatar/upload", { method: "POST", token: userToken(), body: { mime_type: mimeType, size } });
}

export function setAvatar(objectKey: string): Promise<User> {
	return api<User>("/api/v1/auth/me/avatar", { method: "POST", token: userToken(), body: { object_key: objectKey } });
}

export function removeAvatar(): Promise<User> {
	return api<User>("/api/v1/auth/me/avatar", { method: "DELETE", token: userToken() });
}

// ---------------------------------------------------------------------------
// Rewards (XP / levels / threads)
// ---------------------------------------------------------------------------

export interface Rewards {
	xp: number;
	level: number;
	rank: string;
	threads: number;
	donor_status: string;
	donor_bonus_threads: number;
	xp_bonus_pct: number;
	daily_games: number;
	level_xp: number;
	next_level_xp: number;
	progress_pct: number;
}

export function fetchRewards(): Promise<Rewards> {
	return api<Rewards>("/api/v1/rewards", { token: userToken() });
}

// startDonorClaim emails a code that proves ownership of a donation email.
export function startDonorClaim(email: string): Promise<{ message: string }> {
	return api<{ message: string }>("/api/v1/auth/donor/claim", { method: "POST", token: userToken(), body: { email } });
}

// verifyDonorClaim links the donations made with the email to the account.
export function verifyDonorClaim(email: string, code: string): Promise<{ linked: number }> {
	return api<{ linked: number }>("/api/v1/auth/donor/claim/verify", { method: "POST", token: userToken(), body: { email, code } });
}

// ---------------------------------------------------------------------------
// Public profiles + follows
// ---------------------------------------------------------------------------

export interface PublicProfile {
	id: string;
	username: string;
	role: string;
	created_at: string;
	xp: number;
	level: number;
	rank: string;
	threads: number;
	donor_status: string;
	avatar_key: string;
	approved: number;
	submitted: number;
	followers: number;
	following: number;
	is_following: boolean;
}

export function fetchPublicProfile(username: string): Promise<PublicProfile> {
	return api<PublicProfile>(`/api/v1/users/${encodeURIComponent(username)}`, { token: userToken() });
}

export function followUser(username: string): Promise<{ following: boolean }> {
	return api<{ following: boolean }>(`/api/v1/users/${encodeURIComponent(username)}/follow`, { method: "POST", token: userToken() });
}

export function unfollowUser(username: string): Promise<{ following: boolean }> {
	return api<{ following: boolean }>(`/api/v1/users/${encodeURIComponent(username)}/follow`, { method: "DELETE", token: userToken() });
}

export function fetchFollowers(username: string): Promise<string[]> {
	return api<{ usernames: string[] }>(`/api/v1/users/${encodeURIComponent(username)}/followers`, { token: userToken() }).then((d) => d.usernames || []);
}

export function fetchFollowing(username: string): Promise<string[]> {
	return api<{ usernames: string[] }>(`/api/v1/users/${encodeURIComponent(username)}/following`, { token: userToken() }).then((d) => d.usernames || []);
}

export interface UserSubmissionItem {
	kind: "sap" | "metadata";
	id: string;
	title: string;
	status: string;
	game_id?: string;
	system_id?: string;
	created_at: string;
}

export function fetchUserSubmissions(username: string): Promise<UserSubmissionItem[]> {
	return api<{ submissions: UserSubmissionItem[] }>(`/api/v1/users/${encodeURIComponent(username)}/submissions`, { token: userToken() }).then((d) => d.submissions || []);
}

export function userRole(): string | null {
	return localStorage.getItem(USER_ROLE_KEY);
}

export function isAdmin(): boolean {
	return userRole() === "admin" || !!adminToken();
}

export function isReviewer(): boolean {
	return userRole() === "admin" || userRole() === "reviewer" || !!adminToken();
}

// reviewToken is the token to use for review endpoints: an admin token if the
// user is an admin, otherwise the user token (reviewers authenticate as users).
export function reviewToken(): string | null {
	return adminToken() || userToken();
}

export function adminToken(): string | null {
	return localStorage.getItem(ADMIN_TOKEN_KEY);
}

// ---------------------------------------------------------------------------
// Metadata API helpers
// ---------------------------------------------------------------------------

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

export function fetchMetadataGamesBySystem(systemId: string, limit = 48, offset = 0, type = "", sort = "", signal?: AbortSignal): Promise<{ games: GameSummary[]; total: number }> {
	const params = new URLSearchParams({ limit: String(limit), offset: String(offset) });
	if (type) params.set("type", type);
	if (sort) params.set("sort", sort);
	return api<{ games: GameSummary[]; total: number }>(`/api/v1/metadata/systems/${systemId}/games?${params.toString()}`, { signal });
}

export function searchMetadataGames(q: string, systemId = "", limit = 48, offset = 0, type = "", sort = "", signal?: AbortSignal): Promise<{ games: GameSummary[]; total: number }> {
	const params = new URLSearchParams({ q, limit: String(limit), offset: String(offset) });
	if (systemId) params.set("system_id", systemId);
	if (type) params.set("type", type);
	if (sort) params.set("sort", sort);
	return api<{ games: GameSummary[]; total: number }>(`/api/v1/metadata/games?${params.toString()}`, { signal });
}

export function lookupMetadataGames(hashes: { crc?: string; md5?: string; sha1?: string; sha256?: string }): Promise<GameSummary[]> {
	const params = new URLSearchParams();
	Object.entries(hashes).forEach(([k, v]) => v && params.set(k, v));
	return api<{ games: GameSummary[] }>(`/api/v1/metadata/games/lookup?${params.toString()}`).then((d) => d.games || []);
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
	return api<{ keys: string[] }>(`/api/v1/metadata/games/${gameId}/pending`, { token: userToken() }).then((d) => d.keys || []);
}

export function createMetadataSubmission(body: {
	game_id?: string;
	system_id?: string;
	kind?: "edit" | "new_game";
	payload: Record<string, unknown>;
	files?: { kind: MediaKind; object_key: string; file_name: string; mime_type: string; size: number; region?: string; delete?: boolean; move?: boolean }[];
}): Promise<MetadataSubmission> {
	return api<MetadataSubmission>("/api/v1/metadata/submissions", { method: "POST", token: userToken(), body });
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
	return api<UploadResponse>("/api/v1/metadata/submissions/upload-url", { method: "POST", token: userToken(), body });
}

export function requestMetadataUpload(id: string, body: { kind: MediaKind; file_name: string; mime_type: string; size: number }): Promise<UploadResponse> {
	return api<UploadResponse>(`/api/v1/metadata/submissions/${id}/upload`, { method: "POST", token: userToken(), body });
}

export function submitMetadataSubmission(id: string): Promise<MetadataSubmission> {
	return api<MetadataSubmission>(`/api/v1/metadata/submissions/${id}/submit`, { method: "POST", token: userToken() });
}

export interface PagedList<T> {
	items: T[];
	total: number;
	totalXP: number;
}

function pagedQuery(opts?: { limit?: number; offset?: number; status?: string }): string {
	const p = new URLSearchParams();
	if (opts?.limit) p.set("limit", String(opts.limit));
	if (opts?.offset) p.set("offset", String(opts.offset));
	if (opts?.status) p.set("status", opts.status);
	const q = p.toString();
	return q ? `?${q}` : "";
}

export function fetchMyMetadataSubmissions(opts?: { limit?: number; offset?: number; status?: string }): Promise<PagedList<MetadataSubmission>> {
	return api<{ submissions: MetadataSubmission[]; total: number; total_xp: number }>(
		`/api/v1/auth/metadata/submissions${pagedQuery(opts)}`,
		{ token: userToken() },
	).then((d) => ({ items: d.submissions || [], total: d.total || 0, totalXP: d.total_xp || 0 }));
}

// fetchMySubmissions returns the current user's system art pack submissions
// (including their files and review logs).
export function fetchMySubmissions(opts?: { limit?: number; offset?: number; status?: string }): Promise<PagedList<SubmissionDetail>> {
	return api<{ submissions: SubmissionDetail[]; total: number; total_xp: number }>(
		`/api/v1/auth/submissions${pagedQuery(opts)}`,
		{ token: userToken() },
	).then((d) => ({ items: d.submissions || [], total: d.total || 0, totalXP: d.total_xp || 0 }));
}

// cancelMetadataSubmission deletes the current user's own metadata submission
// (draft, pending or rejected) so a mistake can be cleared and submitted again.
export function cancelMetadataSubmission(id: string): Promise<{ ok: boolean }> {
	return api<{ ok: boolean }>(`/api/v1/metadata/submissions/${id}`, { method: "DELETE", token: userToken() });
}

// trashSubmission moves the current user's own system art pack submission to the
// trash (draft, pending or rejected) so it can be submitted again.
export function trashSubmission(id: string): Promise<void> {
	return api(`/api/v1/submissions/${id}/trash`, { method: "POST", token: userToken() });
}

// ReviewSummaryItem is a lightweight notification entry (no payload/files/logs).
export interface ReviewSummaryItem {
	kind: "metadata" | "sap";
	id: string;
	status: string;
	at: string;
}

export interface ReviewSummary {
	items: ReviewSummaryItem[];
	total_xp: number;
}

// fetchReviewSummary powers the notification badge: the newest review keys and
// the lifetime XP, without downloading the full review feed.
export function fetchReviewSummary(limit = 20): Promise<ReviewSummary> {
	return api<ReviewSummary>(`/api/v1/auth/reviews/summary?limit=${limit}`, { token: userToken() });
}

// Admin
export function fetchMetadataSubmissions(status = ""): Promise<MetadataSubmission[]> {
	const q = status ? `?status=${status}` : "";
	return api<{ submissions: MetadataSubmission[] }>(`/api/v1/admin/metadata/submissions${q}`, { token: reviewToken() }).then((d) => d.submissions || []);
}

export interface MetadataSubmissionDetail {
	submission: MetadataSubmission;
	files: MetadataSubmissionFile[];
	game?: GameDetail;
	system?: MetadataSystem;
	media: MetadataMedia[];
}

export function fetchMetadataSubmissionDetail(id: string): Promise<MetadataSubmissionDetail> {
	return api<MetadataSubmissionDetail>(`/api/v1/admin/metadata/submissions/${id}`, { token: reviewToken() });
}

export function approveMetadataSubmission(id: string, comment = ""): Promise<MetadataSubmission> {
	return api<MetadataSubmission>(`/api/v1/admin/metadata/submissions/${id}/approve`, { method: "POST", token: reviewToken(), body: { comment } });
}

export function rejectMetadataSubmission(id: string, comment = ""): Promise<MetadataSubmission> {
	return api<MetadataSubmission>(`/api/v1/admin/metadata/submissions/${id}/reject`, { method: "POST", token: reviewToken(), body: { comment } });
}

// ---------------------------------------------------------------------------
// Dashboard
// ---------------------------------------------------------------------------

export interface DashUserCount {
	id: string;
	username: string;
	avatar_key?: string;
	count: number;
}

export interface DashRecentPack {
	id: string;
	pack_id: string;
	name: string;
	author: string;
	version: string;
	created_at: string;
	author_name?: string;
	image?: string;
}

export interface DashRecentMetadata {
	id: string;
	game_id?: string;
	system_id?: string;
	game_name: string;
	system_name: string;
	submitted_by?: string;
	created_at: string;
}

export interface DashLevel {
	id: string;
	username: string;
	avatar_key?: string;
	xp: number;
	level: number;
	rank: string;
	threads: number;
}

export interface DashGame {
	id: string;
	system_id: string;
	name: string;
	scrapes: number;
	last_scraped_at?: string | null;
}

export interface DashSystem {
	system_id: string;
	name: string;
	scrapes: number;
}

export interface DashboardData {
	total_games: number;
	total_packs: number;
	total_systems: number;
	total_users: number;
	total_contributions: number;
	top_contributions: DashUserCount[];
	top_approved_week: DashUserCount[];
	top_levels: DashLevel[];
	top_games: DashGame[];
	top_systems: DashSystem[];
	recent_packs: DashRecentPack[];
	recent_metadata: DashRecentMetadata[];
}

export function fetchDashboard(): Promise<DashboardData> {
	return api<DashboardData>("/api/v1/dashboard", { token: userToken() });
}

export interface StorageUsage {
	total_bytes: number;
	storage_bytes: number;
	storage_objects: number;
	db_bytes: number;
}

export function fetchStorageUsage(): Promise<StorageUsage> {
	return api<StorageUsage>("/api/v1/admin/storage-usage", { token: reviewToken() });
}

// Admin role management (admin only)
export function fetchUsers(): Promise<User[]> {
	return api<{ users: User[] }>("/api/v1/admin/users", { token: adminToken() }).then((d) => d.users || []);
}

export function setUserRole(id: string, role: string): Promise<User> {
	return api<User>(`/api/v1/admin/users/${id}/role`, { method: "PUT", token: adminToken(), body: { role } });
}

// setDonorStatus updates a user's donor status (none | supporter | monthly_supporter).
export function setDonorStatus(id: string, status: string): Promise<User> {
	return api<User>(`/api/v1/admin/users/${id}/donor`, { method: "PUT", token: adminToken(), body: { status } });
}

// DonationImportItem is one normalized supporter row for the historical import.
export interface DonationImportItem {
	platform?: "kofi" | "patreon";
	email: string;
	from_name?: string;
	kind: "subscription" | "one_time";
	amount_cents: number;
	currency?: string;
	occurred_at?: string;
	external_id?: string;
	tier_name?: string;
	active?: boolean;
}

// importDonations backfills historical donations (admin only). Idempotent by
// external_id, so re-importing the same export does not duplicate events.
export function importDonations(donations: DonationImportItem[]): Promise<{ imported: number; linked: number; skipped: number }> {
	return api("/api/v1/admin/donations/import", { method: "POST", token: adminToken(), body: { donations } });
}

// ---------------------------------------------------------------------------
// Scraping API credentials (developer apps + personal API keys)
// ---------------------------------------------------------------------------

export interface SoftwareStats {
	app_id: string;
	name: string;
	api_calls: number;
	ko_scraps: number;
	rate_limited: number;
	quota_exceeded: number;
	debug_calls: number;
	last_scrape_at?: string | null;
}

export interface DeveloperApp {
	id: string;
	user_id: string;
	name: string;
	description: string;
	homepage_url: string;
	client_id: string;
	debug_password?: string;
	last_used_at?: string | null;
	revoked_at?: string | null;
	created_at: string;
	updated_at: string;
	api_calls: number;
	ko_scraps: number;
	rate_limited: number;
	quota_exceeded: number;
	debug_calls: number;
	last_scrape_at?: string | null;
	software?: SoftwareStats[];
}

export interface CreatedDeveloperApp extends DeveloperApp {
	client_secret: string;
}

export interface UserAPIKey {
	id: string;
	user_id: string;
	name: string;
	prefix: string;
	last_used_at?: string | null;
	revoked_at?: string | null;
	created_at: string;
}

export interface CreatedUserAPIKey extends UserAPIKey {
	key: string;
}

export function fetchDeveloperApps(): Promise<DeveloperApp[]> {
	return api<{ apps: DeveloperApp[] }>("/api/v1/auth/developer/apps", { token: userToken() }).then((d) => d.apps || []);
}

export function createDeveloperApp(body: { name: string; description?: string; homepage_url?: string }): Promise<CreatedDeveloperApp> {
	return api<CreatedDeveloperApp>("/api/v1/auth/developer/apps", { method: "POST", token: userToken(), body });
}

export function deleteDeveloperApp(id: string): Promise<{ revoked: boolean }> {
	return api<{ revoked: boolean }>(`/api/v1/auth/developer/apps/${id}`, { method: "DELETE", token: userToken() });
}

export function rotateDeveloperApp(id: string): Promise<CreatedDeveloperApp> {
	return api<CreatedDeveloperApp>(`/api/v1/auth/developer/apps/${id}/rotate`, { method: "POST", token: userToken() });
}

export function fetchAPIKeys(): Promise<UserAPIKey[]> {
	return api<{ keys: UserAPIKey[] }>("/api/v1/auth/api-keys", { token: userToken() }).then((d) => d.keys || []);
}

export function createAPIKey(body: { name: string }): Promise<CreatedUserAPIKey> {
	return api<CreatedUserAPIKey>("/api/v1/auth/api-keys", { method: "POST", token: userToken(), body });
}

export function deleteAPIKey(id: string): Promise<{ revoked: boolean }> {
	return api<{ revoked: boolean }>(`/api/v1/auth/api-keys/${id}`, { method: "DELETE", token: userToken() });
}