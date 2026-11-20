// Review notifications for the signed-in contributor.

import { api } from "./client";

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
	return api<ReviewSummary>(`/api/v1/auth/reviews/summary?limit=${limit}`);
}
