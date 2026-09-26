import { useEffect, useRef, useState } from "react";
import { Link, useNavigate, useParams, useSearchParams } from "react-router-dom";
import { useTranslation } from "react-i18next";
import { AlertTriangle, Check, ChevronLeft, ChevronRight, Clapperboard, FileText, Image as ImageIcon, Upload } from "lucide-react";
import {
	cdnUrl,
	createMetadataSubmission,
	fetchGenres,
	fetchMetadataGameDetail,
	fetchMetadataPendingKeys,
	fetchRegions,
	requestMetadataUploadUrl,
	userToken,
	type GameDetail,
	type GameRegion,
	type Genre,
	type Language,
	type MediaKind,
	type Region,
} from "../lib/api";
import { RatingBadge } from "../components/Rating";
import MediaGrid from "../components/MediaGrid";
import { genreLabel } from "../lib/genres";
import { regionLabel } from "../lib/regions";
import RegionLabel, { RegionFlag } from "../components/RegionLabel";
import { uploadWithProgress } from "../lib/upload";
import { ACCEPTED_ASPECTS, IMAGE_ACCEPT, MAX_DESCRIPTION_LENGTH, VIDEO_ACCEPT, VIDEO_FPS, VIDEO_FPS_MAX, VIDEO_FPS_MIN, VIDEO_MAX_SECONDS, VIDEO_MIN_SECONDS, aspectLabel, measureVideo } from "../lib/media";

const TEXT_TYPES = [
	{ key: "name", label: "metadataSubmit.textTypes.name" },
	{ key: "description", label: "metadataSubmit.textTypes.description" },
	{ key: "genre", label: "metadataSubmit.textTypes.genre" },
	{ key: "developer", label: "metadataSubmit.textTypes.developer" },
	{ key: "publisher", label: "metadataSubmit.textTypes.publisher" },
	{ key: "release_year", label: "metadataSubmit.textTypes.release" },
	{ key: "rating", label: "metadataSubmit.textTypes.rating" },
	{ key: "type", label: "metadataSubmit.textTypes.type" },
] as const;

const GAME_TYPES = ["base", "homebrew", "hack"] as const;

const MEDIA_LABEL: Record<MediaKind, string> = {
	cover: "metadataSubmit.mediaKind.cover",
	boxfront: "metadataSubmit.mediaKind.boxfront",
	boxback: "metadataSubmit.mediaKind.boxback",
	screenshot: "metadataSubmit.mediaKind.screenshot",
	logo: "metadataSubmit.mediaKind.logo",
	fanart: "metadataSubmit.mediaKind.fanart",
	video: "metadataSubmit.mediaKind.video",
};

const IMAGE_KINDS: MediaKind[] = ["cover", "screenshot", "logo", "fanart"];
const VIDEO_KIND: MediaKind = "video";

function mediaUrl(m: { object_key: string; created_at?: string }): string {
	const url = cdnUrl(m.object_key);
	return m.created_at ? `${url}?v=${encodeURIComponent(m.created_at)}` : url;
}

interface Draft {
	type: string;
	textValue: string;
	note: string;
}

