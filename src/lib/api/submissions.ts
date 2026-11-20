// System art pack submissions and packs.

import { api, pagedQuery, type PagedList } from "./client";

export type SubmissionStatus = "created" | "pending" | "approved" | "rejected" | "trashed";

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

// fetchMySubmissions returns the current user's system art pack submissions
// (including their files and review logs).
export function fetchMySubmissions(opts?: {
	limit?: number;
	offset?: number;
	status?: string;
}): Promise<PagedList<SubmissionDetail>> {
	return api<{ submissions: SubmissionDetail[]; total: number; total_xp: number }>(
		`/api/v1/auth/submissions${pagedQuery(opts)}`,
	).then((d) => ({ items: d.submissions || [], total: d.total || 0, totalXP: d.total_xp || 0 }));
}

// trashSubmission moves the current user's own system art pack submission to the
// trash (draft, pending or rejected) so it can be submitted again.
export function trashSubmission(id: string): Promise<void> {
	return api(`/api/v1/submissions/${id}/trash`, { method: "POST" });
}
