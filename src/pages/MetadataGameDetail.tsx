import { useEffect, useState } from "react";
import { Link, useParams } from "react-router-dom";
import { useTranslation } from "react-i18next";
import { ChevronLeft, PenSquare, PlusCircle } from "lucide-react";
import { cdnUrl, fetchMetadataGameDetail, userToken, type GameDetail, type Language, type MediaKind, type MetadataMedia } from "../lib/api";
import { RatingBadge } from "../components/Rating";
import MediaGrid from "../components/MediaGrid";
import UserLink from "../components/UserLink";
import { genreLabel } from "../lib/genres";
import RegionLabel from "../components/RegionLabel";
import { usePageTitle } from "../lib/seo";

// FieldValue renders a metadata value, or a "Data needed" link to the submit
// page for that field when it is missing, to motivate contributors to fill it.
function FieldValue({ gameId, systemId, type, label, value }: { gameId: string; systemId: string; type: string; label: string; value: string }) {
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

// mediaUrl builds an opaque CDN URL. The object key is a deterministic UUID
// (media/games/{system}/{uuid}.webp) so it reveals nothing about the game. A
// version param derived from created_at busts the browser cache when the asset
// is replaced (a new media row gets a new created_at).
function mediaUrl(m: MetadataMedia): string {
	const url = cdnUrl(m.object_key);
	return m.created_at ? `${url}?v=${encodeURIComponent(m.created_at)}` : url;
}

// isGameComplete mirrors the "Completed" flag from the game list: full text
// metadata, translations and cover/logo/screenshot/fanart/video. The media
// kinds match the backend's system completion calculation (which counts cover).
function isGameComplete(g: GameDetail): boolean {
	const textComplete = Boolean(g.description && g.genre && g.developer && g.publisher && g.release_year && (g.rating ?? 0) > 0);
	const has = (kind: string) => g.media.some((m) => m.kind === kind);
	return textComplete && (g.translations?.length ?? 0) > 0 && has("cover") && has("logo") && has("screenshot") && has("fanart") && has("video");
}

export default function MetadataGameDetail() {
	const { t, i18n } = useTranslation();
	const { systemId, gameId } = useParams<{ systemId: string; gameId: string }>();
	const [game, setGame] = useState<GameDetail | null>(null);
	const [lang, setLang] = useState(() => i18n.resolvedLanguage || i18n.language || "en");
	const [error, setError] = useState<string | null>(null);
	const [holoMx, setHoloMx] = useState(0);
	const [holoMy, setHoloMy] = useState(0);
	usePageTitle(game ? `${game.name} - NeoAssets` : "NeoAssets - Game Metadata");

	useEffect(() => {
		if (!gameId) return;
		fetchMetadataGameDetail(gameId, lang === "en" ? "" : lang)
			.then((g) => {
				setGame({ ...g, roms: g.roms || [], media: g.media || [], contributors: g.contributors || [], regions: g.regions || [] });
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
	const langOptions: Language[] = [
		{ code: "en", name: "English", native_name: "English" },
		...translations,
	];

	const activeLang = langOptions.find((l) => l.code === lang) || langOptions[0];

	if (error) return <p className="text-sm text-[var(--color-error)] text-center py-10">{error}</p>;
	if (!game) return <p className="text-sm text-[var(--color-base-content)]/50 text-center py-10">{t("metadataGame.loadingGame")}</p>;

	const complete = isGameComplete(game);
	const contributors = game.contributors || [];
	const regions = game.regions || [];

	return (
		<div className="space-y-6">
			<div className="flex items-center gap-3">
				<Link to={`/app/metadata/${systemId || game.system_id}`} className="btn btn-ghost !p-2" aria-label={t("common.back")}>
					<ChevronLeft className="w-5 h-5" />
				</Link>
				<div className="min-w-0 flex-1">
					<div
						className="flex items-center gap-2 min-w-0"
						onPointerMove={(e) => {
							const r = e.currentTarget.getBoundingClientRect();
							setHoloMx((e.clientX - r.left) / r.width - 0.5);
							setHoloMy((e.clientY - r.top) / r.height - 0.5);
						}}
						onPointerLeave={() => {
							setHoloMx(0);
							setHoloMy(0);
						}}
						style={{ "--mx": holoMx, "--my": holoMy } as React.CSSProperties}
					>
						<h1 className="text-2xl md:text-3xl font-bold tracking-tight truncate">{game.name}</h1>
						<span className={`badge badge-lg shrink-0 uppercase ${game.type === "hack" ? "badge-warning" : game.type === "homebrew" ? "badge-info" : "badge-primary"}`}>{game.type || "base"}</span>
						{game.region ? <span className="badge badge-lg badge-secondary shrink-0"><RegionLabel region={game.region} /></span> : null}
						{complete ? <span className="holo-badge inline-flex items-center rounded-full border border-black/15 px-3 py-0.5 text-xs font-bold shadow-sm shrink-0">{t("metadataGame.completed")}</span> : null}
					</div>
					<p className="text-sm text-[var(--color-base-content)]/60">{game.system_name}</p>
				</div>
				{userToken() ? (
					<Link to={`/app/metadata/${systemId || game.system_id}/game/${game.id}/submit`} className="btn btn-primary btn-sm shrink-0">
						<PenSquare className="w-4 h-4" />
						{t("metadataGame.submitChanges")}
					</Link>
				) : (
					<Link
						to="/app/login"
						state={{ from: `/app/metadata/${systemId || game.system_id}/game/${game.id}/submit` }}
						className="btn btn-primary btn-sm shrink-0"
					>
						<PenSquare className="w-4 h-4" />
						{t("metadataGame.signInToSubmit")}
					</Link>
				)}
			</div>

			<div className="card p-6">
				<div className="flex flex-col sm:flex-row gap-6">
					<div className="w-full sm:w-56 shrink-0 h-72 flex items-start justify-center">
						{(() => {
							const cover = game.media.find((m) => m.kind === "cover");
							return cover ? (
								<div className="relative w-full h-full flex items-start justify-center">
									<img src={mediaUrl(cover)} alt="" className="max-h-72 max-w-full w-auto h-auto object-contain rounded-lg border border-[var(--color-base-300)]" onError={(e) => (e.currentTarget.style.display = "none")} />
									{cover.region ? <span className="badge badge-secondary badge-sm absolute bottom-1 right-1"><RegionLabel region={cover.region} /></span> : null}
								</div>
							) : (
								<div className="w-full h-full rounded-lg bg-[var(--color-base-300)]" />
							);
						})()}
					</div>
					<div className="flex-1 min-w-0 space-y-4 text-sm">
						<div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
							<div><p className="label-text">{t("metadataGame.fields.ratings")}</p><RatingBadge rating={game.rating} /></div>
							<div><p className="label-text">{t("metadataGame.fields.publisher")}</p><FieldValue gameId={game.id} systemId={systemId || game.system_id} type="publisher" label={t("metadataGame.fields.publisher")} value={game.publisher} /></div>
							<div><p className="label-text">{t("metadataGame.fields.developer")}</p><FieldValue gameId={game.id} systemId={systemId || game.system_id} type="developer" label={t("metadataGame.fields.developer")} value={game.developer} /></div>
							<div><p className="label-text">{t("metadataGame.fields.genre")}</p><FieldValue gameId={game.id} systemId={systemId || game.system_id} type="genre" label={t("metadataGame.fields.genre")} value={genreLabel(t, game.genre)} /></div>
						</div>
						{regions.length > 0 ? (
							<div>
								<p className="label-text mb-1">{t("metadataGame.regionalNames")}</p>
								<div className="space-y-1">
									{regions.map((r) => (
										<p key={r.region} className="text-sm text-[var(--color-base-content)]/70 flex items-center gap-2 flex-wrap">
											<span className="badge badge-secondary badge-xs"><RegionLabel region={r.region} /></span>
											<span>{r.name || <span className="italic opacity-60">{t("metadataAdmin.none")}</span>}</span>
											{r.release_year ? (
												<span className="text-xs text-[var(--color-base-content)]/50">
													{r.release_year}{r.release_month ? `-${String(r.release_month).padStart(2, "0")}` : ""}
												</span>
											) : null}
										</p>
									))}
								</div>
							</div>
						) : null}
						{game.description ? (
							<div>
								<div className="flex items-center justify-between gap-3 mb-1">
									<p className="label-text">{t("common.description")}</p>
									{langOptions.length > 1 ? (
<select
										value={lang}
										onChange={(e) => setLang(e.target.value)}
										className="select select-sm shrink-0 w-44"
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
								<p className="text-sm text-[var(--color-base-content)]/70 max-h-40 overflow-y-auto pr-2">{game.description}</p>
								{lang !== "en" && activeLang ? <p className="text-xs text-[var(--color-base-content)]/40 mt-1">{t("metadataGame.translatedIn", { language: activeLang.name })}</p> : null}
							</div>
						) : null}
					</div>
				</div>
			</div>

			<section className="card p-6">
				<h2 className="font-semibold mb-3">{t("metadataGame.mediaTitle", { count: game.media.filter((m) => m.kind !== "cover").length })}</h2>
				{(() => {
					const list = game.media.filter((m) => m.kind !== "cover");
					if (list.length === 0) {
						return <p className="text-sm text-[var(--color-base-content)]/50">{t("metadataGame.noMedia")}</p>;
					}
					return <MediaGrid items={list} url={mediaUrl} label={(k) => t(KIND_LABEL[k] || k)} showMeta />;
				})()}
			</section>

			{regions.some((r) => (r.media || []).length > 0) ? (
				<section className="card p-6">
					<h2 className="font-semibold mb-3">{t("metadataGame.regionsTitle")}</h2>
					<div className="space-y-3">
						{regions.filter((r) => (r.media || []).length > 0).map((r) => (
							<div key={r.region} className="rounded-lg border border-[var(--color-base-300)] p-3 space-y-2">
								<span className="badge badge-secondary badge-sm"><RegionLabel region={r.region} /></span>
								<div className="flex flex-wrap gap-2">
									{(r.media || []).map((m) => (
										<img
											key={m.id}
											src={mediaUrl(m)}
											alt={t(KIND_LABEL[m.kind] || m.kind)}
											className="w-24 h-24 object-contain rounded-md border border-[var(--color-base-300)] bg-[var(--color-base-300)]/30"
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
				<section className="card p-6">
					<h2 className="font-semibold mb-3">{t("metadataGame.contributors")}</h2>
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

			<section className="card p-6">
				<h2 className="font-semibold mb-3">{t("metadataGame.romDumpsTitle", { count: game.roms.length })}</h2>
				<div className="space-y-3">
					{game.roms.map((r) => (
						<div key={r.id} className="rounded-lg border border-[var(--color-base-300)] p-3 space-y-2">
							<p className="font-mono text-xs font-semibold text-[var(--color-base-content)]/80 truncate">{r.name}</p>
							<div className="grid grid-cols-2 md:grid-cols-4 gap-x-4 gap-y-2">
								<div><p className="text-[10px] uppercase tracking-wider text-[var(--color-base-content)]/40">SHA1</p><p className="font-mono text-[11px] break-all">{r.sha1 || "—"}</p></div>
								<div><p className="text-[10px] uppercase tracking-wider text-[var(--color-base-content)]/40">CRC</p><p className="font-mono text-[11px]">{r.crc || "—"}</p></div>
								<div><p className="text-[10px] uppercase tracking-wider text-[var(--color-base-content)]/40">MD5</p><p className="font-mono text-[11px] break-all">{r.md5 || "—"}</p></div>
								<div><p className="text-[10px] uppercase tracking-wider text-[var(--color-base-content)]/40">{t("common.size")}</p><p className="font-mono text-[11px]">{(r.size / 1024 / 1024).toFixed(1)} MB</p></div>
							</div>
						</div>
					))}
					{game.roms.length === 0 ? <p className="text-sm text-[var(--color-base-content)]/50">{t("metadataGame.noDumps")}</p> : null}
				</div>
			</section>
		</div>
	);
}