export default function MetadataSubmissionPage() {
	const { t } = useTranslation();
	const { gameId } = useParams<{ gameId: string }>();
	const [searchParams] = useSearchParams();
	const navigate = useNavigate();
	const draftKey = gameId ? `ns-draft-${gameId}` : "";
	const [game, setGame] = useState<GameDetail | null>(null);
	const [error, setError] = useState<string | null>(null);
	const [lang, setLang] = useState("en");
	// Index of the cover shown in the header slideshow (one cover per region).
	const [coverIdx, setCoverIdx] = useState(0);

	const [type, setType] = useState<string>(() => {
		const t = searchParams.get("type");
		return t || "";
	});
	const [textValue, setTextValue] = useState("");
	const [genres, setGenres] = useState<Genre[]>([]);
	const [regions, setRegions] = useState<Region[]>([]);
	const [region, setRegion] = useState("");
	// Region corrections: existing media to move (object_key -> new region) and
	// the source region when moving an existing name/release.
	const [mediaMoves, setMediaMoves] = useState<Record<string, string>>({});
	const [mediaDeletes, setMediaDeletes] = useState<Record<string, boolean>>({});
	const [mediaMode, setMediaMode] = useState<"new" | "move" | "delete">("new");
	const [textMode, setTextMode] = useState<"new" | "move" | "delete">("new");
	const [textMoveFrom, setTextMoveFrom] = useState("");
	const [note, setNote] = useState("");
	const [file, setFile] = useState<File | null>(null);
	const [previewUrl, setPreviewUrl] = useState<string | null>(null);
	const [videoMeta, setVideoMeta] = useState<{ duration: number; width: number; height: number; fps: number; aspect: string } | null>(null);
	const [fileError, setFileError] = useState<string | null>(null);
	const [status, setStatus] = useState<{ text: string; tone: string } | null>(null);
	const [busy, setBusy] = useState(false);
	const [confirmSubmit, setConfirmSubmit] = useState(false);
	const [progress, setProgress] = useState<number | null>(null);
	const [pendingKeys, setPendingKeys] = useState<string[]>([]);
	const videoRef = useRef<HTMLVideoElement | null>(null);

	const isText = TEXT_TYPES.some((t) => t.key === type);
	const isVideo = type === VIDEO_KIND;

	const translations: Language[] = game?.translations || [];
	const langOptions: Language[] = [{ code: "en", name: "English", native_name: "English" }, ...translations];
	const activeLang = langOptions.find((l) => l.code === lang) || langOptions[0];

	useEffect(() => {
		if (!gameId) return;
		fetchMetadataGameDetail(gameId, lang === "en" ? "" : lang)
			.then((g) => {
				setGame({ ...g, roms: g.roms || [], media: g.media || [] });
				setError(null);
			})
			.catch((e: Error) => setError(e.message));
	}, [gameId, lang]);

	useEffect(() => {
		fetchGenres().then(setGenres).catch(() => {});
		fetchRegions().then(setRegions).catch(() => {});
	}, []);

	// Restore a client-side draft once (drafts never hit the DB).
	useEffect(() => {
		if (!gameId) return;
		try {
			const raw = localStorage.getItem(draftKey);
			if (raw) {
				const d = JSON.parse(raw) as Draft;
				if (d.type) setType(d.type);
				if (d.textValue) setTextValue(d.textValue);
				if (d.note) setNote(d.note);
			}
		} catch {}
		// eslint-disable-next-line react-hooks/exhaustive-deps
	}, [gameId]);

	// Fields/kinds that already have a pending submission for this user+game.
	useEffect(() => {
		if (!gameId || !userToken()) return;
		fetchMetadataPendingKeys(gameId)
			.then(setPendingKeys)
			.catch(() => {});
	}, [gameId]);

	useEffect(() => {
		try {
			if (draftKey) localStorage.setItem(draftKey, JSON.stringify({ type, textValue, note }));
		} catch {}
	}, [draftKey, type, textValue, note]);

	useEffect(() => {
		if (!isVideo || !file) {
			setVideoMeta(null);
			setFileError(null);
			return;
		}
		// Load the video to validate format / duration / fps / aspect ratio
		// before upload. FPS is measured by sampling frames over a short muted
		// playback (browsers do not expose it directly).
		let cancelled = false;
		measureVideo(file)
			.then(({ duration, width, height, fps }) => {
				if (cancelled) return;
				const errors: string[] = [];
				if (!VIDEO_ACCEPT.split(",").some((e) => file.name.toLowerCase().endsWith(e))) {
					errors.push(t("metadataSubmit.errors.format"));
				}
				if (duration < VIDEO_MIN_SECONDS - 0.5) {
					errors.push(t("metadataSubmit.errors.durationMin", { min: VIDEO_MIN_SECONDS, current: duration.toFixed(1) }));
				}
				if (duration > VIDEO_MAX_SECONDS + 0.5) {
					errors.push(t("metadataSubmit.errors.durationMax", { max: VIDEO_MAX_SECONDS, current: duration.toFixed(1) }));
				}
				if (width <= 0 || height <= 0) {
					errors.push(t("metadataSubmit.errors.dimensions"));
				}
				const ratio = width / height;
				const aspectOk = ACCEPTED_ASPECTS.some((a) => Math.abs(a.ratio - ratio) < 0.03);
				if (width > 0 && height > 0 && !aspectOk) {
					errors.push(t("metadataSubmit.errors.aspect", { ratio: (width / height).toFixed(2) }));
				}
				if (fps > 0 && fps < VIDEO_FPS_MIN) {
					errors.push(t("metadataSubmit.errors.frameRate", { fpsMin: VIDEO_FPS_MIN, fps: VIDEO_FPS, detected: fps }));
				}
				setVideoMeta({ duration, width, height, fps, aspect: aspectLabel(width, height) });
				setFileError(errors.length ? errors.join(" ") : null);
			})
			.catch(() => {
				if (cancelled) return;
				setFileError(t("metadataSubmit.errors.readVideo"));
				setVideoMeta(null);
			});
		return () => {
			cancelled = true;
		};
	}, [isVideo, file]);

	// Object URL for the freshly picked image so it can be shown next to the
	// current one (old left, new right) before submitting.
	useEffect(() => {
		if (!file || isVideo) {
			setPreviewUrl(null);
			return;
		}
		const url = URL.createObjectURL(file);
		setPreviewUrl(url);
		return () => URL.revokeObjectURL(url);
	}, [file, isVideo]);

	// Images are uploaded in their original format: the backend normalizes them
	// to WebP (crop/scale/quality) on approval, so client-side conversion is no
	// longer trusted. Videos are validated here for fast feedback and re-encoded
	// to MP4/HEVC by the backend on approval.
	function onPickFile(f: File | null) {
		setFileError(null);
		setFile(f);
	}

	if (error) return <p className="text-sm text-[var(--color-error)] text-center py-10">{error}</p>;
	if (!game) return <p className="text-sm text-[var(--color-base-content)]/50 text-center py-10">{t("metadataSubmit.loadingGame")}</p>;

	const currentKind = type as MediaKind;
	const isRegionalKind = currentKind === "logo" || currentKind === "cover";
	// Regions with a name or release, shown in the header like the game detail.
	const namedRegions = (game.regions || []).filter((r) => r.name || r.release_year);
	// Per-region data, so the "current" value always matches the selected region.
	const regionMap = new Map((game.regions || []).map((r) => [r.region, r]));
	const selectedRegion = region ? regionMap.get(region) : undefined;

	function regionRelease(gr?: { release_year?: number | null; release_month?: number | null }): string {
		if (!gr?.release_year) return "";
		return `${gr.release_year}${gr.release_month ? `-${String(gr.release_month).padStart(2, "0")}` : ""}`;
	}

	const currentText =
		type === "name"
			? (region ? selectedRegion?.name || "" : game.name)
			: type === "description"
				? game.description
				: type === "genre"
					? genreLabel(t, game.genre)
					: type === "developer"
						? game.developer
						: type === "publisher"
							? game.publisher
							: type === "release_year"
								? (region ? regionRelease(selectedRegion) : regionRelease(game))
								: type === "rating"
									? game.rating ? String(game.rating) : ""
									: type === "type"
										? game.type || ""
										: "";

	// For regional media, only the selected region's asset is the "current" one;
	// for the rest, the region does not apply.
	const currentMedia = isText
		? []
		: isRegionalKind && region
			? (selectedRegion?.media || []).filter((m) => m.kind === currentKind)
			: game.media.filter((m) => m.kind === currentKind);

	// Region the "current" value belongs to: the selected one, or the game's
	// resolved primary when no region has been picked yet.
	const currentRegion = region || game.region || "";

	// Which region already holds data for the field/kind being submitted, so the
	// select can flag it.
	function regionHasData(r: Region): boolean {
		const gr = regionMap.get(r.name);
		if (!gr) return false;
		if (type === "name") return Boolean(gr.name);
		if (type === "release_year") return Boolean(gr.release_year);
		if (isRegionalKind) return (gr.media || []).some((m) => m.kind === currentKind);
		return false;
	}

	// Existing cover/logo of the current kind across every region, so one can be
	// moved to a different region without uploading it again.
	const existingMedia = isRegionalKind
		? (game.regions || []).flatMap((r) => (r.media || []).filter((m) => m.kind === currentKind))
		: [];
	// Existing regional names/releases, so one can be moved to another region.
	const existingText =
		type === "name"
			? (game.regions || []).filter((r) => r.name)
			: type === "release_year"
				? (game.regions || []).filter((r) => r.release_year)
				: [];
	const textValueOf = (r: GameRegion): string =>
		type === "name" ? r.name || "" : r.release_year ? `${r.release_year}${r.release_month ? `-${String(r.release_month).padStart(2, "0")}` : ""}` : "";

	// Deleting requires a reason, so the "why" is mandatory in that case.
	const deleting = (textMode === "delete" && textMoveFrom !== "") || Object.keys(mediaDeletes).length > 0;

	const textType = TEXT_TYPES.find((t) => t.key === type);
	const textLabel = textType ? t(textType.label) : "";
	const pendingLabels = pendingKeys.map((k) => {
		const mediaKey = MEDIA_LABEL[k as MediaKind];
		if (mediaKey) return t(mediaKey);
		const text = TEXT_TYPES.find((x) => x.key === k);
		return text ? t(text.label) : k;
	});

	// hasData reports whether the game already has a value for a text field or a
	// media kind, so the "what to submit" buttons can show what is still missing.
	function hasData(key: string): boolean {
		if (!game) return false;
		switch (key) {
			case "name": return Boolean(game.name);
			case "description": return Boolean(game.description);
			case "genre": return Boolean(game.genre);
			case "developer": return Boolean(game.developer);
			case "publisher": return Boolean(game.publisher);
			case "release_year": return Boolean(game.release_year);
			case "rating": return (game.rating ?? 0) > 0;
			case "type": return Boolean(game.type);
			default: return game.media.some((m) => m.kind === key);
		}
	}

	// TypeButton renders a "what to submit" option, disabled when the user
	// already has a pending submission for that field/kind on this game. The
	// color and dot tell whether the game already has that data.
	const typeButton = (key: string, label: string) => {
		const pending = pendingKeys.includes(key);
		const filled = hasData(key);
		return (
			<button
				key={key}
				type="button"
				disabled={pending}
				title={pending ? t("metadataSubmit.pendingTitle") : filled ? t("metadataSubmit.hasData") : t("metadataSubmit.noData")}
				onClick={() => {
					if (pending) return;
					setType(key);
					setTextValue("");
					setFile(null);
					setFileError(null);
				}}
				className={`btn btn-sm gap-1.5 ${type === key ? "btn-primary" : "btn-outline"} ${pending ? "opacity-50 cursor-not-allowed" : ""}`}
			>
				<span className={`w-2.5 h-2.5 rounded-full shrink-0 ${filled ? "bg-[var(--color-success)]" : "bg-[var(--color-base-content)]/30"}`} aria-hidden />
				{label}
				{pending ? t("metadataSubmit.pendingSuffix") : ""}
			</button>
		);
	};

	// renderTextInput renders the editor for the picked text field.
	const renderTextInput = () => (
		<>
			{type === "description" ? (
				<>
					<textarea className="input w-full min-h-32" maxLength={MAX_DESCRIPTION_LENGTH} value={textValue} onChange={(e) => setTextValue(e.target.value)} placeholder={t("metadataSubmit.form.newDescriptionPlaceholder")} />
					<div className="flex items-center justify-between gap-2 mt-1">
						<p className="text-xs text-[var(--color-base-content)]/50">
							{t("metadataSubmit.form.descriptionNote", { max: MAX_DESCRIPTION_LENGTH })}
						</p>
						<span className={`text-xs shrink-0 ${textValue.length >= MAX_DESCRIPTION_LENGTH ? "text-[var(--color-error)]" : "text-[var(--color-base-content)]/50"}`}>
							{t("metadataSubmit.form.charCount", { count: textValue.length, max: MAX_DESCRIPTION_LENGTH })}
						</span>
					</div>
				</>
			) : type === "release_year" ? (
				<>
					<input type="month" min="1950-01" max="2100-12" className="input w-full" value={textValue} onChange={(e) => setTextValue(e.target.value)} />
					<p className="text-xs text-[var(--color-base-content)]/50 mt-1">{t("metadataSubmit.form.releaseHint")}</p>
				</>
			) : type === "rating" ? (
				<>
					<input type="number" min={1} max={10} step={1} className="input w-full" value={textValue} onChange={(e) => setTextValue(e.target.value)} placeholder="1-10" />
					<p className="text-xs text-[var(--color-base-content)]/50 mt-1">{t("metadataSubmit.form.ratingHint")}</p>
				</>
			) : type === "type" ? (
				<>
					<select className="select w-full" value={textValue} onChange={(e) => setTextValue(e.target.value)}>
						{GAME_TYPES.map((g) => (
							<option key={g} value={g}>{g}</option>
						))}
					</select>
					<p className="text-xs text-[var(--color-base-content)]/50 mt-1">{t("metadataSubmit.form.typeHint")}</p>
				</>
			) : type === "genre" ? (
				<select className="select w-full" value={textValue} onChange={(e) => setTextValue(e.target.value)}>
					<option value="">{t("metadataSubmit.form.genrePlaceholder")}</option>
					{genres.map((g) => (
						<option key={g.id} value={g.name}>{t("metadata.genres." + g.id, { defaultValue: g.name })}</option>
					))}
				</select>
			) : (
				<input className="input w-full" value={textValue} onChange={(e) => setTextValue(e.target.value)} placeholder={t("metadataSubmit.form.newFieldPlaceholder", { field: textLabel.toLowerCase() })} />
			)}
		</>
	);

	async function submit() {
		setConfirmSubmit(false);
		if (!game) return;
		if (!type) {
			setStatus({ text: t("metadataSubmit.status.pickType"), tone: "error" });
			return;
		}
		const hasMediaMoves = Object.keys(mediaMoves).length > 0;
		const hasMediaDeletes = Object.keys(mediaDeletes).length > 0;
		// Removing content must always explain why.
		if (deleting && !note.trim()) {
			setStatus({ text: t("metadataSubmit.status.deleteReason"), tone: "error" });
			return;
		}
		if (isText && textMode === "delete") {
			if (!textMoveFrom) {
				setStatus({ text: t("metadataSubmit.status.pickDeleteRegion"), tone: "error" });
				return;
			}
		} else if (isText) {
			if (!textValue.trim()) {
				setStatus({ text: t("metadataSubmit.status.enterValue"), tone: "error" });
				return;
			}
			if (textType?.key === "release_year") {
				const [ys, ms] = textValue.trim().split("-");
				const y = Number(ys);
				if (!Number.isInteger(y) || y < 0 || y > 10000) {
					setStatus({ text: t("metadataSubmit.status.invalidYear"), tone: "error" });
					return;
				}
				if (ms !== undefined && ms !== "") {
					const m = Number(ms);
					if (!Number.isInteger(m) || m < 1 || m > 12) {
						setStatus({ text: t("metadataSubmit.status.invalidMonth"), tone: "error" });
						return;
					}
				}
			}
			if (textType?.key === "rating") {
				const r = Number(textValue.trim());
				if (!Number.isInteger(r) || r < 1 || r > 10) {
					setStatus({ text: t("metadataSubmit.status.invalidRating"), tone: "error" });
					return;
				}
			}
			if (textType?.key === "type") {
				if (!(GAME_TYPES as readonly string[]).includes(textValue.trim())) {
					setStatus({ text: t("metadataSubmit.status.invalidGameType"), tone: "error" });
					return;
				}
			}
			if (textType?.key === "description" && textValue.trim().length > MAX_DESCRIPTION_LENGTH) {
				setStatus({ text: t("metadataSubmit.status.descriptionTooLong", { max: MAX_DESCRIPTION_LENGTH }), tone: "error" });
				return;
			}
		}
		if (isRegionalKind && mediaMode === "move" && !hasMediaMoves) {
			setStatus({ text: t("metadataSubmit.status.pickMoveRegion"), tone: "error" });
			return;
		}
		if (isRegionalKind && mediaMode === "delete" && !hasMediaDeletes) {
			setStatus({ text: t("metadataSubmit.status.pickDelete"), tone: "error" });
			return;
		}
		if (!isText && !file && !hasMediaMoves && !hasMediaDeletes) {
			setStatus({ text: isVideo ? t("metadataSubmit.status.pickVideo") : t("metadataSubmit.status.pickImage"), tone: "error" });
			return;
		}
		if (isVideo && fileError) {
			setStatus({ text: t("metadataSubmit.status.fixVideo"), tone: "error" });
			return;
		}
		setBusy(true);
		setStatus({ text: t("metadataSubmit.status.creating"), tone: "info" });
		try {
			const payload: Record<string, unknown> = {};
			if (note.trim()) payload.note = note.trim();
			if (isText && textType) {
				if (textMode === "delete") {
					// Remove the name/release of a region.
					payload.delete = true;
					payload.region = textMoveFrom;
					payload.field = textType.key === "name" ? "name" : "release";
				} else {
					if (textType.key === "release_year") {
						const [ys, ms] = textValue.trim().split("-");
						payload.release_year = Number(ys);
						if (ms) payload.release_month = Number(ms);
					} else if (textType.key === "rating") {
						payload.rating = Number(textValue.trim());
					} else {
						payload[textType.key] = textValue.trim();
					}
					// The name and release date are region-specific. region_from
					// moves an existing value from another region.
					if ((textType.key === "name" || textType.key === "release_year") && region) {
						payload.region = region;
						if (textMoveFrom && textMoveFrom !== region) payload.region_from = textMoveFrom;
					}
				}
			}

			if (isText) {
				await createMetadataSubmission({ game_id: game.id, payload });
			} else {
				const files: { kind: MediaKind; object_key: string; file_name: string; mime_type: string; size: number; region: string; delete?: boolean; move?: boolean }[] = [];
				// Existing cover/logo deleted from a region.
				for (const m of existingMedia) {
					if (mediaDeletes[m.object_key]) {
						const fileName = m.object_key.split("/").pop() || m.object_key;
						files.push({ kind: m.kind, object_key: m.object_key, file_name: fileName, mime_type: m.mime, size: m.size, region: m.region || "", delete: true });
					}
				}
				// Existing cover/logo moved to another region (no new upload).
				for (const m of existingMedia) {
					const target = mediaMoves[m.object_key];
					if (target && target !== (m.region || "")) {
						const fileName = m.object_key.split("/").pop() || m.object_key;
						files.push({ kind: m.kind, object_key: m.object_key, file_name: fileName, mime_type: m.mime, size: m.size, region: target, move: true });
					}
				}
				// A newly picked file (optional when only moving).
				if (file) {
					const mime = file.type || "application/octet-stream";
					const regionForFile = isRegionalKind ? region : "";
					setStatus({ text: isVideo ? t("metadataSubmit.uploadingVideo") : t("metadataSubmit.uploadingImage"), tone: "info" });
					const resp = await requestMetadataUploadUrl({
						game_id: game.id,
						kind: currentKind,
						file_name: file.name,
						mime_type: mime,
						size: file.size,
						region: regionForFile,
					});
					await uploadWithProgress(resp.upload_url, file, mime, (p) => setProgress(Math.round(p * 100)));
					setProgress(100);
					files.push({ kind: currentKind, object_key: resp.object_key, file_name: file.name, mime_type: mime, size: file.size, region: regionForFile });
				}
				await createMetadataSubmission({ game_id: game.id, payload, files });
			}

			try {
				localStorage.removeItem(draftKey);
			} catch {}
			setStatus({ text: t("metadataSubmit.status.submitted"), tone: "success" });
			setProgress(null);
		} catch (e) {
			setStatus({ text: (e as Error).message, tone: "error" });
		} finally {
			setBusy(false);
		}
	}

	return (
		<div className="space-y-6">
			<div className="flex items-center gap-3">
				<Link to={`/app/metadata/${game.system_id}/game/${game.id}`} className="btn btn-ghost !p-2" aria-label={t("common.back")}>
					<ChevronLeft className="w-5 h-5" />
				</Link>
				<div className="min-w-0">
					<h1 className="text-2xl md:text-3xl font-bold tracking-tight truncate">{t("metadataSubmit.submitChanges")}</h1>
					<p className="text-sm text-[var(--color-base-content)]/60 flex items-center gap-2">
						<span className="truncate">{game.name} · {game.system_name}</span>
						<span className={`badge badge-sm shrink-0 uppercase ${game.type === "hack" ? "badge-solid-warning" : game.type === "homebrew" ? "badge-solid-info" : "badge-solid-neutral"}`}>{game.type || "base"}</span>
					</p>
				</div>
			</div>

			<section className="card p-6">
				<div className="flex flex-col sm:flex-row gap-6">
					<div className="w-full sm:w-56 shrink-0 flex flex-col items-center gap-2">
						{(() => {
							const covers = game.media.filter((m) => m.kind === "cover");
							if (covers.length === 0) {
								return <div className="w-full h-72 rounded-lg bg-[var(--color-base-300)]" />;
							}
							const idx = Math.min(coverIdx, covers.length - 1);
							const cover = covers[idx];
							return (
								<>
									<div className="relative w-full h-72 flex items-start justify-center">
										<img src={mediaUrl(cover)} alt="" className="max-h-72 max-w-full w-auto h-auto object-contain rounded-lg border border-[var(--color-base-300)]" onError={(e) => (e.currentTarget.style.display = "none")} />
										{covers.length > 1 ? (
											<>
												<button type="button" onClick={() => setCoverIdx((idx - 1 + covers.length) % covers.length)} aria-label={t("metadata.prev")} className="btn btn-circle btn-xs absolute left-1 top-1/2 -translate-y-1/2 bg-black/50 border-0 text-white hover:bg-black/70">
													<ChevronLeft className="w-4 h-4" />
												</button>
												<button type="button" onClick={() => setCoverIdx((idx + 1) % covers.length)} aria-label={t("metadata.next")} className="btn btn-circle btn-xs absolute right-1 top-1/2 -translate-y-1/2 bg-black/50 border-0 text-white hover:bg-black/70">
													<ChevronRight className="w-4 h-4" />
												</button>
												<span className="badge badge-sm absolute top-2 right-2 bg-black/50 border-0 text-white">{idx + 1}/{covers.length}</span>
											</>
										) : null}
									</div>
									{cover.region ? <span className="badge badge-solid-neutral badge-sm"><RegionLabel region={cover.region} /></span> : null}
								</>
							);
						})()}
					</div>
					<div className="flex-1 min-w-0 space-y-4 text-sm">
						<div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
							<div><p className="label-text">{t("metadataGame.fields.ratings")}</p><RatingBadge rating={game.rating} /></div>
							<div><p className="label-text">{t("metadataGame.fields.publisher")}</p><p>{game.publisher || "—"}</p></div>
							<div><p className="label-text">{t("metadataGame.fields.developer")}</p><p>{game.developer || "—"}</p></div>
							<div><p className="label-text">{t("metadataGame.fields.genre")}</p><p className="text-[var(--color-base-content)]/70">{game.genre ? genreLabel(t, game.genre) : "—"}</p></div>
						</div>
						{namedRegions.length > 0 ? (
							<div>
								<p className="label-text mb-1">{t("metadataGame.regionalNames")}</p>
								<div className="space-y-1">
									{namedRegions.map((r) => (
										<p key={r.region} className="text-sm text-[var(--color-base-content)]/70 flex items-center gap-2 flex-wrap">
											<span className="badge badge-solid-neutral badge-xs"><RegionLabel region={r.region} /></span>
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
										<select value={lang} onChange={(e) => setLang(e.target.value)} className="select select-sm shrink-0 w-44" aria-label={t("common.language")}>
											{langOptions.map((l) => (
												<option key={l.code} value={l.code}>{l.native_name} ({l.name})</option>
											))}
										</select>
									) : null}
								</div>
								<p className="text-[var(--color-base-content)]/70 max-h-40 overflow-y-auto pr-2">{game.description}</p>
								{lang !== "en" && activeLang ? <p className="text-xs text-[var(--color-base-content)]/40 mt-1">{t("metadataSubmit.translatedIn", { language: activeLang.name })}</p> : null}
							</div>
						) : null}
					</div>
				</div>
			</section>

			<section className="card p-6">
				<h2 className="font-semibold mb-3">{t("metadataSubmit.mediaTitle", { count: game.media.filter((m) => m.kind !== "cover").length })}</h2>
				{game.media.filter((m) => m.kind !== "cover").length > 0 ? (
					<MediaGrid items={game.media.filter((m) => m.kind !== "cover")} url={mediaUrl} label={(k) => t(MEDIA_LABEL[k])} />
				) : (
					<p className="text-sm text-[var(--color-base-content)]/50">{t("metadataSubmit.noMedia")}</p>
				)}
			</section>

			<section className="card p-6 space-y-4">
				<div>
					<h2 className="font-semibold">{t("metadataSubmit.chooseTitle")}</h2>
					<p className="text-xs text-[var(--color-base-content)]/50">{t("metadataSubmit.chooseSubtitle")}</p>
					{pendingKeys.length > 0 ? (
						<p className="text-xs text-[var(--color-warning)] mt-1">
							{t("metadataSubmit.pendingNotice", { fields: pendingLabels.join(", ") })}
						</p>
					) : null}
				</div>

				<div>
					<p className="label-text mb-2 flex items-center gap-1.5">
						<FileText className="w-3.5 h-3.5" /> {t("metadataSubmit.textFields")}
					</p>
					<div className="flex flex-wrap gap-2">
						{TEXT_TYPES.map((item) => typeButton(item.key, t(item.label)))}
					</div>
				</div>

				<div>
					<p className="label-text mb-2 flex items-center gap-1.5">
						<ImageIcon className="w-3.5 h-3.5" /> {t("metadataSubmit.images")}
					</p>
					<div className="flex flex-wrap gap-2">
						{IMAGE_KINDS.map((k) => typeButton(k, t(MEDIA_LABEL[k])))}
					</div>
				</div>

				<div>
					<p className="label-text mb-2 flex items-center gap-1.5">
						<Clapperboard className="w-3.5 h-3.5" /> {t("metadataSubmit.video")}
					</p>
					<div className="flex flex-wrap gap-2">
						{typeButton(VIDEO_KIND, t(MEDIA_LABEL[VIDEO_KIND]))}
					</div>
					<p className="text-xs text-[var(--color-base-content)]/50 mt-1.5">
						{t("metadataSubmit.videoHint", { min: VIDEO_MIN_SECONDS, max: VIDEO_MAX_SECONDS, fpsMin: VIDEO_FPS_MIN, fpsMax: VIDEO_FPS_MAX, fps: VIDEO_FPS })}
					</p>
				</div>
			</section>

			{type ? (
				<section className="card p-6 space-y-4">
					<h2 className="font-semibold">{t("metadataSubmit.detailsTitle")}</h2>

					{isText ? (
						type === "name" || type === "release_year" ? (
							<div className="space-y-3">
								<div className="flex gap-2 flex-wrap">
									<button type="button" className={textMode === "new" ? "btn btn-primary btn-sm" : "btn btn-outline btn-sm"} onClick={() => { setTextMode("new"); setTextMoveFrom(""); }}>
										{t("metadataSubmit.form.addNewValue")}
									</button>
									<button type="button" className={textMode === "move" ? "btn btn-primary btn-sm" : "btn btn-outline btn-sm"} onClick={() => { setTextMode("move"); setTextMoveFrom(""); }} disabled={existingText.length === 0}>
										{t("metadataSubmit.form.changeRegion")}
									</button>
									<button type="button" className={textMode === "delete" ? "btn btn-error btn-sm" : "btn btn-outline btn-sm"} onClick={() => { setTextMode("delete"); setTextMoveFrom(""); }} disabled={existingText.length === 0}>
										{t("metadataSubmit.form.deleteRegion")}
									</button>
								</div>
								{textMode === "new" ? (
									<>
										<div>
											<label className="label-text flex items-center gap-1.5">{t("metadataSubmit.form.regionLabel")}{region ? <RegionFlag region={region} /> : null}</label>
											<select className="select w-full" value={region} onChange={(e) => setRegion(e.target.value)}>
												<option value="">{t("metadataSubmit.form.regionPlaceholder")}</option>
												{regions.map((r) => (
													<option key={r.id} value={r.name}>{regionLabel(t, r.name)}{regionHasData(r) ? " •" : ""}</option>
												))}
											</select>
										</div>
										<div>
											<p className="label-text">{t("metadataSubmit.form.currentField", { field: textLabel.toLowerCase() })}</p>
											<p className="text-sm text-[var(--color-base-content)]/70">
												{currentText || "—"}
												{currentText && currentRegion ? (
													<span className="ml-2 badge badge-solid-neutral badge-xs align-middle"><RegionLabel region={currentRegion} /></span>
												) : null}
											</p>
										</div>
										<div>
											<label className="label-text">{t("metadataSubmit.form.newField", { field: textLabel.toLowerCase() })}</label>
											{renderTextInput()}
										</div>
									</>
								) : textMode === "move" ? (
									<div>
										<p className="label-text mb-1">{t("metadataSubmit.form.existingByRegion")}</p>
										<div className="space-y-2">
											{existingText.map((r) => {
												const source = r.region;
												const target = textMoveFrom === source ? region : source;
												return (
													<div key={source} className="flex items-center gap-2">
														<span className="badge badge-solid-neutral badge-sm shrink-0"><RegionLabel region={source} /></span>
														<span className="text-[var(--color-base-content)]/40 shrink-0">→</span>
														<select
															className="select select-sm flex-1"
															value={target}
															onChange={(e) => {
																const v = e.target.value;
																if (v === source) {
																	setTextMoveFrom("");
																	setRegion("");
																} else {
																	setTextMoveFrom(source);
																	setRegion(v);
																	setTextValue(textValueOf(r));
																}
															}}
														>
															{regions.map((rr) => <option key={rr.id} value={rr.name}>{regionLabel(t, rr.name)}</option>)}
														</select>
													</div>
												);
											})}
										</div>
										<p className="text-xs text-[var(--color-base-content)]/50 mt-1">{t("metadataSubmit.form.moveHint")}</p>
									</div>
								) : (
									<div>
										<p className="label-text mb-1">{t("metadataSubmit.form.deleteByRegion")}</p>
										<div className="space-y-2">
											{existingText.map((r) => (
												<label key={r.region} className="flex items-center gap-2 cursor-pointer">
													<input
														type="checkbox"
														className="checkbox checkbox-sm checkbox-error"
														checked={textMoveFrom === r.region}
														onChange={(e) => setTextMoveFrom(e.target.checked ? r.region : "")}
													/>
													<span className="text-sm"><RegionLabel region={r.region} /> — {textValueOf(r)}</span>
												</label>
											))}
										</div>
										<p className="text-xs text-[var(--color-base-content)]/50 mt-1">{t("metadataSubmit.form.deleteHint")}</p>
									</div>
								)}
							</div>
						) : (
							<div className="space-y-3">
								<div>
									<p className="label-text">{t("metadataSubmit.form.currentField", { field: textLabel.toLowerCase() })}</p>
									<p className="text-sm text-[var(--color-base-content)]/70">
										{currentText || "—"}
										{currentText && currentRegion ? (
											<span className="ml-2 badge badge-solid-neutral badge-xs align-middle"><RegionLabel region={currentRegion} /></span>
										) : null}
									</p>
								</div>
								<div>
									<label className="label-text">{t("metadataSubmit.form.newField", { field: textLabel.toLowerCase() })}</label>
									{renderTextInput()}
								</div>
							</div>
						)
					) : (
						<div className="space-y-3">
							{isRegionalKind ? (
								<div className="flex gap-2 flex-wrap">
									<button type="button" className={mediaMode === "new" ? "btn btn-primary btn-sm" : "btn btn-outline btn-sm"} onClick={() => setMediaMode("new")}>
										{t("metadataSubmit.form.addNewImage")}
									</button>
									<button type="button" className={mediaMode === "move" ? "btn btn-primary btn-sm" : "btn btn-outline btn-sm"} onClick={() => setMediaMode("move")} disabled={existingMedia.length === 0}>
										{t("metadataSubmit.form.changeRegion")}
									</button>
									<button type="button" className={mediaMode === "delete" ? "btn btn-error btn-sm" : "btn btn-outline btn-sm"} onClick={() => setMediaMode("delete")} disabled={existingMedia.length === 0}>
										{t("metadataSubmit.form.deleteRegion")}
									</button>
								</div>
							) : null}
							{isRegionalKind && (mediaMode === "move" || mediaMode === "delete") ? (
								<div>
									<p className="label-text mb-1">{mediaMode === "delete" ? t("metadataSubmit.form.deleteByRegion") : t("metadataSubmit.form.existingByRegion")}</p>
									<div className="space-y-2">
										{existingMedia.map((m) => {
											const currentReg = m.region || "";
											const target = mediaMoves[m.object_key] ?? currentReg;
											return (
												<div key={m.id} className="flex items-center gap-2">
													<img src={mediaUrl(m)} alt="" className="w-12 h-12 object-contain rounded border border-[var(--color-base-300)] bg-[var(--color-base-300)]/30" onError={(e) => (e.currentTarget.style.display = "none")} />
													{mediaMode === "delete" ? (
														<label className="flex items-center gap-2 cursor-pointer flex-1">
															<input
																type="checkbox"
																className="checkbox checkbox-sm checkbox-error"
																checked={!!mediaDeletes[m.object_key]}
																onChange={(e) =>
																	setMediaDeletes((prev) => {
																		const next = { ...prev };
																		if (e.target.checked) next[m.object_key] = true;
																		else delete next[m.object_key];
																		return next;
																	})
																}
															/>
															<span className="text-sm"><RegionLabel region={currentReg} /></span>
														</label>
													) : (
														<>
															<span className="badge badge-solid-neutral badge-sm shrink-0"><RegionLabel region={currentReg} /></span>
															<span className="text-[var(--color-base-content)]/40 shrink-0">→</span>
															<select
																className="select select-sm flex-1"
																value={target}
																onChange={(e) => {
																	const v = e.target.value;
																	setMediaMoves((prev) => {
																		const next = { ...prev };
																		if (v === currentReg) delete next[m.object_key];
																		else next[m.object_key] = v;
																		return next;
																	});
																}}
															>
																{regions.map((r) => <option key={r.id} value={r.name}>{regionLabel(t, r.name)}</option>)}
															</select>
														</>
													)}
												</div>
											);
										})}
									</div>
									<p className="text-xs text-[var(--color-base-content)]/50 mt-1">{mediaMode === "delete" ? t("metadataSubmit.form.deleteHint") : t("metadataSubmit.form.moveHint")}</p>
								</div>
							) : (
								<>
							{isRegionalKind ? (
								<div>
									<label className="label-text flex items-center gap-1.5">{t("metadataSubmit.form.regionLabel")}{region ? <RegionFlag region={region} /> : null}</label>
									<select className="select w-full" value={region} onChange={(e) => setRegion(e.target.value)}>
										<option value="">{t("metadataSubmit.form.regionPlaceholder")}</option>
										{regions.map((r) => (
											<option key={r.id} value={r.name}>{regionLabel(t, r.name)}{regionHasData(r) ? " •" : ""}</option>
										))}
									</select>
								</div>
							) : null}
							{!isVideo && file && previewUrl ? (
								<div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
									<div>
										<p className="label-text mb-2">{t("metadataSubmit.form.currentMedia", { media: t(MEDIA_LABEL[currentKind]).toLowerCase(), count: currentMedia.length })}</p>
										{currentMedia.length > 0 ? (
											<div className="relative">
												<img src={mediaUrl(currentMedia[0])} alt={t(MEDIA_LABEL[currentKind])} className="w-full h-44 object-contain rounded-lg border border-[var(--color-base-300)] bg-[var(--color-base-300)]" onError={(e) => (e.currentTarget.style.display = "none")} />
												{currentMedia[0].region ? <span className="badge badge-solid-neutral badge-sm absolute bottom-1 right-1"><RegionLabel region={currentMedia[0].region} /></span> : null}
											</div>
										) : (
											<div className="w-full h-44 flex items-center justify-center rounded-lg border border-dashed border-[var(--color-base-300)] bg-[var(--color-base-300)]/30 px-2">
												<p className="text-sm text-[var(--color-base-content)]/50 text-center">{t("metadataSubmit.form.noMediaKind", { media: t(MEDIA_LABEL[currentKind]).toLowerCase() })}</p>
											</div>
										)}
									</div>
									<div>
										<p className="label-text mb-2">{t("metadataSubmit.form.newField", { field: t(MEDIA_LABEL[currentKind]).toLowerCase() })}</p>
										<img src={previewUrl} alt="" className="w-full h-44 object-contain rounded-lg border border-[var(--color-primary)] bg-[var(--color-base-300)]" />
									</div>
								</div>
							) : (
								<div>
									<p className="label-text">{t("metadataSubmit.form.currentMedia", { media: t(MEDIA_LABEL[currentKind]).toLowerCase(), count: currentMedia.length })}</p>
									{currentMedia.length > 0 ? (
										<div className="grid grid-cols-2 gap-3 mt-2">
											{currentMedia.map((m) => (
												<div key={m.id} className="relative">
													{isVideo ? (
														<video src={mediaUrl(m)} className="w-full h-44 object-contain rounded-lg border border-[var(--color-base-300)] bg-black" controls muted />
													) : (
														<img src={mediaUrl(m)} alt={t(MEDIA_LABEL[currentKind])} className="w-full h-44 object-contain rounded-lg border border-[var(--color-base-300)] bg-[var(--color-base-300)]" onError={(e) => (e.currentTarget.style.display = "none")} />
													)}
													{m.region ? <span className="badge badge-solid-neutral badge-sm absolute bottom-1 right-1"><RegionLabel region={m.region} /></span> : null}
												</div>
											))}
										</div>
									) : (
										<p className="text-sm text-[var(--color-base-content)]/50">{t("metadataSubmit.form.noMediaKind", { media: t(MEDIA_LABEL[currentKind]).toLowerCase() })}</p>
									)}
								</div>
							)}
							<p className="text-xs text-[var(--color-base-content)]/50 mt-1">{t("metadataSubmit.form.replaceMedia", { media: t(MEDIA_LABEL[currentKind]).toLowerCase() })}</p>

							<label className="btn btn-outline cursor-pointer">
								{isVideo ? <Clapperboard className="w-4 h-4" /> : <Upload className="w-4 h-4" />}
								{file ? file.name : isVideo ? t("metadataSubmit.form.chooseVideo") : t("metadataSubmit.form.chooseImage")}
								<input
									type="file"
									accept={isVideo ? VIDEO_ACCEPT : IMAGE_ACCEPT}
									className="hidden"
									disabled={busy}
									onChange={(e) => onPickFile(e.target.files?.[0] || null)}
								/>
							</label>
							{!isVideo ? (
								<p className="text-xs text-[var(--color-base-content)]/50">
									{t("metadataSubmit.form.imageHint")}
									{currentKind === "fanart" ? ` ${t("metadataSubmit.form.fanartHint")}` : currentKind === "logo" ? ` ${t("metadataSubmit.form.logoHint")}` : currentKind === "cover" ? ` ${t("metadataSubmit.form.coverHint")}` : ""}
								</p>
							) : null}
							{!isVideo && currentKind === "screenshot" ? (
								<p className="text-xs text-[var(--color-warning)] leading-relaxed">{t("metadataSubmit.form.screenshotHint")}</p>
							) : null}
							{fileError ? <p className="text-xs text-[var(--color-error)]">{fileError}</p> : null}
							{isVideo ? <p className="text-xs text-[var(--color-warning)] leading-relaxed">{t("metadataSubmit.form.videoAspectHint")}</p> : null}

							{isVideo && file && videoMeta ? (
								<div className="text-xs space-y-1 text-[var(--color-base-content)]/60">
									<div className="rounded-lg border border-[var(--color-base-300)] p-3 space-y-1 bg-[var(--color-base-300)]/30">
										<p>{t("metadataSubmit.form.resolution", { width: videoMeta.width, height: videoMeta.height, aspect: videoMeta.aspect })}</p>
										<p>{t("metadataSubmit.form.duration", { duration: videoMeta.duration.toFixed(1) })} {videoMeta.duration < VIDEO_MIN_SECONDS || videoMeta.duration > VIDEO_MAX_SECONDS ? <span className="text-[var(--color-error)]">{t("metadataSubmit.form.durationRange", { min: VIDEO_MIN_SECONDS, max: VIDEO_MAX_SECONDS })}</span> : null}</p>
										<p>{t("metadataSubmit.form.frameRate", { fps: videoMeta.fps > 0 ? `${videoMeta.fps} fps` : t("metadataSubmit.form.frameRateUnknown") })} {videoMeta.fps > 0 && videoMeta.fps < VIDEO_FPS_MIN ? <span className="text-[var(--color-error)]">				{t("metadataSubmit.form.frameRateRange", { fpsMin: VIDEO_FPS_MIN })}</span> : null}</p>
									</div>
									<video ref={videoRef} src={URL.createObjectURL(file)} controls className="w-full max-h-64 rounded-lg border border-[var(--color-base-300)] bg-black" muted />
									{fileError ? <p className="text-[var(--color-error)]">{fileError}</p> : <p className="text-[var(--color-success)]">{t("metadataSubmit.form.videoOk")}</p>}
								</div>
							) : null}
								</>
							)}
						</div>
					)}

					<div>
						<label className="label-text">
							{deleting ? t("metadataSubmit.form.whyLabelRequired") : t("metadataSubmit.form.whyLabel")}
							{deleting ? <span className="text-[var(--color-error)]"> *</span> : null}
						</label>
						<textarea className="input w-full min-h-20" value={note} onChange={(e) => setNote(e.target.value)} placeholder={t("metadataSubmit.form.whyPlaceholder")} disabled={busy} />
					</div>
				</section>
			) : null}

			{progress !== null ? (
				<div className="card p-3">
					<div className="flex justify-between text-xs mb-1">
						<span className="text-[var(--color-base-content)]/60">{isVideo ? t("metadataSubmit.uploadingVideo") : t("metadataSubmit.uploadingImage")}</span>
						<span className="text-[var(--color-base-content)]/60">{progress}%</span>
					</div>
					<progress className="progress progress-primary w-full" value={progress} max="100" />
				</div>
			) : null}

			{status ? (
				<div className="card p-3 text-sm">
					<span className={status.tone === "error" ? "text-[var(--color-error)]" : status.tone === "success" ? "text-[var(--color-success)]" : "text-[var(--color-info)]"}>{status.text}</span>
				</div>
			) : null}

			<div className="flex justify-end gap-2">
				<button className="btn btn-ghost" onClick={() => navigate(`/app/metadata/${game.system_id}/game/${game.id}`)} disabled={busy}>{t("common.cancel")}</button>
				<button className="btn btn-primary" onClick={() => setConfirmSubmit(true)} disabled={busy || (isVideo && !!fileError)}>
					{busy ? t("metadataSubmit.working") : <><Check className="w-4 h-4" /> {t("metadataSubmit.submitForReview")}</>}
				</button>
			</div>

			{confirmSubmit ? (
				<div className="fixed inset-0 z-50 bg-black/70 backdrop-blur-sm flex items-center justify-center p-4" onClick={(e) => e.target === e.currentTarget && setConfirmSubmit(false)}>
					<div className="card w-full max-w-md p-6 space-y-4">
						<div className="flex items-start gap-3">
							<div className="grid size-9 place-items-center rounded-full bg-[var(--color-warning)]/15 shrink-0">
								<AlertTriangle className="w-5 h-5 text-[var(--color-warning)]" />
							</div>
							<div className="min-w-0">
								<h2 className="text-lg font-bold">{t("metadataSubmit.confirmSubmit.title")}</h2>
								<p className="text-sm text-[var(--color-base-content)]/70 mt-1">{t("metadataSubmit.confirmSubmit.body")}</p>
							</div>
						</div>
						<div className="flex justify-end gap-2">
							<button className="btn btn-ghost" type="button" onClick={() => setConfirmSubmit(false)}>{t("common.cancel")}</button>
							<button className="btn btn-primary" type="button" disabled={busy} onClick={submit}>{t("metadataSubmit.submitForReview")}</button>
						</div>
					</div>
				</div>
			) : null}
		</div>
	);
}