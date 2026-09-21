import type { TFunction } from "i18next";

// GENRE_SLUGS maps the canonical (English) genre name stored in the database to
// its i18n slug under `metadata.genres.*`, so the UI can show it translated.
const GENRE_SLUGS: Record<string, string> = {
	"Action": "action",
	"Adventure": "adventure",
	"Beat 'em Up": "beat-em-up",
	"Fighting": "fighting",
	"Platformer": "platformer",
	"Puzzle": "puzzle",
	"Racing": "racing",
	"Role-Playing (RPG)": "rpg",
	"Shooter": "shooter",
	"Shoot 'em Up": "shoot-em-up",
	"Simulation": "simulation",
	"Sports": "sports",
	"Strategy": "strategy",
	"Music & Rhythm": "music",
	"Board & Card": "board-card",
	"Pinball": "pinball",
	"Educational": "educational",
	"Quiz": "quiz",
	"Compilation": "compilation",
	"Miscellaneous": "miscellaneous",
};

// genreLabel resolves a stored genre name to its translated label, falling back
// to the raw value for anything not in the catalog.
export function genreLabel(t: TFunction, name: string): string {
	if (!name) return "";
	const slug = GENRE_SLUGS[name];
	return slug ? t("metadata.genres." + slug, { defaultValue: name }) : name;
}
