import { useEffect, useState } from "react";
import SectionTitle from "../components/ui/SectionTitle";
import { Link, useParams } from "react-router-dom";
import { useTranslation } from "react-i18next";
import {
	ChevronLeft,
	ChevronRight,
	PenSquare,
	PlusCircle,
	Search,
	Images,
	Globe,
	Users,
	HardDrive,
	Gamepad2,
	Building2,
	Code,
	Tag,
	Star,
} from "lucide-react";
import {
	fetchMetadataGameDetail,
	isAuthed,
	type GameDetail,
	type Language,
	type MediaKind,
	mediaUrl,
} from "../lib/api";
import MediaGrid from "../components/MediaGrid";
import UserLink from "../components/UserLink";
import Pagination from "../components/Pagination";
import { genreLabel } from "../lib/genres";
import { typeBadgeClass } from "../lib/gameTypes";
import RegionLabel from "../components/RegionLabel";
import { SITE_URL, usePageMeta, type PageMeta } from "../lib/seo";

// FieldValue renders a metadata value, or a "Data needed" link to the submit
// page for that field when it is missing, to motivate contributors to fill it.
function FieldValue({
	gameId,
	systemId,
	type,
	label,
	value,
}: {
	gameId: string;
	systemId: string;
	type: string;
	label: string;
	value: string;
}) {
	const { t } = useTranslation();
	if (value) {
		return <p className="text-sm text-[var(--color-base-content)]/70">{value}</p>;
	}
	return (
		<Link
			to={`/app/metadata/${systemId}/game/${gameId}/submit?type=${type}`}
			className="inline-flex items-center gap-1.5 text-xs text-[var(--color-warning)] font-medium hover:underline"
		>
			<PlusCircle className="w-3.5 h-3.5" />
			{t("metadataGame.dataNeeded", { label })}
		</Link>
	);
}

const KIND_LABEL: Record<MediaKind, string> = {
	cover: "metadataGame.mediaKind.cover",
	boxfront: "metadataGame.mediaKind.boxfront",
	boxback: "metadataGame.mediaKind.boxback",
	screenshot: "metadataGame.mediaKind.screenshot",
	logo: "metadataGame.mediaKind.logo",
	fanart: "metadataGame.mediaKind.fanart",
	video: "metadataGame.mediaKind.video",
};

// gameCompletionPct is the share of the curated metadata the game already has
// (full text, translations, cover/logo/screenshot/fanart/video), so the header
// badge can show the exact percentage. The media kinds match the backend's
// system completion calculation (which counts cover).
function gameCompletionPct(g: GameDetail): number {
	const textComplete = Boolean(
		g.description && g.genre && g.developer && g.publisher && g.release_year && (g.rating ?? 0) > 0,
	);
	const has = (kind: string) => g.media.some((m) => m.kind === kind);
	const checks = [
		textComplete,
		(g.translations?.length ?? 0) > 0,
		has("cover"),
		has("logo"),
		has("screenshot"),
		has("fanart"),
		has("video"),
	];
	return Math.round((checks.filter(Boolean).length / checks.length) * 100);
}

