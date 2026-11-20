// The signed-in user's own account: profile, password, avatar, logout.

import { api, type UploadResponse } from "./client";

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
	// The session is delivered as httpOnly cookies; the server no longer returns
	// the raw tokens to the browser.
	token?: string;
	is_admin?: boolean;
	admin_token?: string;
}

export function fetchMe(): Promise<User> {
	return api<User>("/api/v1/auth/me");
}

export function updateProfile(body: { username?: string; email?: string }): Promise<User> {
	return api<User>("/api/v1/auth/me", { method: "PUT", body });
}

export function changePassword(body: { current_password: string; new_password: string }): Promise<{ message: string }> {
	return api<{ message: string }>("/api/v1/auth/password", { method: "POST", body });
}

// Avatar: presign an upload (WebP or GIF), then confirm the stored object key.
export function presignAvatarUpload(mimeType: string, size: number): Promise<UploadResponse> {
	return api<UploadResponse>("/api/v1/auth/me/avatar/upload", {
		method: "POST",
		body: { mime_type: mimeType, size },
	});
}

export function setAvatar(objectKey: string): Promise<User> {
	return api<User>("/api/v1/auth/me/avatar", { method: "POST", body: { object_key: objectKey } });
}

export function removeAvatar(): Promise<User> {
	return api<User>("/api/v1/auth/me/avatar", { method: "DELETE" });
}

// logoutRequest clears the httpOnly session cookies on the server.
export function logoutRequest(): Promise<{ message: string }> {
	return api<{ message: string }>("/api/v1/logout", { method: "POST" });
}
