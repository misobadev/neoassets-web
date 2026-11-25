// Estimates of how long scraping takes, shown in the rewards guide and the API
// docs. They describe a real client, not just the API: besides one lookup per
// game, the client hashes ROMs and downloads the images, so its threads, the
// device and the connection set the pace well below the API's per-minute
// limit (internal/services/scrape_service.go in neoassets-service).

// EXAMPLE_GAMES is the library size used in every time estimate.
export const EXAMPLE_GAMES = 1000;

// DEFAULT_RPM_PER_THREAD and DEFAULT_GUEST_RPM_PER_THREAD mirror the backend
// defaults, used until the public config loads.
export const DEFAULT_RPM_PER_THREAD = 60;
export const DEFAULT_GUEST_RPM_PER_THREAD = 30;

// TYPICAL_GAMES_PER_MIN_PER_THREAD is how many games one client thread
// resolves per minute, downloading the images: measured with NeoStation on a
// handheld with an external disk (20 threads, about 450 games a minute).
// Faster devices and connections do better, up to the API limit.
export const TYPICAL_GAMES_PER_MIN_PER_THREAD = 22;

// ratePerMinute is an account's requests per minute: its threads times the
// per-thread rate (lower for guests). It is the API limit.
export function ratePerMinute(
	threads: number,
	guest: boolean,
	cfg?: { rpm_per_thread?: number; guest_rpm_per_thread?: number } | null,
): number {
	const perThread = guest
		? (cfg?.guest_rpm_per_thread ?? DEFAULT_GUEST_RPM_PER_THREAD)
		: (cfg?.rpm_per_thread ?? DEFAULT_RPM_PER_THREAD);
	return threads * perThread;
}

// typicalGamesPerMinute is how many games an account with `threads` resolves
// per minute in practice: what its threads manage, never more than its API
// limit (`rpm`, one lookup per game).
export function typicalGamesPerMinute(threads: number, rpm: number): number {
	return Math.min(threads * TYPICAL_GAMES_PER_MIN_PER_THREAD, rpm);
}

// formatDuration renders seconds as "~9 min 55 s", "~1 h 05 min" or "~33 s".
export function formatDuration(seconds: number): string {
	const total = Math.round(seconds);
	const h = Math.floor(total / 3600);
	const m = Math.floor((total % 3600) / 60);
	const s = total % 60;
	if (h > 0) return `~${h} h ${String(m).padStart(2, "0")} min`;
	if (m > 0) return `~${m} min ${String(s).padStart(2, "0")} s`;
	return `~${s} s`;
}

// typicalTime is the approximate time an account needs for EXAMPLE_GAMES
// games. There is no daily limit, so every account finishes.
export function typicalTime(threads: number, rpm: number): string {
	const perMinute = typicalGamesPerMinute(threads, rpm);
	return perMinute > 0 ? formatDuration((EXAMPLE_GAMES / perMinute) * 60) : "-";
}
