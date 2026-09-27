// Game type catalog, shared by the browse filters, the new-game form and the
// submit form. The values match the backend `games.type` column.
export const GAME_TYPES = ["base", "homebrew", "hack", "bootleg", "aftermarket"] as const;
export type GameType = (typeof GAME_TYPES)[number];

// typeBadgeClass returns the badge color for a game type.
export function typeBadgeClass(type?: string): string {
	switch (type) {
		case "hack":
			return "badge-solid-warning";
		case "homebrew":
			return "badge-solid-info";
		case "bootleg":
			return "badge-error";
		case "aftermarket":
			return "badge-solid-secondary";
		default:
			return "badge-solid-neutral";
	}
}
