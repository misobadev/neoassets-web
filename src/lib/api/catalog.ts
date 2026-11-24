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
	daily_games_per_thread: number;
	// Requests per minute per thread (an account gets threads * this).
	rpm_per_thread?: number;
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
