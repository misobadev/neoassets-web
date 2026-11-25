// Public catalog and runtime configuration.

import { api } from "./client";

export interface SystemMeta {
	id: string;
	name: string;
	short_name: string;
}

export async function fetchSystems(): Promise<SystemMeta[]> {
	return api<SystemMeta[]>("/api/v1/systems");
}

// PublicConfig is the runtime rewards/scrape configuration from the backend.
export interface PublicConfig {
	guest_threads: number;
	admin_threads: number;
	// Requests per minute per thread (an account gets threads * this).
	rpm_per_thread?: number;
	// Requests per minute per guest thread (lower than a user's).
	guest_rpm_per_thread?: number;
	// Always true: scraping has no daily limit.
	daily_unlimited?: boolean;
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

// ScrapeStatus is the live, public state of the scraping API: requests in the
// last minute, open threads (requests in progress or waiting) against their
// caps, and the scrapers active in the last few minutes.
export interface ScrapeStatus {
	requests_per_minute: number;
	open_threads: { users: number; users_max: number; guests: number; guests_max: number };
	scrapers: { users: number; guests: number };
	updated_at: string;
}

export function fetchScrapeStatus(): Promise<ScrapeStatus> {
	return api<ScrapeStatus>("/api/v1/scrape/status");
}