export default function MetadataGameDetail() {
	const { t, i18n } = useTranslation();
	const { systemId, gameId } = useParams<{ systemId: string; gameId: string }>();
	const [game, setGame] = useState<GameDetail | null>(null);
	const [lang, setLang] = useState(() => i18n.resolvedLanguage || i18n.language || "en");
	const [error, setError] = useState<string | null>(null);
	const [coverIdx, setCoverIdx] = useState(0);
	const [romQuery, setRomQuery] = useState("");
	const [romPage, setRomPage] = useState(1);
	usePageMeta(gameMeta(game));

	useEffect(() => {
		if (!gameId) return;
		fetchMetadataGameDetail(gameId, lang === "en" ? "" : lang)
			.then((g) => {
				setGame({
					...g,
					roms: g.roms || [],
					media: g.media || [],
					contributors: g.contributors || [],
					regions: g.regions || [],
				});
				setError(null);
			})
			.catch((e: Error) => setError(e.message));
	}, [gameId, lang]);

	// The app language is the default language for the game description.
	useEffect(() => {
		setLang(i18n.resolvedLanguage || i18n.language || "en");
	}, [i18n.resolvedLanguage, i18n.language]);

	// If the game has no translation for the selected language, fall back to the
	// closest match (e.g. zh -> zh-CN) or to English.
	useEffect(() => {
		if (!game) return;
		const codes = ["en", ...(game.translations || []).map((l) => l.code)];
		if (codes.includes(lang)) return;
		const base = lang.split("-")[0];
		const match = codes.find((code) => code.split("-")[0] === base);
		setLang(match || "en");
	}, [game, lang]);

	// English is the source language; translations (if any) come from the API.
	const translations: Language[] = game?.translations || [];
	const langOptions: Language[] = [{ code: "en", name: "English", native_name: "English" }, ...translations];

	const activeLang = langOptions.find((l) => l.code === lang) || langOptions[0];

	if (error) return <p className="text-sm text-[var(--color-error)] text-center py-10">{error}</p>;
	if (!game)
		return (
			<p className="text-sm text-[var(--color-base-content)]/50 text-center py-10">
				{t("metadataGame.loadingGame")}
			</p>
		);

	const completionPct = gameCompletionPct(game);
	const contributors = game.contributors || [];
	const regions = game.regions || [];

	// ROM dump search (by name or any hash) and pagination.
	const romQueryNorm = romQuery.trim().toLowerCase();
	const filteredRoms = romQueryNorm
		? game.roms.filter((r) =>
				[r.name, r.sha1, r.crc, r.md5, r.sha256].some((v) => (v || "").toLowerCase().includes(romQueryNorm)),
			)
		: game.roms;
	const ROM_PAGE_SIZE = 15;
	const romTotalPages = Math.max(1, Math.ceil(filteredRoms.length / ROM_PAGE_SIZE));
	const romPageClamped = Math.min(romPage, romTotalPages);
	const romPageItems = filteredRoms.slice((romPageClamped - 1) * ROM_PAGE_SIZE, romPageClamped * ROM_PAGE_SIZE);
	// A region may exist only to hold regional cover/logo media; it belongs in
	// the regional media section, not in the regional names list.
	const namedRegions = regions.filter((r) => r.name || r.release_year);

	return (
		<div className="space-y-6">
			{/* Header: a breadcrumb back to the system, the title, compact tags,
			    and the contribute action (full width on phones). */}
			<header className="card card-tone tone-meta px-4 py-5 sm:px-6 sm:py-7 flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
				<Gamepad2
					className="absolute -right-6 -bottom-8 w-40 h-40 -rotate-12 text-[var(--tone)] opacity-[0.08] pointer-events-none"
					strokeWidth={1.5}
					aria-hidden="true"
				/>
				<div className="min-w-0">
					<Link
						to={`/app/metadata/${systemId || game.system_id}`}
						className="inline-flex items-center gap-1 text-sm text-[var(--color-base-content)]/75 hover:text-[var(--color-base-content)] mb-2"
					>
						<ChevronLeft className="w-4 h-4" aria-hidden="true" />
						{game.system_name || t("common.back")}
					</Link>
					<h1 className="text-2xl md:text-3xl font-semibold break-words">{game.name}</h1>
					<div className="flex items-center gap-1.5 flex-wrap mt-2">
						<span className={`badge ${typeBadgeClass(game.type)}`}>
							{t("metadata.type." + (game.type || "base"))}
						</span>
						{game.region ? (
							<span className="badge badge-solid-neutral">
								<RegionLabel region={game.region} />
							</span>
						) : null}
						<span
							title={completionPct === 100 ? t("metadataGame.completed") : t("metadata.completion")}
							className={`badge ${completionPct === 100 ? "holo-badge" : "badge-solid-neutral"}`}
						>
							{t("metadata.completePct", { pct: completionPct })}
						</span>
					</div>
				</div>
				{isAuthed() ? (
					<Link
						to={`/app/metadata/${systemId || game.system_id}/game/${game.id}/submit`}
						className="btn btn-primary shrink-0 w-full sm:w-auto"
					>
						<PenSquare className="w-4 h-4" />
						{t("metadataGame.submitChanges")}
					</Link>
				) : (
					<Link
						to="/app/login"
						state={{ from: `/app/metadata/${systemId || game.system_id}/game/${game.id}/submit` }}
						className="btn btn-primary shrink-0 w-full sm:w-auto"
					>
						<PenSquare className="w-4 h-4" />
						{t("metadataGame.signInToSubmit")}
					</Link>
				)}
			</header>

			<div className="card p-4 sm:p-6">
				<div className="flex flex-col sm:flex-row gap-6">
					{/* Cover: natural aspect, region below, compact switcher when there are several. */}
					<div className="w-full sm:w-60 shrink-0 space-y-3">
						{(() => {
							const covers = game.media.filter((m) => m.kind === "cover");
							if (covers.length === 0) {
								return <div className="w-full aspect-[3/4] rounded-lg bg-[var(--color-base-300)]" />;
							}
							const idx = Math.min(coverIdx, covers.length - 1);
							const cover = covers[idx];
							return (
								<>
									<img
										src={mediaUrl(cover.object_key, cover.created_at)}
										alt=""
										className="block w-full h-auto rounded-lg ring-1 ring-white/10 shadow-xl shadow-black/40 mx-auto max-w-[16rem] sm:max-w-none"
										onError={(e) => (e.currentTarget.style.visibility = "hidden")}
									/>
									<div className="flex items-center justify-between gap-2">
										{cover.region ? (
											<span className="badge badge-solid-neutral badge-sm">
												<RegionLabel region={cover.region} />
											</span>
										) : (
											<span />
										)}
										{covers.length > 1 ? (
											<span className="inline-flex items-center rounded-md border border-[var(--color-base-300)] bg-[var(--color-base-100)]">
												<button
													type="button"
													onClick={() =>
														setCoverIdx((idx - 1 + covers.length) % covers.length)
													}
													aria-label={t("metadata.prev")}
													className="grid place-items-center w-7 h-7 hover:bg-[var(--color-base-300)] rounded-l-md"
												>
													<ChevronLeft className="w-4 h-4" />
												</button>
												<span className="px-1.5 font-display text-xs tabular-nums text-[var(--color-base-content)]/70">
													{idx + 1}/{covers.length}
												</span>
												<button
													type="button"
													onClick={() => setCoverIdx((idx + 1) % covers.length)}
													aria-label={t("metadata.next")}
													className="grid place-items-center w-7 h-7 hover:bg-[var(--color-base-300)] rounded-r-md"
												>
													<ChevronRight className="w-4 h-4" />
												</button>
											</span>
										) : null}
									</div>
								</>
							);
						})()}
					</div>

					<div className="flex-1 min-w-0 space-y-5 text-sm">
						{/* Facts: rating in its own amber tile, then publisher, developer and genre. */}
						<div className="grid grid-cols-2 xl:grid-cols-4 gap-3">
							<div className="card card-tone tone-reward p-3">
								<p className="fact-label">{t("metadataGame.fields.ratings")}</p>
								{game.rating && game.rating > 0 ? (
									<p className="mt-1.5 flex items-baseline gap-1.5">
										<Star className="w-5 h-5 self-center text-[var(--tone)]" fill="currentColor" />
										<span className="font-display text-3xl font-bold leading-none tone-text tabular-nums">
											{game.rating}
										</span>
										<span className="text-xs text-[var(--color-base-content)]/50">/10</span>
									</p>
								) : (
									<p className="mt-1.5 font-display text-3xl font-bold leading-none text-[var(--color-base-content)]/30">
										—
									</p>
								)}
							</div>
							<FactTile icon={Building2} label={t("metadataGame.fields.publisher")}>
								<FieldValue
									gameId={game.id}
									systemId={systemId || game.system_id}
									type="publisher"
									label={t("metadataGame.fields.publisher")}
									value={game.publisher}
								/>
							</FactTile>
							<FactTile icon={Code} label={t("metadataGame.fields.developer")}>
								<FieldValue
									gameId={game.id}
									systemId={systemId || game.system_id}
									type="developer"
									label={t("metadataGame.fields.developer")}
									value={game.developer}
								/>
							</FactTile>
							<FactTile icon={Tag} label={t("metadataGame.fields.genre")}>
								<FieldValue
									gameId={game.id}
									systemId={systemId || game.system_id}
									type="genre"
									label={t("metadataGame.fields.genre")}
									value={genreLabel(t, game.genre)}
								/>
							</FactTile>
						</div>

						{namedRegions.length > 0 ? (
							<div>
								<p className="fact-label mb-2">{t("metadataGame.regionalNames")}</p>
								<ul className="divide-y divide-[var(--color-base-300)] rounded-lg border border-[var(--color-base-300)] bg-[var(--color-base-100)]/40">
									{namedRegions.map((r) => (
										<li key={r.region} className="flex items-center gap-3 px-3 py-2">
											<span className="badge badge-solid-neutral badge-xs shrink-0 w-[4.75rem] justify-start">
												<RegionLabel region={r.region} />
											</span>
											<span className="flex-1 min-w-0 truncate">
												{r.name || (
													<span className="italic opacity-60">{t("metadataAdmin.none")}</span>
												)}
											</span>
											{r.release_year ? (
												<span className="shrink-0 font-mono text-xs text-[var(--color-base-content)]/50">
													{r.release_year}
													{r.release_month
														? `-${String(r.release_month).padStart(2, "0")}`
														: ""}
												</span>
											) : null}
										</li>
									))}
								</ul>
							</div>
						) : null}

						{game.description ? (
							<div>
								<div className="flex items-center justify-between gap-3 mb-2">
									<p className="fact-label">{t("common.description")}</p>
									{langOptions.length > 1 ? (
										<select
											value={lang}
											onChange={(e) => setLang(e.target.value)}
											className="select !py-1 !min-h-0 h-8 text-xs shrink-0 w-auto max-w-[12rem]"
											aria-label={t("common.language")}
										>
											{langOptions.map((l) => (
												<option key={l.code} value={l.code}>
													{l.native_name} ({l.name})
												</option>
											))}
										</select>
									) : null}
								</div>
								<p className="text-[15px] leading-7 text-[var(--color-base-content)]/75 max-h-52 overflow-y-auto pr-2 max-w-[80ch]">
									{game.description}
								</p>
								{lang !== "en" && activeLang ? (
									<p className="text-xs text-[var(--color-base-content)]/40 mt-1">
										{t("metadataGame.translatedIn", { language: activeLang.name })}
									</p>
								) : null}
							</div>
						) : null}
					</div>
				</div>
			</div>

			<section className="card p-4 sm:p-6 tone-meta">
				<SectionTitle icon={Images}>
					{t("metadataGame.mediaTitle", { count: game.media.filter((m) => m.kind !== "cover").length })}
				</SectionTitle>
				{(() => {
					const list = game.media.filter((m) => m.kind !== "cover");
					if (list.length === 0) {
						return (
							<p className="text-sm text-[var(--color-base-content)]/50">{t("metadataGame.noMedia")}</p>
						);
					}
					return (
						<MediaGrid
							items={list}
							url={(m) => mediaUrl(m.object_key, m.created_at)}
							label={(k) => t(KIND_LABEL[k] || k)}
							showMeta
						/>
					);
				})()}
			</section>

			{regions.some((r) => (r.media || []).length > 0) ? (
				<section className="card p-4 sm:p-6 tone-meta">
					<SectionTitle icon={Globe}>{t("metadataGame.regionsTitle")}</SectionTitle>
					<div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
						{regions
							.filter((r) => (r.media || []).length > 0)
							.map((r) => (
								<div
									key={r.region}
									className="rounded-lg border border-[var(--color-base-300)] bg-[var(--color-base-100)]/40 p-3 flex items-center gap-3"
								>
									<span className="badge badge-solid-neutral badge-sm shrink-0 w-[5rem] justify-start">
										<RegionLabel region={r.region} />
									</span>
									<div className="flex flex-wrap gap-2 min-w-0">
										{(r.media || []).map((m) => (
											<img
												key={m.id}
												src={mediaUrl(m.object_key, m.created_at)}
												alt={t(KIND_LABEL[m.kind] || m.kind)}
												className="w-16 h-16 object-contain rounded-md border border-[var(--color-base-300)] bg-[var(--color-base-100)] p-1"
												onError={(e) => (e.currentTarget.style.display = "none")}
											/>
										))}
									</div>
								</div>
							))}
					</div>
				</section>
			) : null}

			{contributors.length > 0 ? (
				<section className="card p-4 sm:p-6 tone-community">
					<SectionTitle icon={Users}>{t("metadataGame.contributors")}</SectionTitle>
					<p className="text-sm text-[var(--color-base-content)]/70 break-words">
						{contributors.map((c, i) => (
							<span key={c.id}>
								{i > 0 ? ", " : ""}
								<UserLink>{c.username}</UserLink>({c.count})
							</span>
						))}
					</p>
				</section>
			) : null}

			<section className="card p-4 sm:p-6 tone-meta">
				<SectionTitle icon={HardDrive}>
					{t("metadataGame.romDumpsTitle", { count: game.roms.length })}
				</SectionTitle>
				{game.roms.length > 0 ? (
					<div className="relative mb-3">
						<Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-[var(--color-base-content)]/40" />
						<input
							className="input w-full pl-9"
							placeholder={t("metadataGame.romSearch")}
							value={romQuery}
							onChange={(e) => {
								setRomQuery(e.target.value);
								setRomPage(1);
							}}
						/>
					</div>
				) : null}
				<div className="space-y-3">
					{filteredRoms.length > 0 ? (
						<Pagination page={romPageClamped} totalPages={romTotalPages} onChange={setRomPage} />
					) : null}
					{romPageItems.map((r) => (
						<div key={r.id} className="rounded-lg border border-[var(--color-base-300)] p-3 space-y-2">
							<p className="font-mono text-xs font-semibold text-[var(--color-base-content)]/80 truncate">
								{r.name}
							</p>
							<div className="grid grid-cols-2 md:grid-cols-4 gap-x-4 gap-y-2">
								<div>
									<p className="text-xs r text-[var(--color-base-content)]/40">SHA1</p>
									<p className="font-mono text-[11px] break-all">{r.sha1 || "—"}</p>
								</div>
								<div>
									<p className="text-xs r text-[var(--color-base-content)]/40">CRC</p>
									<p className="font-mono text-[11px]">{r.crc || "—"}</p>
								</div>
								<div>
									<p className="text-xs r text-[var(--color-base-content)]/40">MD5</p>
									<p className="font-mono text-[11px] break-all">{r.md5 || "—"}</p>
								</div>
								<div>
									<p className="text-xs r text-[var(--color-base-content)]/40">{t("common.size")}</p>
									<p className="font-mono text-[11px]">
										{r.size ? `${(r.size / 1024 / 1024).toFixed(1)} MB` : "—"}
									</p>
								</div>
							</div>
						</div>
					))}
					{game.roms.length === 0 ? (
						<p className="text-sm text-[var(--color-base-content)]/50">{t("metadataGame.noDumps")}</p>
					) : null}
					{game.roms.length > 0 && filteredRoms.length === 0 ? (
						<p className="text-sm text-[var(--color-base-content)]/50">{t("metadataGame.noDumpsMatch")}</p>
					) : null}
					{filteredRoms.length > 0 ? (
						<Pagination page={romPageClamped} totalPages={romTotalPages} onChange={setRomPage} />
					) : null}
				</div>
			</section>
		</div>
	);
}

