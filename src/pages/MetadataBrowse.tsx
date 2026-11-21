import { useEffect, useMemo, useRef, useState } from "react";
import PageTitle from "../components/ui/PageTitle";
import { Link, useNavigate, useParams } from "react-router-dom";
import {
	ChevronDown,
	Clapperboard,
	Download,
	FileText,
	Globe,
	Image,
	ImagePlus,
	Images,
	Languages,
	Layers,
	Plus,
	Search,
	Server,
	Gamepad2,
} from "lucide-react";
import { useTranslation } from "react-i18next";
import type { TFunction } from "i18next";
import {
	fetchMetadataGamesBySystem,
	fetchMetadataSystems,
	searchMetadataGames,
	type GameSummary,
	type MetadataSystem,
	mediaUrl,
} from "../lib/api";
import { RatingBadge } from "../components/Rating";
import Pagination from "../components/Pagination";
import { GAME_TYPES, typeBadgeClass, type GameType } from "../lib/gameTypes";
import { usePageMeta } from "../lib/seo";

// LIMIT is a multiple of 3 so the 3-column grid always fills its last row.
const LIMIT = 15;

type TypeFilter = "" | GameType;

const TYPE_TABS: { key: TypeFilter; labelKey: string }[] = [
	{ key: "", labelKey: "common.all" },
	...GAME_TYPES.map((g) => ({ key: g as TypeFilter, labelKey: "metadata.type." + g })),
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
		<svg
			width={size}
			height={size}
			viewBox={`0 0 ${size} ${size}`}
			className="shrink-0"
			role="img"
			aria-label={t("metadata.completePct", { pct: Math.round(clamped) })}
		>
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
			<text
				x="50%"
				y="50%"
				dominantBaseline="central"
				textAnchor="middle"
				fontSize={size * 0.3}
				fontWeight={700}
				fill="currentColor"
			>
				{Math.round(clamped)}
			</text>
		</svg>
	);
}

