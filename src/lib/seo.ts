import { useEffect } from "react";
import { useLocation } from "react-router-dom";

// SITE_URL is the public origin used for canonical and Open Graph URLs.
export const SITE_URL = (import.meta.env.VITE_SITE_URL || "https://neoassets.dev").replace(/\/$/, "");

export const DEFAULT_TITLE = "NeoAssets - System Art Packs & Game Metadata";
export const DEFAULT_DESCRIPTION =
	"NeoAssets is a community-driven catalog of system art packs and game metadata for emulation frontends. Create, share and review art packs; browse and contribute game metadata and media.";
export const DEFAULT_IMAGE = `${SITE_URL}/og-image.png?v=2`;

export interface PageMeta {
	title: string;
	description?: string;
	// image is an absolute URL for social previews (defaults to the site card).
	image?: string;
	// jsonLd is structured data for this page (schema.org), if any.
	jsonLd?: Record<string, unknown>;
}

function setMeta(attr: "name" | "property", key: string, content: string) {
	let el = document.head.querySelector<HTMLMetaElement>(`meta[${attr}="${key}"]`);
	if (!el) {
		el = document.createElement("meta");
		el.setAttribute(attr, key);
		document.head.appendChild(el);
	}
	el.setAttribute("content", content);
}

function setCanonical(href: string | null) {
	let el = document.head.querySelector<HTMLLinkElement>('link[rel="canonical"]');
	if (!href) {
		el?.remove();
		return;
	}
	if (!el) {
		el = document.createElement("link");
		el.rel = "canonical";
		document.head.appendChild(el);
	}
	el.href = href;
}

const JSON_LD_ID = "page-jsonld";

function setJsonLd(data: Record<string, unknown> | undefined) {
	let el = document.getElementById(JSON_LD_ID);
	if (!data) {
		el?.remove();
		return;
	}
	if (!el) {
		el = document.createElement("script");
		el.id = JSON_LD_ID;
		el.setAttribute("type", "application/ld+json");
		document.head.appendChild(el);
	}
	el.textContent = JSON.stringify(data);
}

// truncate shortens text for a meta description at a word boundary.
export function truncate(text: string, max = 160): string {
	const clean = text.replace(/\s+/g, " ").trim();
	if (clean.length <= max) return clean;
	const cut = clean.slice(0, max - 1);
	const space = cut.lastIndexOf(" ");
	return `${(space > max * 0.6 ? cut.slice(0, space) : cut).trimEnd()}…`;
}

function apply(meta: PageMeta | null, canonical: string | null) {
	const title = meta?.title || DEFAULT_TITLE;
	const description = meta?.description ? truncate(meta.description) : DEFAULT_DESCRIPTION;
	const image = meta?.image || DEFAULT_IMAGE;
	document.title = title;
	setMeta("name", "description", description);
	setMeta("property", "og:title", title);
	setMeta("property", "og:description", description);
	setMeta("property", "og:image", image);
	setMeta("name", "twitter:title", title);
	setMeta("name", "twitter:description", description);
	setMeta("name", "twitter:image", image);
	setCanonical(canonical);
	if (canonical) setMeta("property", "og:url", canonical);
	setJsonLd(meta?.jsonLd);
}

// usePageMeta sets the title, description, canonical URL (the current path
// without query or hash), social preview tags and structured data for a page,
// and restores the site defaults when the page unmounts. Google renders the
// SPA, so these are what it indexes.
export function usePageMeta(meta: PageMeta) {
	const { pathname } = useLocation();
	const key = JSON.stringify(meta);
	useEffect(() => {
		apply(JSON.parse(key) as PageMeta, SITE_URL + pathname);
		return () => apply(null, null);
	}, [key, pathname]);
}

// usePageTitle is usePageMeta with only a title.
export function usePageTitle(title: string) {
	usePageMeta({ title });
}

// useNoIndex keeps the current page out of search results (sign-in, account,
// editors, admin). The wrappers that gate those routes call it.
export function useNoIndex() {
	useEffect(() => {
		setMeta("name", "robots", "noindex, follow");
		return () => setMeta("name", "robots", "index, follow");
	}, []);
}
