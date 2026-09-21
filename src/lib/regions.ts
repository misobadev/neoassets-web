import type { TFunction } from "i18next";

// REGION_SLUGS maps the canonical region name stored in the database to its
// i18n slug under `metadata.regions.*`, so the UI can show it translated.
const REGION_SLUGS: Record<string, string> = {
	"World": "world",
	"USA": "usa",
	"Europe": "europe",
	"Japan": "japan",
	"Spain": "spain",
	"France": "france",
	"Germany": "germany",
	"Italy": "italy",
	"Korea": "korea",
	"China": "china",
};

// regionLabel resolves a stored region name to its translated label, falling
// back to the raw value for anything not in the catalog.
export function regionLabel(t: TFunction, name: string): string {
	if (!name) return "";
	const slug = REGION_SLUGS[name];
	return slug ? t("metadata.regions." + slug, { defaultValue: name }) : name;
}
