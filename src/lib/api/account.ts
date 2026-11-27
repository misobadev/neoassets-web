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
	// A new address waiting for its confirmation link; email stays in use until then.
	pending_email?: string;
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

// A new email needs the current password and only takes effect once the link
// mailed to it is opened (confirmEmailChange).
export function updateProfile(body: { username?: string; email?: string; current_password?: string }): Promise<User> {
	return api<User>("/api/v1/auth/me", { method: "PUT", body });
}

// confirmEmailChange applies the pending email. The server then signs the
// account out everywhere, so the caller has to sign in again.
export function confirmEmailChange(token: string): Promise<{ message: string }> {
	return api<{ message: string }>("/api/v1/auth/me/email/confirm", { method: "POST", body: { token } });
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
