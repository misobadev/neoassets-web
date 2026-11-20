// Scraping API credentials: developer apps and personal API keys.

import { api } from "./client";

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
	return api<{ apps: DeveloperApp[] }>("/api/v1/auth/developer/apps").then((d) => d.apps || []);
}

export function createDeveloperApp(body: {
	name: string;
	description?: string;
	homepage_url?: string;
}): Promise<CreatedDeveloperApp> {
	return api<CreatedDeveloperApp>("/api/v1/auth/developer/apps", { method: "POST", body });
}

export function deleteDeveloperApp(id: string): Promise<{ revoked: boolean }> {
	return api<{ revoked: boolean }>(`/api/v1/auth/developer/apps/${id}`, { method: "DELETE" });
}

export function rotateDeveloperApp(id: string): Promise<CreatedDeveloperApp> {
	return api<CreatedDeveloperApp>(`/api/v1/auth/developer/apps/${id}/rotate`, { method: "POST" });
}

export function fetchAPIKeys(): Promise<UserAPIKey[]> {
	return api<{ keys: UserAPIKey[] }>("/api/v1/auth/api-keys").then((d) => d.keys || []);
}

export function createAPIKey(body: { name: string }): Promise<CreatedUserAPIKey> {
	return api<CreatedUserAPIKey>("/api/v1/auth/api-keys", { method: "POST", body });
}

export function deleteAPIKey(id: string): Promise<{ revoked: boolean }> {
	return api<{ revoked: boolean }>(`/api/v1/auth/api-keys/${id}`, { method: "DELETE" });
}