// gameMeta is the title, description, social image and schema.org VideoGame
// data for a game page.
function gameMeta(game: GameDetail | null): PageMeta {
	if (!game) return { title: "Game Metadata - NeoAssets" };
	const year = game.release_year ? ` (${game.release_year})` : "";
	const image = game.cover ? mediaUrl(game.cover, game.cover_updated) : undefined;
	const description =
		game.description ||
		`${game.name}${year} for ${game.system_name}: covers, logos, screenshots, videos and ROM hashes on NeoAssets.`;
	return {
		title: `${game.name}${year} - ${game.system_name} - NeoAssets`,
		description,
		image,
		jsonLd: {
			"@context": "https://schema.org",
			"@type": "VideoGame",
			name: game.name,
			url: `${SITE_URL}/app/metadata/${game.system_id}/game/${game.id}`,
			description: game.description || undefined,
			gamePlatform: game.system_name,
			genre: game.genre || undefined,
			publisher: game.publisher ? { "@type": "Organization", name: game.publisher } : undefined,
			author: game.developer ? { "@type": "Organization", name: game.developer } : undefined,
			datePublished: game.release_year ? String(game.release_year) : undefined,
			image,
		},
	};
}

// FactTile is one labelled fact of a game (publisher, developer, genre) with
// its icon, on a quiet tile next to the rating.
function FactTile({
	icon: Icon,
	label,
	children,
}: {
	icon: React.ComponentType<{ className?: string }>;
	label: string;
	children: React.ReactNode;
}) {
	return (
		<div className="rounded-[var(--radius-card)] border border-[var(--color-base-300)] bg-[var(--color-base-100)]/40 p-3 min-w-0 tone-meta">
			<p className="fact-label flex items-center gap-1.5">
				<Icon className="w-3.5 h-3.5 text-[var(--tone)]" />
				{label}
			</p>
			<div className="mt-1.5 text-[15px] font-medium truncate">{children}</div>
		</div>
	);
}
