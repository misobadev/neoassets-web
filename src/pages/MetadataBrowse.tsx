import { useEffect, useMemo, useRef, useState } from "react";
import { Link, useNavigate, useParams } from "react-router-dom";
import { ChevronDown, Clapperboard, Download, FileText, Globe, Image, ImagePlus, Images, Languages, Search, Server, Tag } from "lucide-react";
import { useTranslation } from "react-i18next";
import type { TFunction } from "i18next";
import { cdnUrl, fetchMetadataGamesBySystem, fetchMetadataSystems, searchMetadataGames, type GameSummary, type MetadataSystem } from "../lib/api";
import { RatingBadge } from "../components/Rating";
import Pagination from "../components/Pagination";
import { usePageTitle } from "../lib/seo";

// LIMIT is a multiple of 3 so the 3-column grid always fills its last row.
const LIMIT = 15;

type TypeFilter = "" | "base" | "hack" | "homebrew";

const TYPE_TABS: { key: TypeFilter; labelKey: string }[] = [
	{ key: "", labelKey: "common.all" },
	{ key: "base", labelKey: "metadata.type.base" },
	{ key: "hack", labelKey: "metadata.type.hack" },
	{ key: "homebrew", labelKey: "metadata.type.homebrew" },
];

function completenessStroke(pct: number): string {
	if (pct >= 80) return "var(--color-success)";
	if (pct >= 50) return "var(--color-warning)";
	return "var(--color-error)";
}

// CircularProgress renders a small ring with the metadata completion percentage
// in the middle, colored by how complete it is.
function CircularProgress({ pct, size = 40, stroke = 4 }: { pct: number; size?: number; stroke?: number }) {
	const { t } = useTranslation();
	const clamped = Math.max(0, Math.min(100, pct));
	const r = (size - stroke) / 2;
	const c = 2 * Math.PI * r;
	const offset = c - (clamped / 100) * c;
	return (
		<svg width={size} height={size} viewBox={`0 0 ${size} ${size}`} className="shrink-0" role="img" aria-label={t("metadata.completePct", { pct: Math.round(clamped) })}>
			<circle cx={size / 2} cy={size / 2} r={r} fill="none" stroke="var(--color-base-300)" strokeWidth={stroke} />
			<circle
				cx={size / 2}
				cy={size / 2}
				r={r}
				fill="none"
				stroke={completenessStroke(clamped)}
				strokeWidth={stroke}
				strokeLinecap="round"
				strokeDasharray={c}
				strokeDashoffset={offset}
				transform={`rotate(-90 ${size / 2} ${size / 2})`}
			/>
			<text x="50%" y="50%" dominantBaseline="central" textAnchor="middle" fontSize={size * 0.3} fontWeight={700} fill="currentColor">
				{Math.round(clamped)}
			</text>
		</svg>
	);
}

// SystemOption is one row in the system selector: name, counts and completion.
function SystemOption({ system, active, onSelect }: { system: MetadataSystem; active: boolean; onSelect: () => void }) {
	const { t } = useTranslation();
	return (
		<button
			type="button"
			onClick={onSelect}
			className={`w-full text-left rounded-lg p-3 transition-colors ${active ? "bg-primary/10" : "hover:bg-base-300"}`}
		>
			<div className="flex items-center gap-3">
				<div className="min-w-0 flex-1">
					<p className="font-medium text-sm truncate">{system.name}</p>
					<p className="text-xs text-[var(--color-base-content)]/50 flex items-center gap-1.5 flex-wrap">
						<span className="inline-flex items-center gap-1"><Tag className="w-3 h-3" />{system.total_games ?? 0}</span>
						<span className="text-[var(--color-base-content)]/40">·</span>
						<span>{t("metadata.abbr.base")} {system.base ?? 0}</span>
						<span className="text-[var(--color-base-content)]/40">·</span>
						<span>{t("metadata.abbr.hack")} {system.hack ?? 0}</span>
						<span className="text-[var(--color-base-content)]/40">·</span>
						<span>{t("metadata.abbr.homebrew")} {system.homebrew ?? 0}</span>
					</p>
				</div>
				<CircularProgress pct={system.metadata_pct ?? 0} size={36} stroke={3} />
			</div>
		</button>
	);
}

