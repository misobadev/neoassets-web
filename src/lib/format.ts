export function escapeHtml(value: unknown): string {
	return String(value).replace(
		/[&<>"']/g,
		(c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[c] as string,
	);
}

export function formatDate(value: string): string {
	return new Date(value).toLocaleString();
}