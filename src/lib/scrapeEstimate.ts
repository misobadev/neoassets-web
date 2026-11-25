// Estimates of how long a scraping client takes, shown in the API docs and
// the rewards guide. They mirror the backend rate limiter
// (internal/services/scrape_service.go in neoassets-service).

// EXAMPLE_GAMES is the library size used in every time estimate.
export const EXAMPLE_GAMES = 1000;

// DEFAULT_RPM_PER_THREAD and DEFAULT_GUEST_RPM_PER_THREAD mirror the backend
// defaults, used until the public config loads.
export const DEFAULT_RPM_PER_THREAD = 60;
export const DEFAULT_GUEST_RPM_PER_THREAD = 30;

// ratePerMinute is an account's requests per minute: its threads times the
// per-thread rate (lower for guests).
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

// rateBurst mirrors the backend: about five seconds of the rate, never fewer
// than the threads.
export function rateBurst(rpm: number, threads: number): number {
	return Math.max(Math.floor(rpm / 12), threads, 1);
}

// scrapeSeconds is how long a well-paced client (as many workers as threads,
// honoring Retry-After) needs for `games` lookups: the burst goes out at once,
// the rest at the per-minute rate. Lookups themselves take ~20 ms, so the
// rate, not the server, sets the time.
export function scrapeSeconds(games: number, rpm: number, threads: number): number {
	if (rpm <= 0) return 0;
	return Math.max(0, (games - rateBurst(rpm, threads)) / (rpm / 60));
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

// exampleTime is the formatted time an account with `threads` and `rpm`
// requests per minute needs for EXAMPLE_GAMES lookups. There is no daily
// limit, so every account finishes.
export function exampleTime(threads: number, rpm: number): string {
	return formatDuration(scrapeSeconds(EXAMPLE_GAMES, rpm, threads));
}