// kindLabel localizes a catalog kind/family name (console, computer, arcade...).
function kindLabel(kind: string, t: TFunction): string {
	return t(`metadata.kind.${kind}`, kind.charAt(0).toUpperCase() + kind.slice(1));
}

// MetaIcon renders a small status icon with a Tailwind tooltip. tone controls
// the color: ok = present (success), partial = some data, none = absent/empty.
// When dark is true the icon is drawn for the light (holographic) cards.
function MetaIcon({ label, tone, dark = false, children }: { label: string; tone: "ok" | "partial" | "none"; dark?: boolean; children: React.ReactNode }) {
	const color = dark
		? tone === "ok"
			? "text-emerald-800"
			: tone === "partial"
				? "text-amber-800"
				: "text-black/40"
		: tone === "ok"
			? "text-[var(--color-success)]"
			: tone === "partial"
				? "text-[var(--color-warning)]"
				: "text-[var(--color-base-content)]/30";
	return (
		<span className="group relative inline-flex items-center cursor-help">
			<span className={`inline-flex items-center ${color}`} aria-label={label}>
				{children}
			</span>
			<span className="pointer-events-none absolute bottom-full left-1/2 -translate-x-1/2 mb-1.5 z-10 whitespace-nowrap rounded-md bg-[var(--color-base-200)] px-2 py-1 text-[11px] text-[var(--color-base-content)] opacity-0 shadow-lg transition-opacity duration-150 group-hover:opacity-100">
				{label}
			</span>
		</span>
	);
}

// textMetaTone derives the text-metadata status: ok = complete, partial = some
// fields filled, none = empty. Matches the backend's text_complete definition
// (description, genre, developer, publisher, release_year, rating).
function textMetaTone(g: GameSummary): "ok" | "partial" | "none" {
	if (g.text_complete) return "ok";
	const filled = textMetaFilled(g);
	return filled > 0 ? "partial" : "none";
}

// textMetaFields mirrors the backend text_complete columns.
function textMetaFields(g: GameSummary) {
	return [
		g.description,
		g.genre,
		g.developer,
		g.publisher,
		g.release_year,
		g.rating ? String(g.rating) : "",
	];
}

function textMetaFilled(g: GameSummary): number {
	return textMetaFields(g).filter((v) => v !== "" && v != null).length;
}

function textMetaTitle(t: TFunction, g: GameSummary): string {
	if (g.text_complete) return t("metadata.textMeta.all");
	const filled = textMetaFilled(g);
	return filled > 0 ? t("metadata.textMeta.partial", { filled }) : t("metadata.textMeta.none");
}

// isComplete reports whether a game has all the curated metadata: full text,
// translations, cover, and logo/screenshot/fanart/video. The media kinds match
// the backend's system completion calculation (which counts cover).
function isComplete(g: GameSummary): boolean {
	return Boolean(
		g.text_complete &&
			g.has_translations &&
			g.cover &&
			g.has_logo &&
			g.has_screenshot &&
			g.has_fanart &&
			g.has_video,
	);
}

