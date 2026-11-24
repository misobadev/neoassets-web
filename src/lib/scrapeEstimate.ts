// Estimates of how long a scraping client takes, shown in the API docs and
// the rewards guide. They mirror the backend rate limiter
// (internal/services/scrape_service.go in neoassets-service).

// EXAMPLE_GAMES is the library size used in every time estimate: a guest's
// whole daily quota, so every account (guests included) gets a time.
export const EXAMPLE_GAMES = 1000;

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

// exampleTime is the formatted time an account with `threads` needs for
// EXAMPLE_GAMES lookups, or null when its daily quota is smaller than that
// (it can't finish in one day).
export function exampleTime(threads: number, rpmPerThread: number, dailyPerThread: number): string | null {
	if (threads * dailyPerThread < EXAMPLE_GAMES) return null;
	return formatDuration(scrapeSeconds(EXAMPLE_GAMES, threads * rpmPerThread, threads));
}
