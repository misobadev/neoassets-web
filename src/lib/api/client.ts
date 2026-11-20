// HTTP client: the API/CDN base URLs, the JSON request helper and the
// types shared by every domain module.

import { clearStoredAuth } from "./session";

export const API_BASE = import.meta.env.VITE_ASSETS_API_URL || "https://neoassets.dev";
export const CDN_BASE = import.meta.env.VITE_CDN_BASE || "https://cdn.neoassets.dev";

// Builds the public URL for an R2 object served via the custom domain.
export function cdnUrl(objectKey: string): string {
	return objectKey ? `${CDN_BASE}/${objectKey}` : "";
}

export interface UploadResponse {
	upload_url: string;
	object_key: string;
	expires_at: string;
}

export class ApiError extends Error {
	status: number;
	// data is the parsed error body, so callers can read extra fields (e.g. a
	// name conflict's conflicting game).
	data?: unknown;
	constructor(message: string, status: number, data?: unknown) {
		super(message);
		this.status = status;
		this.data = data;
	}
}

interface ApiOptions {
	method?: string;
	body?: unknown;
	// signal aborts the request (e.g. when a search query changes before the
	// previous response arrives).
	signal?: AbortSignal;
}

export async function api<T = unknown>(path: string, opts: ApiOptions = {}): Promise<T> {
	const headers: Record<string, string> = { "Content-Type": "application/json" };
	const res = await fetch(`${API_BASE}${path}`, {
		method: opts.method || "GET",
		headers,
		cache: "no-store",
		// The session is an httpOnly cookie, so every request must opt into
		// sending credentials.
		credentials: "include",
		body: opts.body !== undefined ? JSON.stringify(opts.body) : undefined,
		signal: opts.signal,
	});
	if (!res.ok) {
		let detail = res.statusText;
		let body: unknown = null;
		try {
			body = await res.json();
			detail = (body as { error?: string })?.error || detail;
		} catch {
			/* keep statusText */
		}
		// 401 means the session cookie is missing/expired/revoked: drop the
		// cached (non-secret) auth state so the UI falls back to guest.
		if (res.status === 401) clearStoredAuth();
		throw new ApiError(detail, res.status, body);
	}
	// Some endpoints answer 204 / an empty body; resolve those to undefined
	// instead of failing on JSON parsing.
	const text = await res.text();
	return (text ? JSON.parse(text) : undefined) as T;
}

export interface PagedList<T> {
	items: T[];
	total: number;
	totalXP: number;
}

export function pagedQuery(opts?: { limit?: number; offset?: number; status?: string }): string {
	const p = new URLSearchParams();
	if (opts?.limit) p.set("limit", String(opts.limit));
	if (opts?.offset) p.set("offset", String(opts.offset));
	if (opts?.status) p.set("status", opts.status);
	const q = p.toString();
	return q ? `?${q}` : "";
}

// mediaUrl is cdnUrl plus a cache-busting version (usually the object's
// created/updated time), so a replaced image is not served stale. Game media
// keys are opaque UUIDs (media/games/{system}/{uuid}.webp), and a replacement
// gets a new row and created_at, hence a new version.
export function mediaUrl(objectKey: string, version?: string | null): string {
	return cdnUrl(objectKey) + (version ? `?v=${encodeURIComponent(version)}` : "");
}