// GameCard renders one game card. Completed games get the 3D tilt + magnification
// on the card, and a holographic "Completed" badge next to the video icon whose
// sheen follows the pointer.
function GameCard({ g }: { g: GameSummary }) {
	const { t } = useTranslation();
	const ref = useRef<HTMLAnchorElement>(null);
	const [mx, setMx] = useState(0);
	const [my, setMy] = useState(0);

	// Detect when the game name is truncated so the full-name tooltip only
	// shows for names that are actually cut off.
	const nameRef = useRef<HTMLHeadingElement>(null);
	const [nameClipped, setNameClipped] = useState(false);
	useEffect(() => {
		const el = nameRef.current;
		if (!el) return;
		const check = () => setNameClipped(el.scrollWidth > el.clientWidth + 1);
		check();
		const ro = new ResizeObserver(check);
		ro.observe(el);
		return () => ro.disconnect();
	}, [g.name]);

	const onMove = (e: React.MouseEvent) => {
		const el = ref.current;
		if (!el) return;
		const r = el.getBoundingClientRect();
		setMx((e.clientX - r.left) / r.width - 0.5);
		setMy((e.clientY - r.top) / r.height - 0.5);
	};
	const onLeave = () => {
		setMx(0);
		setMy(0);
	};

	const complete = isComplete(g);
	const style = { "--mx": mx, "--my": my } as React.CSSProperties;

	return (
		<Link
			ref={ref}
			to={`/app/metadata/${g.system_id}/game/${g.id}`}
			onPointerMove={onMove}
			onPointerLeave={onLeave}
			style={style}
			className={`relative card card-hover holo-card p-3 flex flex-col gap-3`}
		>
			<div className="flex items-center gap-3 relative z-[1]">
				{g.cover ? (
					<img src={cdnUrl(g.cover) + (g.cover_updated ? `?v=${encodeURIComponent(g.cover_updated)}` : "")} alt="" className="w-16 h-16 object-cover rounded-lg border border-[var(--color-base-300)] shrink-0" onError={(e) => (e.currentTarget.style.display = "none")} />
				) : (
					<div className="w-16 h-16 rounded-lg bg-[var(--color-base-300)] shrink-0" />
				)}
				<div className="min-w-0 flex-1">
					<span className="group/name relative block">
						<h3 ref={nameRef} className="font-semibold truncate">{g.name}</h3>
						{nameClipped ? (
							<span className="pointer-events-none absolute left-0 top-full z-20 mt-1 w-max max-w-[18rem] break-words rounded-md bg-[var(--color-base-200)] px-2 py-1 text-[11px] font-normal leading-snug text-[var(--color-base-content)] opacity-0 shadow-lg transition-opacity duration-150 group-hover/name:opacity-100">
								{g.name}
							</span>
						) : null}
					</span>
					<p className="text-xs text-[var(--color-base-content)]/50 mt-0.5 truncate">
						{g.system_id ? `${g.system_id.toUpperCase()} · ` : ""}
						{g.region || t("metadata.na")} {g.release_year ? `· ${g.release_year}` : ""}
					</p>
					<div className="flex items-center gap-2.5 mt-2 flex-wrap">
						<MetaIcon label={textMetaTitle(t, g)} tone={textMetaTone(g)}><FileText className="w-3.5 h-3.5" /></MetaIcon>
						<MetaIcon label={g.has_translations ? t("metadata.hasTranslations") : t("metadata.englishOnly")} tone={g.has_translations ? "ok" : "none"}><Languages className="w-3.5 h-3.5" /></MetaIcon>
						<MetaIcon label={g.has_logo ? t("metadata.hasLogo") : t("metadata.noLogo")} tone={g.has_logo ? "ok" : "none"}><ImagePlus className="w-3.5 h-3.5" /></MetaIcon>
						<MetaIcon label={g.has_screenshot ? t("metadata.hasScreenshot") : t("metadata.noScreenshot")} tone={g.has_screenshot ? "ok" : "none"}><Image className="w-3.5 h-3.5" /></MetaIcon>
						<MetaIcon label={g.has_fanart ? t("metadata.hasFanart") : t("metadata.noFanart")} tone={g.has_fanart ? "ok" : "none"}><Images className="w-3.5 h-3.5" /></MetaIcon>
						<MetaIcon label={g.has_video ? t("metadata.hasVideo") : t("metadata.noVideo")} tone={g.has_video ? "ok" : "none"}><Clapperboard className="w-3.5 h-3.5" /></MetaIcon>
					</div>
				</div>
			</div>
			<div className="flex items-center justify-between gap-2 border-t border-[var(--color-base-300)] pt-2 relative z-[1]">
				<div className="flex items-center gap-2 min-w-0">
					<span className={`badge badge-sm ${g.type === "hack" ? "badge-warning" : g.type === "homebrew" ? "badge-info" : "badge-ghost"}`}>
						{g.type || "base"}
					</span>
					{complete ? (
						<span className="holo-badge inline-flex items-center rounded-full border border-black/15 px-2.5 py-0.5 text-[11px] font-bold shadow-sm">
							{t("metadata.completed")}
						</span>
					) : null}
				</div>
				<div className="flex items-center gap-2 shrink-0">
					<RatingBadge rating={g.rating} />
					<span
						className="inline-flex items-center gap-1 text-[11px] font-medium text-[var(--color-base-content)]/50"
						title={t("metadata.scrapedTimes", { n: (g.scrapes ?? 0).toLocaleString() })}
					>
						<Download className="w-3.5 h-3.5" />
						{(g.scrapes ?? 0).toLocaleString()}
					</span>
				</div>
			</div>
		</Link>
	);
}

