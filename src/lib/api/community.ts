// Rewards, donor claims, public profiles and follows.

import { api } from "./client";

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
	return api<Rewards>("/api/v1/rewards");
}

// startDonorClaim emails a code that proves ownership of a donation email.
export function startDonorClaim(email: string): Promise<{ message: string }> {
	return api<{ message: string }>("/api/v1/auth/donor/claim", {
		method: "POST",
		body: { email },
	});
}

// verifyDonorClaim links the donations made with the email to the account.
export function verifyDonorClaim(email: string, code: string): Promise<{ linked: number }> {
	return api<{ linked: number }>("/api/v1/auth/donor/claim/verify", {
		method: "POST",
		body: { email, code },
	});
}

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
	return api<PublicProfile>(`/api/v1/users/${encodeURIComponent(username)}`);
}

export function followUser(username: string): Promise<{ following: boolean }> {
	return api<{ following: boolean }>(`/api/v1/users/${encodeURIComponent(username)}/follow`, {
		method: "POST",
	});
}

export function unfollowUser(username: string): Promise<{ following: boolean }> {
	return api<{ following: boolean }>(`/api/v1/users/${encodeURIComponent(username)}/follow`, {
		method: "DELETE",
	});
}

export function fetchFollowers(username: string): Promise<string[]> {
	return api<{ usernames: string[] }>(`/api/v1/users/${encodeURIComponent(username)}/followers`, {}).then(
		(d) => d.usernames || [],
	);
}

export function fetchFollowing(username: string): Promise<string[]> {
	return api<{ usernames: string[] }>(`/api/v1/users/${encodeURIComponent(username)}/following`, {}).then(
		(d) => d.usernames || [],
	);
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
	return api<{ submissions: UserSubmissionItem[] }>(
		`/api/v1/users/${encodeURIComponent(username)}/submissions`,
		{},
	).then((d) => d.submissions || []);
}
