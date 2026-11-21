// Admin dashboard, storage usage, users and donations.

import type { User } from "./account";
import { api } from "./client";

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
	cover?: string;
	cover_updated?: string;
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
	// Only the total used space is public on the dashboard.
	storage?: { total_bytes: number };
}

export function fetchDashboard(): Promise<DashboardData> {
	return api<DashboardData>("/api/v1/dashboard");
}

export interface StorageUsage {
	total_bytes: number;
	storage_bytes: number;
	storage_objects: number;
	db_bytes: number;
}

export function fetchStorageUsage(): Promise<StorageUsage> {
	return api<StorageUsage>("/api/v1/admin/storage-usage");
}

// Admin role management (admin only)
export function fetchUsers(): Promise<User[]> {
	return api<{ users: User[] }>("/api/v1/admin/users").then((d) => d.users || []);
}

export function setUserRole(id: string, role: string): Promise<User> {
	return api<User>(`/api/v1/admin/users/${id}/role`, { method: "PUT", body: { role } });
}

// setDonorStatus updates a user's donor status (none | supporter | monthly_supporter).
export function setDonorStatus(id: string, status: string): Promise<User> {
	return api<User>(`/api/v1/admin/users/${id}/donor`, { method: "PUT", body: { status } });
}

// DonationImportItem is one normalized supporter row for the historical import.
export interface DonationImportItem {
	platform?: "patreon";
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
export function importDonations(
	donations: DonationImportItem[],
): Promise<{ imported: number; linked: number; skipped: number }> {
	return api("/api/v1/admin/donations/import", { method: "POST", body: { donations } });
}

// deletePack permanently removes a published system art pack: every version,
// pending contributions and all its stored images (admin only).
export function deletePack(folder: string): Promise<{ deleted: boolean }> {
	return api<{ deleted: boolean }>(`/api/v1/admin/packs/${encodeURIComponent(folder)}`, { method: "DELETE" });
}

// Changes the donation link of an approved pack (admin only). An empty link
// removes it; the response carries the link as stored.
export function setPackDonation(folder: string, donationURL: string): Promise<{ donation_url: string }> {
	return api<{ donation_url: string }>(`/api/v1/admin/packs/${encodeURIComponent(folder)}/donation`, {
		method: "PUT",
		body: { donation_url: donationURL },
	});
}

// Developer apps and personal API keys with their usage (admin only).
export interface AdminSoftwareStats {
	name: string;
	api_calls: number;
	ko_scraps: number;
	rate_limited: number;
	quota_exceeded: number;
	last_scrape_at?: string | null;
}

export interface AdminDeveloperApp {
	id: string;
	name: string;
	owner: string;
	client_id: string;
	homepage_url: string;
	created_at: string;
	last_used_at?: string | null;
	last_scrape_at?: string | null;
	revoked_at?: string | null;
	api_calls: number;
	ko_scraps: number;
	rate_limited: number;
	quota_exceeded: number;
	software?: AdminSoftwareStats[];
}

export interface AdminAPIKey {
	id: string;
	name: string;
	owner: string;
	prefix: string;
	created_at: string;
	last_used_at?: string | null;
	revoked_at?: string | null;
	owner_scrapes_today: number;
	owner_scrapes_30d: number;
}

export interface DeveloperOverview {
	totals: {
		active_apps: number;
		active_keys: number;
		api_calls: number;
		scrapes_today: number;
		scrapes_30d: number;
		quota_exceeded: number;
		rate_limited: number;
	};
	apps: AdminDeveloperApp[];
	keys: AdminAPIKey[];
}

export function fetchDeveloperOverview(): Promise<DeveloperOverview> {
	return api<DeveloperOverview>("/api/v1/admin/developer");
}
