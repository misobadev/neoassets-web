// formatDate renders a timestamp in the viewer's locale. A missing value
// renders as fallback (empty by default), e.g. "never" for an unused key.
export function formatDate(value?: string | null, fallback = ""): string {
	if (!value) return fallback;
	return new Date(value).toLocaleString();
}

const KB = 1024;
const MB = KB * 1024;
const GB = MB * 1024;

// formatBytes renders a byte count as a short size: whole KB/MB, GB with one
// decimal. Used for upload limits, picked files and storage totals.
export function formatBytes(bytes: number): string {
	if (bytes >= GB) return `${(bytes / GB).toFixed(1)} GB`;
	if (bytes >= MB) return `${(bytes / MB).toFixed(0)} MB`;
	if (bytes >= KB) return `${(bytes / KB).toFixed(0)} KB`;
	return `${bytes} B`;
}

// formatFileSize renders a stored file's size for review screens: MB with one
// decimal, and a dash when the size is unknown or zero.
export function formatFileSize(bytes?: number): string {
	if (!bytes) return "—";
	if (bytes < KB) return `${bytes} B`;
	if (bytes < MB) return `${(bytes / KB).toFixed(0)} KB`;
	return `${(bytes / MB).toFixed(1)} MB`;
}
