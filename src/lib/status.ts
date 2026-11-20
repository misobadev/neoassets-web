// Badge class for each submission/review status (packs, metadata and reviews
// share the same set), so a status reads the same color on every page.
export const STATUS_BADGE: Record<string, string> = {
	created: "badge-info",
	pending: "badge-warning",
	approved: "badge-success",
	rejected: "badge-error",
	trashed: "badge-ghost",
};

// statusBadge returns the badge class for a status, or fallback for an
// unknown one.
export function statusBadge(status: string, fallback = "badge-info"): string {
	return STATUS_BADGE[status] || fallback;
}