// Pagination renders the prev/next controls. It is shown both above and below
// the games grid so the user does not have to scroll back to the top.
export default function MetadataBrowse() {
	const { t } = useTranslation();
	usePageTitle(t("metadata.title"));
	const navigate = useNavigate();
	const { systemId } = useParams<{ systemId: string }>();
	const [systems, setSystems] = useState<MetadataSystem[] | null>(null);
	const [menuOpen, setMenuOpen] = useState(false);
	const menuRef = useRef<HTMLDivElement>(null);

	const [games, setGames] = useState<GameSummary[] | null>(null);
	const [total, setTotal] = useState(0);
	const [query, setQuery] = useState("");
	const [typeFilter, setTypeFilter] = useState<TypeFilter>("");
	const [sort, setSort] = useState("scrapes");
	const [page, setPage] = useState(1);
	const [loading, setLoading] = useState(false);
	const [error, setError] = useState<string | null>(null);

	const selected = (systems || []).find((s) => s.id === systemId) || null;

	// The selector is grouped by family (arcade, console, computer, ...), and
	// within a family by group (e.g. the arcade family splits into mame-fbneo,
	// flycast, supermodel, dolphin). Systems without a group fall in the family
	// grid directly.
	const familyGroups = useMemo(() => {
		const FAMILY_ORDER = ["arcade", "console", "computer", "handheld", "virtual"];
		const fams = new Map<string, MetadataSystem[]>();
		for (const s of systems || []) {
			const f = (s.family || "other").trim() || "other";
			if (!fams.has(f)) fams.set(f, []);
			fams.get(f)!.push(s);
		}
		return [...fams.entries()]
			.sort((a, b) => {
				const ia = FAMILY_ORDER.indexOf(a[0]);
				const ib = FAMILY_ORDER.indexOf(b[0]);
				return (ia < 0 ? 99 : ia) - (ib < 0 ? 99 : ib);
			})
			.map(([family, list]) => {
				const groups = new Map<string, MetadataSystem[]>();
				for (const s of list) {
					const g = (s.group || "").trim();
					if (!g) continue;
					if (!groups.has(g)) groups.set(g, []);
					groups.get(g)!.push(s);
				}
				const ungrouped = list.filter((s) => !(s.group || "").trim());
				return {
					family,
					systems: list,
					groups: [...groups.entries()].map(([group, sys]) => ({ group, systems: sys })),
					ungrouped,
				};
			});
	}, [systems]);

	useEffect(() => {
		fetchMetadataSystems()
			// Virtual systems own no games (they aggregate a family/group), so
			// they are not browsable.
			.then((list) => setSystems(list.filter((s) => !s.virtual)))
			.catch((e: Error) => setError(e.message));
	}, []);

	// Reset filters when the selected system changes.
	useEffect(() => {
		setPage(1);
		setQuery("");
		setTypeFilter("");
		setSort("scrapes");
	}, [systemId]);

	// Close the flyout when clicking outside.
	useEffect(() => {
		function onDoc(e: MouseEvent) {
			if (menuRef.current && !menuRef.current.contains(e.target as Node)) setMenuOpen(false);
		}
		document.addEventListener("mousedown", onDoc);
		return () => document.removeEventListener("mousedown", onDoc);
	}, []);

	useEffect(() => {
		setLoading(true);
		setError(null);
		const offset = (page - 1) * LIMIT;
		const req = systemId
			? query.trim()
				? searchMetadataGames(query.trim(), systemId, LIMIT, offset, typeFilter, sort)
				: fetchMetadataGamesBySystem(systemId, LIMIT, offset, typeFilter, sort)
			: searchMetadataGames(query.trim(), "", LIMIT, offset, typeFilter, sort);
		req.then((data) => {
			setGames(data.games);
			setTotal(data.total);
		})
			.catch((e: Error) => setError(e.message))
			.finally(() => setLoading(false));
	}, [systemId, query, page, typeFilter, sort]);

	const totalPages = Math.max(1, Math.ceil(total / LIMIT));

	function goSystem(id: string) {
		setMenuOpen(false);
		navigate(id ? `/app/metadata/${id}` : "/app/metadata");
	}

	function goPage(p: number) {
		setPage(p);
		window.scrollTo({ top: 0, behavior: "smooth" });
	}

	return (
		<div className="space-y-6">
			<div>
				<h1 className="text-2xl md:text-3xl font-bold tracking-tight">{t("metadata.title")}</h1>
				<p className="text-[var(--color-base-content)]/60 text-sm pt-2">
					{t("metadata.browse.subtitle")}
				</p>
			</div>

			{/* System selector (flyout with stats) */}
			<div className="relative" ref={menuRef}>
				<button
					type="button"
					onClick={() => setMenuOpen((v) => !v)}
					className="card card-border hover:card-hover p-4 w-full flex items-center gap-3 text-left"
				>
					<span className="grid size-11 place-items-center rounded-xl bg-[var(--color-base-300)] text-[var(--color-primary)] shrink-0">
						{selected ? <Server className="w-5 h-5" /> : <Globe className="w-5 h-5" />}
					</span>
					<div className="min-w-0 flex-1">
						<p className="font-semibold truncate">{selected ? selected.name : t("metadata.allSystems")}</p>
						{selected ? (
							<p className="text-xs text-[var(--color-base-content)]/50">
								{t("metadata.systemStats", { games: selected.total_games ?? 0, base: selected.base ?? 0, hack: selected.hack ?? 0, homebrew: selected.homebrew ?? 0 })}
							</p>
						) : (
							<p className="text-xs text-[var(--color-base-content)]/50">{systems ? t("metadata.systemsCount", { count: systems.length }) : t("metadata.loadingSystems")}</p>
						)}
					</div>
					{selected ? (
						<div className="shrink-0" title={t("metadata.completion")}>
							<CircularProgress pct={selected.metadata_pct ?? 0} size={44} />
						</div>
					) : null}
					<ChevronDown className={`w-4 h-4 shrink-0 text-[var(--color-base-content)]/50 transition-transform ${menuOpen ? "rotate-180" : ""}`} />
				</button>

				{menuOpen ? (
					<div className="absolute z-30 left-0 right-0 mt-2 card shadow-xl max-h-[60vh] overflow-y-auto p-2">
						<button
							type="button"
							onClick={() => goSystem("")}
							className={`w-full text-left rounded-lg p-3 transition-colors ${!systemId ? "bg-primary/10" : "hover:bg-base-300"}`}
						>
							<div className="flex items-center gap-3">
								<div className="min-w-0 flex-1">
									<p className="font-medium text-sm">{t("metadata.allSystems")}</p>
									<p className="text-xs text-[var(--color-base-content)]/50">{systems ? t("metadata.systemsCount", { count: systems.length }) : "..."}</p>
								</div>
							</div>
						</button>
						{familyGroups.map((g) => (
							<div key={g.family} className="mt-2 rounded-xl border border-[var(--color-base-300)] bg-[var(--color-base-200)]/50 p-2">
								<div className="flex items-center justify-between px-1 pb-1">
									<p className="text-[11px] font-semibold uppercase tracking-wide text-[var(--color-primary)]">
										{kindLabel(g.family, t)}
									</p>
									<p className="text-[11px] text-[var(--color-base-content)]/40">
										{t("metadata.systemsCount", { count: g.systems.length })}
									</p>
								</div>
								{g.groups.map((sub) => (
									<div key={sub.group} className="mb-2 rounded-lg border border-[var(--color-base-300)]/70 p-2 last:mb-0">
										<p className="px-1 pb-1 text-[10px] font-semibold uppercase tracking-wide text-[var(--color-base-content)]/45">
											{kindLabel(sub.group, t)}
										</p>
										<div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-1">
											{sub.systems.map((s) => (
												<SystemOption key={s.id} system={s} active={s.id === systemId} onSelect={() => goSystem(s.id)} />
											))}
										</div>
									</div>
								))}
								{g.ungrouped.length ? (
									<div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-1">
										{g.ungrouped.map((s) => (
											<SystemOption key={s.id} system={s} active={s.id === systemId} onSelect={() => goSystem(s.id)} />
										))}
									</div>
								) : null}
							</div>
						))}
					</div>
				) : null}
			</div>

			{/* Filters */}
			<div className="flex flex-col sm:flex-row gap-2 items-center">
				<div className="relative flex-1 min-w-0">
					<Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-[var(--color-base-content)]/40" />
					<input
						className="input pl-9 w-full"
						placeholder={selected ? t("metadata.searchSystemGames", { name: selected.name }) : t("metadata.searchAllGames")}
						value={query}
						onChange={(e) => { setQuery(e.target.value); setPage(1); }}
					/>
				</div>
				<select
					className="select select-sm shrink-0 w-44"
					value={sort}
					onChange={(e) => { setSort(e.target.value); setPage(1); }}
				>
					<option value="scrapes">{t("metadata.sort.scrapesDesc")}</option>
					<option value="">{t("metadata.sort.nameAsc")}</option>
					<option value="name_desc">{t("metadata.sort.nameDesc")}</option>
					<option value="rating_desc">{t("metadata.sort.ratingDesc")}</option>
					<option value="rating_asc">{t("metadata.sort.ratingAsc")}</option>
					<option value="year_desc">{t("metadata.sort.yearDesc")}</option>
					<option value="year_asc">{t("metadata.sort.yearAsc")}</option>
				</select>
				<div className="flex items-center gap-1 bg-[var(--color-base-300)] rounded-lg p-1 shrink-0">
					{TYPE_TABS.map((tab) => (
						<button
							key={tab.key}
							type="button"
							onClick={() => { setTypeFilter(tab.key); setPage(1); }}
							className={`px-3 py-1.5 text-xs font-medium rounded-md transition-colors ${typeFilter === tab.key ? "bg-[var(--color-primary)] text-[var(--color-primary-content)]" : "text-[var(--color-base-content)]/60 hover:text-[var(--color-base-content)]"}`}
						>
							{t(tab.labelKey)}
						</button>
					))}
				</div>
				<p className="text-sm text-[var(--color-base-content)]/50 sm:shrink-0">{t("metadata.gamesCount", { count: total })}</p>
			</div>

			{/* Pagination (top) */}
			<Pagination page={page} totalPages={totalPages} disabled={loading} onChange={goPage} />

			{error ? (
				<p className="text-sm text-[var(--color-error)] py-6 text-center">{error}</p>
			) : loading ? (
				<p className="text-sm text-[var(--color-base-content)]/50 py-6 text-center">{t("metadata.loadingGames")}</p>
			) : games && games.length === 0 ? (
				<p className="text-sm text-[var(--color-base-content)]/50 py-6 text-center">{t("metadata.noGamesMatch")}</p>
			) : games ? (
				<>
					<div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
						{games.map((g) => (
							<GameCard key={g.id} g={g} />
						))}
					</div>
					{/* Pagination (bottom) */}
					<Pagination page={page} totalPages={totalPages} disabled={loading} onChange={goPage} />
				</>
			) : null}
		</div>
	);
}
