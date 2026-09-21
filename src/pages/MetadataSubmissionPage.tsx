import { useEffect, useRef, useState } from "react";
import { Link, useNavigate, useParams, useSearchParams } from "react-router-dom";
import { useTranslation } from "react-i18next";
import { AlertTriangle, Check, ChevronLeft, Clapperboard, FileText, Image as ImageIcon, Upload } from "lucide-react";
import {
	cdnUrl,
	createMetadataSubmission,
	fetchMetadataGameDetail,
	fetchMetadataPendingKeys,
	requestMetadataUploadUrl,
	userToken,
	type GameDetail,
	type Language,
	type MediaKind,
} from "../lib/api";
import { RatingBadge } from "../components/Rating";
import MediaGrid from "../components/MediaGrid";
import { uploadWithProgress } from "../lib/upload";
import { ACCEPTED_ASPECTS, IMAGE_ACCEPT, MAX_DESCRIPTION_LENGTH, VIDEO_ACCEPT, VIDEO_FPS, VIDEO_FPS_MAX, VIDEO_FPS_MIN, VIDEO_MAX_SECONDS, VIDEO_MIN_SECONDS, aspectLabel, measureVideo } from "../lib/media";

const TEXT_TYPES = [
	{ key: "name", label: "metadataSubmit.textTypes.name" },
	{ key: "description", label: "metadataSubmit.textTypes.description" },
	{ key: "region", label: "metadataSubmit.textTypes.region" },
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

	const [type, setType] = useState<string>(() => {
		const t = searchParams.get("type");
		return t || "";
	});
	const [textValue, setTextValue] = useState("");
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

	const currentText = type.startsWith("name")
		? game.name
		: type === "description"
			? game.description
			: type === "region"
				? game.region
				: type === "genre"
					? game.genre
					: type === "developer"
						? game.developer
						: type === "publisher"
							? game.publisher
							: type === "release_year"
								? game.release_year ? `${game.release_year}${game.release_month ? `-${String(game.release_month).padStart(2, "0")}` : ""}` : ""
								: type === "rating"
									? game.rating ? String(game.rating) : ""
									: type === "type"
										? game.type || ""
										: "";

	const currentMedia = isText ? [] : game.media.filter((m) => m.kind === type);
	const currentKind = type as MediaKind;
	const textType = TEXT_TYPES.find((t) => t.key === type);
	const textLabel = textType ? t(textType.label) : "";
	const pendingLabels = pendingKeys.map((k) => {
		const mediaKey = MEDIA_LABEL[k as MediaKind];
		if (mediaKey) return t(mediaKey);
		const text = TEXT_TYPES.find((x) => x.key === k);
		return text ? t(text.label) : k;
	});

	// TypeButton renders a "what to submit" option, disabled when the user
	// already has a pending submission for that field/kind on this game.
	const typeButton = (key: string, label: string) => {
		const pending = pendingKeys.includes(key);
		return (
			<button
				key={key}
				type="button"
				disabled={pending}
				title={pending ? t("metadataSubmit.pendingTitle") : undefined}
				onClick={() => {
					if (pending) return;
					setType(key);
					setTextValue("");
					setFile(null);
					setFileError(null);
				}}
				className={`btn btn-sm ${type === key ? "btn-primary" : "btn-outline"} ${pending ? "opacity-50 cursor-not-allowed" : ""}`}
			>
				{label}
				{pending ? t("metadataSubmit.pendingSuffix") : ""}
			</button>
		);
	};

	async function submit() {
		setConfirmSubmit(false);
		if (!game) return;
		if (!type) {
			setStatus({ text: t("metadataSubmit.status.pickType"), tone: "error" });
			return;
		}
		if (isText && !textValue.trim()) {
			setStatus({ text: t("metadataSubmit.status.enterValue"), tone: "error" });
			return;
		}
		if (isText && textType?.key === "release_year") {
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
		if (isText && textType?.key === "rating") {
			const r = Number(textValue.trim());
			if (!Number.isInteger(r) || r < 1 || r > 10) {
				setStatus({ text: t("metadataSubmit.status.invalidRating"), tone: "error" });
				return;
			}
		}
		if (isText && textType?.key === "type") {
			if (!(GAME_TYPES as readonly string[]).includes(textValue.trim())) {
				setStatus({ text: t("metadataSubmit.status.invalidGameType"), tone: "error" });
				return;
			}
		}
		if (isText && textType?.key === "description" && textValue.trim().length > MAX_DESCRIPTION_LENGTH) {
			setStatus({ text: t("metadataSubmit.status.descriptionTooLong", { max: MAX_DESCRIPTION_LENGTH }), tone: "error" });
			return;
		}
		if (!isText && !file) {
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
				if (textType.key === "release_year") {
					const [ys, ms] = textValue.trim().split("-");
					payload.release_year = Number(ys);
					if (ms) payload.release_month = Number(ms);
				} else if (textType.key === "rating") {
					payload.rating = Number(textValue.trim());
				} else {
					payload[textType.key] = textValue.trim();
				}
			}

			if (isText) {
				await createMetadataSubmission({ game_id: game.id, payload });
			} else {
				// Presign to the canonical key, upload with progress, then record.
				const mime = file!.type || "application/octet-stream";
				setStatus({ text: isVideo ? t("metadataSubmit.uploadingVideo") : t("metadataSubmit.uploadingImage"), tone: "info" });
				const resp = await requestMetadataUploadUrl({
					game_id: game.id,
					kind: currentKind,
					file_name: file!.name,
					mime_type: mime,
					size: file!.size,
				});
				await uploadWithProgress(resp.upload_url, file!, mime, (p) => setProgress(Math.round(p * 100)));
				setProgress(100);
				await createMetadataSubmission({
					game_id: game.id,
					payload,
					files: [{ kind: currentKind, object_key: resp.object_key, file_name: file!.name, mime_type: mime, size: file!.size }],
				});
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
						<span className={`badge badge-sm shrink-0 ${game.type === "hack" ? "badge-warning" : game.type === "homebrew" ? "badge-info" : "badge-ghost"}`}>{game.type || "base"}</span>
					</p>
				</div>
			</div>

			<section className="card p-6">
				<div className="flex flex-col sm:flex-row gap-6">
					<div className="w-full sm:w-56 shrink-0 h-72 flex items-start justify-center">
						{(() => {
							const cover = game.media.find((m) => m.kind === "cover");
							return cover ? (
								<img src={mediaUrl(cover)} alt="" className="max-h-72 max-w-full w-auto h-auto object-contain rounded-lg border border-[var(--color-base-300)]" onError={(e) => (e.currentTarget.style.display = "none")} />
							) : (
								<div className="w-full h-full rounded-lg bg-[var(--color-base-300)]" />
							);
						})()}
					</div>
					<div className="flex-1 min-w-0 space-y-4 text-sm">
						<div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-4">
							<div><p className="label-text">{t("metadataGame.fields.ratings")}</p><RatingBadge rating={game.rating} /></div>
							<div><p className="label-text">{t("metadataGame.fields.release")}</p><p>{game.release_year ? `${game.release_year}${game.release_month ? `-${String(game.release_month).padStart(2, "0")}` : ""}` : "—"}</p></div>
							<div><p className="label-text">{t("metadataGame.fields.region")}</p><p>{game.region || "—"}</p></div>
							<div><p className="label-text">{t("metadataGame.fields.publisher")}</p><p>{game.publisher || "—"}</p></div>
							<div><p className="label-text">{t("metadataGame.fields.developer")}</p><p>{game.developer || "—"}</p></div>
						</div>
						<div><p className="label-text">{t("metadataGame.fields.genre")}</p><p className="text-[var(--color-base-content)]/70">{game.genre || "—"}</p></div>
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
							<p className="text-[var(--color-base-content)]/70 max-h-40 overflow-y-auto pr-2">{game.description || "—"}</p>
							{lang !== "en" && activeLang ? <p className="text-xs text-[var(--color-base-content)]/40 mt-1">{t("metadataSubmit.translatedIn", { language: activeLang.name })}</p> : null}
						</div>
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
						<div className="space-y-3">
							<div>
								<p className="label-text">{t("metadataSubmit.form.currentField", { field: textLabel.toLowerCase() })}</p>
								<p className="text-sm text-[var(--color-base-content)]/70">{currentText || "—"}</p>
							</div>
							<div>
								<label className="label-text">{t("metadataSubmit.form.newField", { field: textLabel.toLowerCase() })}</label>
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
											{GAME_TYPES.map((t) => (
												<option key={t} value={t}>{t}</option>
											))}
										</select>
										<p className="text-xs text-[var(--color-base-content)]/50 mt-1">{t("metadataSubmit.form.typeHint")}</p>
									</>
								) : (
									<input className="input w-full" value={textValue} onChange={(e) => setTextValue(e.target.value)} placeholder={t("metadataSubmit.form.newFieldPlaceholder", { field: textLabel.toLowerCase() })} />
								)}
							</div>
						</div>
					) : (
						<div className="space-y-3">
							{!isVideo && file && previewUrl ? (
								<div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
									<div>
										<p className="label-text mb-2">{t("metadataSubmit.form.currentMedia", { media: t(MEDIA_LABEL[currentKind]).toLowerCase(), count: currentMedia.length })}</p>
										{currentMedia.length > 0 ? (
											<img src={mediaUrl(currentMedia[0])} alt={t(MEDIA_LABEL[currentKind])} className="w-full h-44 object-contain rounded-lg border border-[var(--color-base-300)] bg-[var(--color-base-300)]" onError={(e) => (e.currentTarget.style.display = "none")} />
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
											{currentMedia.map((m) =>
												isVideo ? (
													<video key={m.id} src={mediaUrl(m)} className="w-full h-44 object-contain rounded-lg border border-[var(--color-base-300)] bg-black" controls muted />
												) : (
													<img key={m.id} src={mediaUrl(m)} alt={t(MEDIA_LABEL[currentKind])} className="w-full h-44 object-contain rounded-lg border border-[var(--color-base-300)] bg-[var(--color-base-300)]" onError={(e) => (e.currentTarget.style.display = "none")} />
												),
											)}
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
						</div>
					)}

					<div>
						<label className="label-text">{t("metadataSubmit.form.whyLabel")}</label>
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