// SystemOption is one row in the system selector: name, counts and completion.
function SystemOption({ system, active, onSelect }: { system: MetadataSystem; active: boolean; onSelect: () => void }) {
	const { t } = useTranslation();
	const pct = Math.round(system.metadata_pct ?? 0);
	const color = completenessStroke(pct);
	return (
		<button
			type="button"
			onClick={onSelect}
			className={`relative w-full text-left rounded-md px-3 py-2 flex items-center gap-2.5 transition-colors ${
				active
					? "bg-[color-mix(in_oklab,var(--tone)_16%,transparent)] before:absolute before:left-0 before:top-1.5 before:bottom-1.5 before:w-0.5 before:rounded-full before:bg-[var(--tone)]"
					: "hover:bg-[var(--color-base-300)]/70"
			}`}
		>
			<span className="min-w-0 flex-1">
				<span className="flex items-center gap-1.5 text-sm font-medium truncate">
					{system.virtual ? <Layers className="w-3.5 h-3.5 shrink-0 text-[var(--tone)]" /> : null}
					<span className="truncate">{system.name}</span>
				</span>
				<span className="block text-[11px] text-[var(--color-base-content)]/50 tabular-nums">
					{t("metadata.gamesCount", { count: system.total_games ?? 0 })}
				</span>
			</span>
			<span
				className="shrink-0 rounded-md px-1.5 py-0.5 font-display text-xs font-bold tabular-nums"
				style={{ color, backgroundColor: `color-mix(in oklab, ${color} 14%, transparent)` }}
				title={t("metadata.completePct", { pct })}
			>
				{pct}%
			</span>
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
function MetaIcon({
	label,
	tone,
	dark = false,
	children,
}: {
	label: string;
	tone: "ok" | "partial" | "none";
	dark?: boolean;
	children: React.ReactNode;
}) {
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
	return [g.description, g.genre, g.developer, g.publisher, g.release_year, g.rating ? String(g.rating) : ""];
}

function textMetaFilled(g: GameSummary): number {
	return textMetaFields(g).filter((v) => v !== "" && v != null).length;
}

function textMetaTitle(t: TFunction, g: GameSummary): string {
	if (g.text_complete) return t("metadata.textMeta.all");
	const filled = textMetaFilled(g);
	return filled > 0 ? t("metadata.textMeta.partial", { filled }) : t("metadata.textMeta.none");
}

// completionPct is the share of the curated metadata a game already has (full
// text, translations, cover, logo, screenshot, fanart, video), so the card badge
// can show the exact percentage instead of a binary "completed". The media kinds
// match the backend's system completion calculation (which counts cover).
function completionPct(g: GameSummary): number {
	const checks = [
		Boolean(g.text_complete),
		Boolean(g.has_translations),
		Boolean(g.cover),
		Boolean(g.has_logo),
		Boolean(g.has_screenshot),
		Boolean(g.has_fanart),
		Boolean(g.has_video),
	];
	return Math.round((checks.filter(Boolean).length / checks.length) * 100);
}

// GameCard renders one game card. The completion badge shows the metadata
// percentage: at 100% it is the holographic badge whose sheen follows the
// pointer, below 100% it is a plain badge without the shell effect.
function GameCard({ g }: { g: GameSummary }) {
	const { t } = useTranslation();
	const ref = useRef<HTMLAnchorElement>(null);
	const [mx, setMx] = useState(0);
	const [my, setMy] = useState(0);

	// Detect when the game name is cut off (it wraps to two lines at most) so
	// the full-name tooltip only shows for names that do not fit.
	const nameRef = useRef<HTMLHeadingElement>(null);
	const [nameClipped, setNameClipped] = useState(false);
	useEffect(() => {
		const el = nameRef.current;
		if (!el) return;
		const check = () => setNameClipped(el.scrollHeight > el.clientHeight + 1);
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

	const pct = completionPct(g);
	const style = { "--mx": mx, "--my": my } as React.CSSProperties;

	return (
		<Link
			ref={ref}
			to={`/app/metadata/${g.system_id}/game/${g.id}`}
			onPointerMove={onMove}
			onPointerLeave={onLeave}
			style={style}
			className="relative card card-hover holo-card card-tone-hover tone-meta p-3 flex flex-col gap-3"
		>
			<div className="flex items-start gap-3 relative z-[1]">
				{g.cover ? (
					<img
						src={mediaUrl(g.cover, g.cover_updated)}
						alt=""
						className="w-[4.5rem] aspect-[3/4] object-cover rounded-md ring-1 ring-white/10 shadow-lg shadow-black/30 shrink-0"
						onError={(e) => (e.currentTarget.style.display = "none")}
					/>
				) : (
					<div className="w-[4.5rem] aspect-[3/4] rounded-md bg-[var(--color-base-300)] shrink-0" />
				)}
				<div className="min-w-0 flex-1">
					<span className="group/name relative block min-w-0">
						<h3
							ref={nameRef}
							className="font-display font-semibold text-lg leading-tight line-clamp-2 break-words"
						>
							{g.name}
						</h3>
						{nameClipped ? (
							<span className="pointer-events-none absolute left-0 top-full z-20 mt-1 w-max max-w-[18rem] break-words rounded-md bg-[var(--color-base-200)] px-2 py-1 text-[11px] font-normal leading-snug text-[var(--color-base-content)] opacity-0 shadow-lg transition-opacity duration-150 group-hover/name:opacity-100">
								{g.name}
							</span>
						) : null}
					</span>
					<p className="flex items-center gap-2 mt-1 text-xs text-[var(--color-base-content)]/60">
						{g.system_id ? (
							<span className="rounded px-1.5 py-0.5 font-mono text-[10px] font-medium bg-[color-mix(in_oklab,var(--tone)_16%,transparent)] text-[var(--tone)]">
								{g.system_id.toUpperCase()}
							</span>
						) : null}
						{g.release_year ? <span>{g.release_year}</span> : null}
					</p>
					<div className="flex items-center gap-2.5 mt-2.5 flex-wrap">
						<MetaIcon label={textMetaTitle(t, g)} tone={textMetaTone(g)}>
							<FileText className="w-3.5 h-3.5" />
						</MetaIcon>
						<MetaIcon
							label={g.has_translations ? t("metadata.hasTranslations") : t("metadata.englishOnly")}
							tone={g.has_translations ? "ok" : "none"}
						>
							<Languages className="w-3.5 h-3.5" />
						</MetaIcon>
						<MetaIcon
							label={g.has_logo ? t("metadata.hasLogo") : t("metadata.noLogo")}
							tone={g.has_logo ? "ok" : "none"}
						>
							<ImagePlus className="w-3.5 h-3.5" />
						</MetaIcon>
						<MetaIcon
							label={g.has_screenshot ? t("metadata.hasScreenshot") : t("metadata.noScreenshot")}
							tone={g.has_screenshot ? "ok" : "none"}
						>
							<Image className="w-3.5 h-3.5" />
						</MetaIcon>
						<MetaIcon
							label={g.has_fanart ? t("metadata.hasFanart") : t("metadata.noFanart")}
							tone={g.has_fanart ? "ok" : "none"}
						>
							<Images className="w-3.5 h-3.5" />
						</MetaIcon>
						<MetaIcon
							label={g.has_video ? t("metadata.hasVideo") : t("metadata.noVideo")}
							tone={g.has_video ? "ok" : "none"}
						>
							<Clapperboard className="w-3.5 h-3.5" />
						</MetaIcon>
					</div>
				</div>
			</div>
			<div className="flex items-center gap-3 border-t border-[var(--color-base-300)]/70 pt-2.5 relative z-[1]">
				<span className={`badge badge-sm shrink-0 ${typeBadgeClass(g.type)}`}>
					{t("metadata.type." + (g.type || "base"))}
				</span>
				<span
					className="flex items-center gap-2 flex-1 min-w-0"
					title={pct === 100 ? t("metadata.completed") : t("metadata.completion")}
				>
					<span
						className="h-1.5 flex-1 rounded-full bg-[var(--color-base-300)] overflow-hidden"
						aria-hidden="true"
					>
						<span
							className={`block h-full rounded-full ${pct === 100 ? "bg-[var(--color-success)]" : "bg-[var(--color-warning)]"}`}
							style={{ width: `${pct}%` }}
						/>
					</span>
					<span
						className={`font-display text-xs font-semibold tabular-nums ${pct === 100 ? "text-[var(--color-success)]" : "text-[var(--color-warning)]"}`}
					>
						{pct}%
					</span>
				</span>
				<span className="shrink-0 rounded-md bg-[color-mix(in_oklab,var(--color-reward)_14%,transparent)] px-1.5 py-0.5">
					<RatingBadge rating={g.rating} />
				</span>
				<span
					className="inline-flex items-center gap-1 text-[11px] font-medium text-[var(--color-base-content)]/60 shrink-0"
					title={t("metadata.scrapedTimes", { n: (g.scrapes ?? 0).toLocaleString() })}
				>
					<Download className="w-3.5 h-3.5" />
					{(g.scrapes ?? 0).toLocaleString()}
				</span>
			</div>
		</Link>
	);
}

// Pagination renders the prev/next controls. It is shown both above and below
// the games grid so the user does not have to scroll back to the top.
export default function MetadataBrowse() {
	const { t } = useTranslation();
	const navigate = useNavigate();
	const { systemId } = useParams<{ systemId: string }>();
	const [systems, setSystems] = useState<MetadataSystem[] | null>(null);
	const [menuOpen, setMenuOpen] = useState(false);
	const [sysFilter, setSysFilter] = useState("");
	const menuRef = useRef<HTMLDivElement>(null);

	const [games, setGames] = useState<GameSummary[] | null>(null);
	const [total, setTotal] = useState(0);
	const [query, setQuery] = useState("");
	// debouncedQuery is the value actually sent to the API. Keeping the raw
	// `query` for the input makes typing responsive while a single request is
	// issued only after the user pauses (see the effect below).
	const [debouncedQuery, setDebouncedQuery] = useState("");
	const [typeFilter, setTypeFilter] = useState<TypeFilter>("");
	const [sort, setSort] = useState("scrapes");
	const [page, setPage] = useState(1);
	const [loading, setLoading] = useState(false);
	const [error, setError] = useState<string | null>(null);

	const selected = (systems || []).find((s) => s.id === systemId) || null;
	usePageMeta({
		title: selected ? `${selected.name} games - NeoAssets` : `${t("metadata.title")} - NeoAssets`,
		description: selected
			? `Browse ${selected.name} game metadata on NeoAssets: covers, logos, screenshots, videos, descriptions and ROM hashes.`
			: "Browse game metadata by system: covers, logos, screenshots, videos, descriptions and ROM hashes for emulation frontends.",
	});

	// The selector is grouped by family (arcade, console, computer, ...). The
	// arcade family keeps its boards flat (no mame-fbneo/flycast labels) and the
	// virtual "Arcade" parent is listed first so it can be opened to browse every
	// arcade game at once.
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
			.map(([family, list]) => ({
				family,
				systems: [...list].sort((a, b) => {
					if (!!a.virtual !== !!b.virtual) return a.virtual ? -1 : 1;
					return (a.name || "").localeCompare(b.name || "");
				}),
			}));
	}, [systems]);

	useEffect(() => {
		fetchMetadataSystems()
			.then(setSystems)
			.catch((e: Error) => setError(e.message));
	}, []);

	// Reset filters when the selected system changes.
	useEffect(() => {
		setPage(1);
		setQuery("");
		setDebouncedQuery("");
		setTypeFilter("");
		setSort("scrapes");
	}, [systemId]);

	// Debounce the search box: the request is only issued after the user stops
	// typing for a moment, instead of on every keystroke. Resetting the page in
	// the same update keeps the debounced query and page in sync (one request).
	useEffect(() => {
		const handle = setTimeout(() => {
			setDebouncedQuery(query);
			setPage(1);
		}, 350);
		return () => clearTimeout(handle);
	}, [query]);

	// Close the flyout when clicking outside.
	useEffect(() => {
		function onDoc(e: MouseEvent) {
			if (menuRef.current && !menuRef.current.contains(e.target as Node)) setMenuOpen(false);
		}
		document.addEventListener("mousedown", onDoc);
		return () => document.removeEventListener("mousedown", onDoc);
	}, []);

	// Fetch the page of games. The AbortController cancels the in-flight request
	// when the query/filters/page change so stale responses never overwrite
	// newer ones and the backend is not hit for outdated searches.
	useEffect(() => {
		const controller = new AbortController();
		setLoading(true);
		setError(null);
		const offset = (page - 1) * LIMIT;
		const q = debouncedQuery.trim();
		const req = systemId
			? q
				? searchMetadataGames(q, systemId, LIMIT, offset, typeFilter, sort, controller.signal)
				: fetchMetadataGamesBySystem(systemId, LIMIT, offset, typeFilter, sort, controller.signal)
			: searchMetadataGames(q, "", LIMIT, offset, typeFilter, sort, controller.signal);
		req.then((data) => {
			setGames(data.games);
			setTotal(data.total);
		})
			.catch((e: Error) => {
				if (e.name === "AbortError") return;
				setError(e.message);
			})
			.finally(() => {
				if (!controller.signal.aborted) setLoading(false);
			});
		return () => controller.abort();
	}, [systemId, debouncedQuery, page, typeFilter, sort]);

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
			<div className="flex items-start justify-between gap-3">
				<div>
					<PageTitle icon={Gamepad2} tone="tone-meta">
						{t("metadata.title")}
					</PageTitle>
					<p className="text-[var(--color-base-content)]/60 text-sm pt-2">{t("metadata.browse.subtitle")}</p>
				</div>
				<Link
					to={systemId ? `/app/metadata/${systemId}/new` : "/app/metadata/new"}
					className="btn btn-primary btn-sm shrink-0"
				>
					<Plus className="w-4 h-4" />
					{t("metadata.newGame.addButton")}
				</Link>
			</div>

			{/* System selector (flyout with stats) */}
			<div className="relative" ref={menuRef}>
				<button
					type="button"
					onClick={() => setMenuOpen((v) => !v)}
					className="card card-tone tone-meta hover:card-hover p-4 w-full flex items-center gap-3 text-left"
				>
					<span className="tone-chip !size-11 shrink-0">
						{selected ? <Server className="w-5 h-5" /> : <Globe className="w-5 h-5" />}
					</span>
					<div className="min-w-0 flex-1">
						<p className="font-display font-semibold text-lg truncate">
							{selected ? selected.name : t("metadata.allSystems")}
						</p>
						{selected ? (
							<p className="text-xs text-[var(--color-base-content)]/50">
								{t("metadata.systemStats", {
									games: selected.total_games ?? 0,
									base: selected.base ?? 0,
									hack: selected.hack ?? 0,
									homebrew: selected.homebrew ?? 0,
									bootleg: selected.bootleg ?? 0,
									aftermarket: selected.aftermarket ?? 0,
								})}
							</p>
						) : (
							<p className="text-xs text-[var(--color-base-content)]/50">
								{systems
									? t("metadata.systemsCount", { count: systems.length })
									: t("metadata.loadingSystems")}
							</p>
						)}
					</div>
					{selected ? (
						<div className="shrink-0" title={t("metadata.completion")}>
							<CircularProgress pct={selected.metadata_pct ?? 0} size={44} />
						</div>
					) : null}
					<ChevronDown
						className={`w-4 h-4 shrink-0 text-[var(--color-base-content)]/50 transition-transform ${menuOpen ? "rotate-180" : ""}`}
					/>
				</button>

				{menuOpen ? (
					<div className="absolute z-30 left-0 right-0 mt-2 card tone-meta shadow-[var(--shadow-overlay)] max-h-[70vh] overflow-y-auto">
						<div className="sticky top-0 z-[1] flex items-center gap-2 p-2 bg-[var(--color-base-200)] border-b border-[var(--color-base-300)]">
							<div className="relative flex-1">
								<Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-[var(--color-base-content)]/40" />
								<input
									className="input !py-1.5 text-sm pl-9 w-full"
									placeholder={t("metadata.filterSystems")}
									value={sysFilter}
									onChange={(e) => setSysFilter(e.target.value)}
									// eslint-disable-next-line jsx-a11y/no-autofocus
									autoFocus
								/>
							</div>
							<button
								type="button"
								onClick={() => goSystem("")}
								className={`btn btn-sm shrink-0 ${!systemId ? "btn-primary" : "btn-secondary"}`}
							>
								<Globe className="w-4 h-4" />
								{t("metadata.allSystems")}
							</button>
						</div>
						<div className="p-2 space-y-3">
							{familyGroups.map((g) => {
								const q = sysFilter.trim().toLowerCase();
								const list = q ? g.systems.filter((s) => s.name.toLowerCase().includes(q)) : g.systems;
								if (list.length === 0) return null;
								return (
									<section key={g.family}>
										<div className="flex items-center gap-2 px-3 pb-1">
											<p className="text-[11px] font-semibold uppercase tracking-wider text-[var(--tone)]">
												{kindLabel(g.family, t)}
											</p>
											<span
												className="h-px flex-1 bg-[var(--color-base-300)]"
												aria-hidden="true"
											/>
											<p className="text-[11px] text-[var(--color-base-content)]/40">
												{list.length}
											</p>
										</div>
										<div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-0.5">
											{list.map((s) => (
												<SystemOption
													key={s.id}
													system={s}
													active={s.id === systemId}
													onSelect={() => goSystem(s.id)}
												/>
											))}
										</div>
									</section>
								);
							})}
						</div>
					</div>
				) : null}
			</div>

			{/* Filters */}
			<div className="flex flex-col sm:flex-row gap-2 sm:items-center">
				<div className="relative flex-1 min-w-0 w-full">
					<Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-[var(--color-base-content)]/40" />
					<input
						className="input pl-9 w-full"
						placeholder={
							selected
								? t("metadata.searchSystemGames", { name: selected.name })
								: t("metadata.searchAllGames")
						}
						value={query}
						onChange={(e) => setQuery(e.target.value)}
					/>
				</div>
				<select
					className="select shrink-0 w-full sm:w-44"
					value={sort}
					onChange={(e) => {
						setSort(e.target.value);
						setPage(1);
					}}
				>
					<option value="scrapes">{t("metadata.sort.scrapesDesc")}</option>
					<option value="">{t("metadata.sort.nameAsc")}</option>
					<option value="name_desc">{t("metadata.sort.nameDesc")}</option>
					<option value="rating_desc">{t("metadata.sort.ratingDesc")}</option>
					<option value="rating_asc">{t("metadata.sort.ratingAsc")}</option>
					<option value="year_desc">{t("metadata.sort.yearDesc")}</option>
					<option value="year_asc">{t("metadata.sort.yearAsc")}</option>
					<option value="completion_asc">{t("metadata.sort.completionAsc")}</option>
					<option value="completion_desc">{t("metadata.sort.completionDesc")}</option>
				</select>
				<select
					className="select shrink-0 w-full sm:w-36"
					value={typeFilter}
					onChange={(e) => {
						setTypeFilter(e.target.value as TypeFilter);
						setPage(1);
					}}
				>
					{TYPE_TABS.map((tab) => (
						<option key={tab.key} value={tab.key}>
							{t(tab.labelKey)}
						</option>
					))}
				</select>
				<p className="text-sm text-[var(--color-base-content)]/50 sm:shrink-0">
					{t("metadata.gamesCount", { count: total })}
				</p>
			</div>

			{/* Pagination (top) */}
			<Pagination page={page} totalPages={totalPages} disabled={loading} onChange={goPage} />

			{error ? (
				<p className="text-sm text-[var(--color-error)] py-6 text-center">{error}</p>
			) : loading ? (
				<p className="text-sm text-[var(--color-base-content)]/50 py-6 text-center">
					{t("metadata.loadingGames")}
				</p>
			) : games && games.length === 0 ? (
				<p className="text-sm text-[var(--color-base-content)]/50 py-6 text-center">
					{t("metadata.noGamesMatch")}
				</p>
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
