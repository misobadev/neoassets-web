import { useEffect, useRef, useState } from "react";
import { Link, useNavigate, useParams, useSearchParams } from "react-router-dom";
import { useTranslation } from "react-i18next";
import { AlertTriangle, Check, ChevronLeft, ChevronRight, Clapperboard, Copy, FileText, HardDrive, Image as ImageIcon, Trash2, Upload } from "lucide-react";
import {
	cdnUrl,
	createMetadataSubmission,
	fetchGenres,
	fetchMetadataGameDetail,
	fetchMetadataPendingKeys,
	fetchRegions,
	requestMetadataUploadUrl,
	isAuthed,
	type GameDetail,
	type GameRegion,
	type Genre,
	type Language,
	type MediaKind,
	type Region,
} from "../lib/api";
import { RatingBadge } from "../components/Rating";
import MediaGrid from "../components/MediaGrid";
import Pagination from "../components/Pagination";
import { genreLabel } from "../lib/genres";
import { regionLabel } from "../lib/regions";
import RegionLabel from "../components/RegionLabel";
import { uploadWithProgress } from "../lib/upload";
import { hashRomFile } from "../lib/romhash";
import { GAME_TYPES, typeBadgeClass } from "../lib/gameTypes";
import { IMAGE_ACCEPT, MAX_DESCRIPTION_LENGTH, VIDEO_ACCEPT, VIDEO_FPS, VIDEO_FPS_MAX, VIDEO_FPS_MIN, VIDEO_MAX_SECONDS, VIDEO_MIN_SECONDS, aspectLabel, checkVideoMeasurement, measureVideo } from "../lib/media";

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
// ROMS_KIND is a pseudo-type that opens the ROM dump editor instead of a field.
const ROMS_KIND = "roms";

function mediaUrl(m: { object_key: string; created_at?: string }): string {
	const url = cdnUrl(m.object_key);
	return m.created_at ? `${url}?v=${encodeURIComponent(m.created_at)}` : url;
}

// fmtBytes renders a byte count as a short human-readable size.
function fmtBytes(bytes: number): string {
	if (bytes >= 1024 * 1024 * 1024) return `${(bytes / (1024 * 1024 * 1024)).toFixed(1)} GB`;
	if (bytes >= 1024 * 1024) return `${(bytes / (1024 * 1024)).toFixed(0)} MB`;
	if (bytes >= 1024) return `${(bytes / 1024).toFixed(0)} KB`;
	return `${bytes} B`;
}

// parseYearMonth parses a "YYYY" or "YYYY-MM" release value.
function parseYearMonth(v: string): { year: number; month?: number } | null {
	const [ys, ms] = v.split("-");
	const year = Number(ys);
	if (!Number.isInteger(year) || year < 0 || year > 10000) return null;
	if (ms !== undefined && ms !== "") {
		const month = Number(ms);
		if (!Number.isInteger(month) || month < 1 || month > 12) return null;
		return { year, month };
	}
	return { year };
}

interface Draft {
	type: string;
	textValue: string;
	note: string;
}

// One multi-region text change: set a region's value, move it from another
// region, or delete it.
interface RegionTextRow {
	key: string;
	action: "set" | "move" | "delete";
	region: string;
	value: string;
	fromRegion: string;
}

// One multi-region media change: upload a new asset for a region, move an
// existing one from another region, or delete it.
interface RegionMediaRow {
	key: string;
	action: "new" | "move" | "delete";
	region: string;
	fromRegion: string;
	file: File | null;
}

// World is the default region: a row always targets a region, so the region
// select never has an empty placeholder.
const DEFAULT_REGION = "World";

let rowSeq = 0;
const nextRowKey = () => `row-${++rowSeq}`;
const newTextRow = (): RegionTextRow => ({ key: nextRowKey(), action: "set", region: DEFAULT_REGION, value: "", fromRegion: "" });
const newMediaRow = (): RegionMediaRow => ({ key: nextRowKey(), action: "new", region: DEFAULT_REGION, fromRegion: "", file: null });

// One ROM dump change: add a new dump, edit an existing one, or delete it.
interface RomRow {
	key: string;
	action: "add" | "edit" | "delete";
	id: string;
	name: string;
	size: string;
	region: string;
	crc: string;
	md5: string;
	sha1: string;
	sha256: string;
	hashing?: boolean;
	duplicate?: boolean;
}
const newRomRow = (): RomRow => ({ key: nextRowKey(), action: "add", id: "", name: "", size: "", region: DEFAULT_REGION, crc: "", md5: "", sha1: "", sha256: "" });

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
	// Multi-region changes: name/release use textRows, cover/logo use mediaRows.
	// Each row sets, moves or deletes one region's value in a single submission.
	const [textRows, setTextRows] = useState<RegionTextRow[]>([newTextRow()]);
	const [mediaRows, setMediaRows] = useState<RegionMediaRow[]>([newMediaRow()]);
	const [romRows, setRomRows] = useState<RomRow[]>([newRomRow()]);
	const [romPage, setRomPage] = useState(1);
	const [note, setNote] = useState("");
	const [file, setFile] = useState<File | null>(null);
	const [previewUrl, setPreviewUrl] = useState<string | null>(null);
	const [videoMeta, setVideoMeta] = useState<{ duration: number; width: number; height: number; fps: number; aspect: string } | null>(null);
	const [fileError, setFileError] = useState<string | null>(null);
	const [fpsWarning, setFpsWarning] = useState<string | null>(null);
	const [status, setStatus] = useState<{ text: string; tone: string } | null>(null);
	const [busy, setBusy] = useState(false);
	const [confirmSubmit, setConfirmSubmit] = useState(false);
	const [progress, setProgress] = useState<number | null>(null);
	const [pendingKeys, setPendingKeys] = useState<string[]>([]);
	// Duplicate report: the link to the game that should be kept and the reason.
	// dupDone flips the modal to its success view (message + close only).
	const [dupOpen, setDupOpen] = useState(false);
	const [dupDone, setDupDone] = useState(false);
	const [dupLink, setDupLink] = useState("");
	const [dupNote, setDupNote] = useState("");
	const [dupBusy, setDupBusy] = useState(false);
	const [dupStatus, setDupStatus] = useState<{ text: string; tone: string } | null>(null);
	const videoRef = useRef<HTMLVideoElement | null>(null);

	const isText = TEXT_TYPES.some((t) => t.key === type);
	const isVideo = type === VIDEO_KIND;
	const isRoms = type === ROMS_KIND;

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
		if (!gameId || !isAuthed()) return;
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
			setFpsWarning(null);
			return;
		}
		// Load the video to validate format / duration / dimensions before upload.
		// FPS is only a warning (the browser measurement is unreliable; the server
		// validates it authoritatively on submit). Aspect ratio is not restricted.
		let cancelled = false;
		measureVideo(file)
			.then((m) => {
				if (cancelled) return;
				const { errors, warnings } = checkVideoMeasurement(file.name, m);
				setVideoMeta({ ...m, aspect: aspectLabel(m.width, m.height) });
				setFileError(errors.length ? errors.map((e) => t(e.key, e.params)).join(" ") : null);
				setFpsWarning(warnings.length ? warnings.map((e) => t(e.key, e.params)).join(" ") : null);
			})
			.catch(() => {
				if (cancelled) return;
				setFileError(t("metadataSubmit.errors.readVideo"));
				setFpsWarning(null);
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
	// Per-region data, so a row can show the region's current value.
	const regionMap = new Map((game.regions || []).map((r) => [r.region, r]));

	function regionRelease(gr?: { release_year?: number | null; release_month?: number | null }): string {
		if (!gr?.release_year) return "";
		return `${gr.release_year}${gr.release_month ? `-${String(gr.release_month).padStart(2, "0")}` : ""}`;
	}

	const currentText =
		type === "name"
			? game.name
			: type === "description"
				? game.description
				: type === "genre"
					? genreLabel(t, game.genre)
					: type === "developer"
						? game.developer
						: type === "publisher"
							? game.publisher
							: type === "release_year"
								? regionRelease(game)
								: type === "rating"
									? game.rating ? String(game.rating) : ""
									: type === "type"
										? game.type || ""
										: "";

	const currentMedia = isText ? [] : game.media.filter((m) => m.kind === currentKind);

	// Which region already holds data for the field/kind being submitted.
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

	// ROM dump list pagination (15 per page, controls above and below).
	const romList = game.roms || [];
	const ROM_PAGE_SIZE = 15;
	const romTotalPages = Math.max(1, Math.ceil(romList.length / ROM_PAGE_SIZE));
	const romPageClamped = Math.min(romPage, romTotalPages);
	const romPageItems = romList.slice((romPageClamped - 1) * ROM_PAGE_SIZE, romPageClamped * ROM_PAGE_SIZE);

	// Deleting requires a reason, so the "why" is mandatory in that case.
	const deleting =
		(isText && textRows.some((r) => r.action === "delete" && r.region !== "")) ||
		(!isText && isRegionalKind && mediaRows.some((r) => r.action === "delete" && r.region !== ""));

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
			case "roms": return (game.roms || []).length > 0;
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

	function updateTextRow(key: string, patch: Partial<RegionTextRow>) {
		setTextRows((rows) => rows.map((r) => (r.key === key ? { ...r, ...patch } : r)));
	}
	function removeTextRow(key: string) {
		setTextRows((rows) => (rows.length > 1 ? rows.filter((r) => r.key !== key) : rows));
	}
	function updateMediaRow(key: string, patch: Partial<RegionMediaRow>) {
		setMediaRows((rows) => rows.map((r) => (r.key === key ? { ...r, ...patch } : r)));
	}
	function removeMediaRow(key: string) {
		setMediaRows((rows) => (rows.length > 1 ? rows.filter((r) => r.key !== key) : rows));
	}
	function updateRomRow(key: string, patch: Partial<RomRow>) {
		setRomRows((rows) => rows.map((r) => (r.key === key ? { ...r, ...patch } : r)));
	}
	function removeRomRow(key: string) {
		setRomRows((rows) => (rows.length > 1 ? rows.filter((r) => r.key !== key) : rows));
	}
	// onPickRomFile hashes the dropped/selected ROM in the browser and fills the
	// row's name, size and hashes so they never have to be typed by hand. If any
	// hash already belongs to another dump of this game it is flagged.
	async function onPickRomFile(key: string, file: File) {
		// Arcade ROM sets are archives (ZIP/RAR/7z) contributed by name only, so
		// no size or hashes are computed for them.
		const isArchive =
			/\.(zip|rar|7z)$/i.test(file.name) ||
			["application/zip", "application/x-zip-compressed", "application/x-rar-compressed", "application/vnd.rar", "application/x-7z-compressed"].includes(file.type);
		if (isArchive) {
			updateRomRow(key, { hashing: false, duplicate: false, name: file.name, size: "", crc: "", md5: "", sha1: "", sha256: "" });
			setStatus({ text: t("metadataSubmit.form.romZipNote"), tone: "info" });
			return;
		}
		updateRomRow(key, { hashing: true });
		try {
			const h = await hashRomFile(file);
			const row = romRows.find((r) => r.key === key);
			const duplicate = (game?.roms || []).some((r) => {
				if (row?.id && r.id === row.id) return false;
				return (
					(h.crc && r.crc === h.crc) ||
					(h.md5 && r.md5 === h.md5) ||
					(h.sha1 && r.sha1 === h.sha1) ||
					(h.sha256 && r.sha256 === h.sha256)
				);
			});
			updateRomRow(key, { hashing: false, duplicate, name: h.name, size: String(h.size), crc: h.crc, md5: h.md5, sha1: h.sha1, sha256: h.sha256 });
			if (duplicate) setStatus({ text: t("metadataSubmit.form.romDuplicate"), tone: "error" });
		} catch {
			updateRomRow(key, { hashing: false });
			setStatus({ text: t("metadataSubmit.form.romHashFailed"), tone: "error" });
		}
	}

	async function submit() {
		setConfirmSubmit(false);
		if (!game) return;
		if (!type) {
			setStatus({ text: t("metadataSubmit.status.pickType"), tone: "error" });
			return;
		}
		// Removing content must always explain why.
		if (deleting && !note.trim()) {
			setStatus({ text: t("metadataSubmit.status.deleteReason"), tone: "error" });
			return;
		}
		const regionalText = isText && (type === "name" || type === "release_year");
		if (regionalText) {
			const rows = textRows.filter((r) => r.region);
			if (rows.length === 0) {
				setStatus({ text: t("metadataSubmit.status.enterValue"), tone: "error" });
				return;
			}
			for (const r of rows) {
				if (r.action === "move" && (!r.fromRegion || r.fromRegion === r.region)) {
					setStatus({ text: t("metadataSubmit.status.pickMoveRegion"), tone: "error" });
					return;
				}
				if (r.action === "set") {
					if (!r.value.trim()) {
						setStatus({ text: t("metadataSubmit.status.enterValue"), tone: "error" });
						return;
					}
					if (type === "release_year" && !parseYearMonth(r.value.trim())) {
						setStatus({ text: t("metadataSubmit.status.invalidYear"), tone: "error" });
						return;
					}
				}
			}
		} else if (isText) {
			if (!textValue.trim()) {
				setStatus({ text: t("metadataSubmit.status.enterValue"), tone: "error" });
				return;
			}
			if (textType?.key === "release_year" && !parseYearMonth(textValue.trim())) {
				setStatus({ text: t("metadataSubmit.status.invalidYear"), tone: "error" });
				return;
			}
			if (textType?.key === "rating") {
				const r = Number(textValue.trim());
				if (!Number.isInteger(r) || r < 1 || r > 10) {
					setStatus({ text: t("metadataSubmit.status.invalidRating"), tone: "error" });
					return;
				}
			}
			if (textType?.key === "type" && !(GAME_TYPES as readonly string[]).includes(textValue.trim())) {
				setStatus({ text: t("metadataSubmit.status.invalidGameType"), tone: "error" });
				return;
			}
			if (textType?.key === "description" && textValue.trim().length > MAX_DESCRIPTION_LENGTH) {
				setStatus({ text: t("metadataSubmit.status.descriptionTooLong", { max: MAX_DESCRIPTION_LENGTH }), tone: "error" });
				return;
			}
		}
		if (isRoms) {
			const complete = romRows.filter((r) => (r.action === "delete" ? r.id !== "" : r.name.trim() !== ""));
			if (complete.length === 0) {
				setStatus({ text: t("metadataSubmit.status.enterValue"), tone: "error" });
				return;
			}
			if (complete.some((r) => r.duplicate)) {
				setStatus({ text: t("metadataSubmit.form.romDuplicate"), tone: "error" });
				return;
			}
		}
		if (!isText && !isRoms && isRegionalKind) {
			const rows = mediaRows.filter((r) => r.region || r.file);
			if (rows.length === 0) {
				setStatus({ text: t("metadataSubmit.status.pickImage"), tone: "error" });
				return;
			}
			for (const r of rows) {
				if (r.action === "new" && (!r.region || !r.file)) {
					setStatus({ text: t("metadataSubmit.status.pickImage"), tone: "error" });
					return;
				}
				if (r.action === "move" && (!r.region || !r.fromRegion || r.fromRegion === r.region)) {
					setStatus({ text: t("metadataSubmit.status.pickMoveRegion"), tone: "error" });
					return;
				}
				if (r.action === "delete" && !r.region) {
					setStatus({ text: t("metadataSubmit.status.pickDelete"), tone: "error" });
					return;
				}
			}
		}
		if (!isText && !isRoms && !isRegionalKind && !file) {
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
			if (regionalText) {
				// One entry per region: set, move (from another region) or delete.
				payload.regions = textRows
					.filter((r) => r.region)
					.map((r) => {
						const entry: Record<string, unknown> = { region: r.region };
						if (r.action === "delete") {
							if (type === "name") entry.delete_name = true;
							else entry.delete_release = true;
						} else if (r.action === "move") {
							const gr = regionMap.get(r.fromRegion);
							if (type === "name") {
								entry.name = gr ? textValueOf(gr) : "";
								entry.name_from = r.fromRegion;
							} else {
								const [ys, ms] = (gr ? regionRelease(gr) : "").split("-");
								if (ys) entry.release_year = Number(ys);
								if (ms) entry.release_month = Number(ms);
								entry.release_from = r.fromRegion;
							}
						} else if (type === "name") {
							entry.name = r.value.trim();
						} else {
							const ym = parseYearMonth(r.value.trim());
							if (ym) {
								entry.release_year = ym.year;
								if (ym.month) entry.release_month = ym.month;
							}
						}
						return entry;
					});
			} else if (isText && textType) {
				if (textType.key === "release_year") {
					const ym = parseYearMonth(textValue.trim());
					if (ym) {
						payload.release_year = ym.year;
						if (ym.month) payload.release_month = ym.month;
					}
				} else if (textType.key === "rating") {
					payload.rating = Number(textValue.trim());
				} else {
					payload[textType.key] = textValue.trim();
				}
			} else if (isRoms) {
				payload.roms = romRows
					.filter((r) => (r.action === "delete" ? r.id !== "" : r.name.trim() !== ""))
					.map((r) => {
						const entry: Record<string, unknown> = { action: r.action };
						if (r.action !== "add") entry.id = r.id;
						if (r.action !== "delete") {
							entry.name = r.name.trim();
							entry.size = r.size ? Number(r.size) : 0;
							entry.crc = r.crc.trim().toLowerCase();
							entry.md5 = r.md5.trim().toLowerCase();
							entry.sha1 = r.sha1.trim().toLowerCase();
							entry.sha256 = r.sha256.trim().toLowerCase();
							entry.region = r.region;
						}
						return entry;
					});
			}

			if (isText || isRoms) {
				await createMetadataSubmission({ game_id: game.id, payload });
			} else {
				const files: { kind: MediaKind; object_key: string; file_name: string; mime_type: string; size: number; region: string; delete?: boolean; move?: boolean }[] = [];
				if (isRegionalKind) {
					// One entry per region: new upload, move (from another region)
					// or delete. A submission replaces the media of that region.
					for (const r of mediaRows) {
						if (!r.region && !r.file) continue;
						if (r.action === "delete") {
							const m = existingMedia.find((x) => (x.region || "") === r.region);
							if (m) {
								const fileName = m.object_key.split("/").pop() || m.object_key;
								files.push({ kind: currentKind, object_key: m.object_key, file_name: fileName, mime_type: m.mime, size: m.size, region: r.region, delete: true });
							}
						} else if (r.action === "move") {
							const m = existingMedia.find((x) => (x.region || "") === r.fromRegion);
							if (m) {
								const fileName = m.object_key.split("/").pop() || m.object_key;
								files.push({ kind: currentKind, object_key: m.object_key, file_name: fileName, mime_type: m.mime, size: m.size, region: r.region, move: true });
							}
						} else if (r.file) {
							const mime = r.file.type || "application/octet-stream";
							setStatus({ text: t("metadataSubmit.uploadingImage"), tone: "info" });
							const resp = await requestMetadataUploadUrl({ game_id: game.id, kind: currentKind, file_name: r.file.name, mime_type: mime, size: r.file.size, region: r.region });
							await uploadWithProgress(resp.upload_url, r.file, mime, (p) => setProgress(Math.round(p * 100)));
							setProgress(100);
							files.push({ kind: currentKind, object_key: resp.object_key, file_name: r.file.name, mime_type: mime, size: r.file.size, region: r.region });
						}
					}
				} else if (file) {
					const mime = file.type || "application/octet-stream";
					setStatus({ text: isVideo ? t("metadataSubmit.uploadingVideo") : t("metadataSubmit.uploadingImage"), tone: "info" });
					const resp = await requestMetadataUploadUrl({
						game_id: game.id,
						kind: currentKind,
						file_name: file.name,
						mime_type: mime,
						size: file.size,
						region: "",
					});
					await uploadWithProgress(resp.upload_url, file, mime, (p) => setProgress(Math.round(p * 100)));
					setProgress(100);
					files.push({ kind: currentKind, object_key: resp.object_key, file_name: file.name, mime_type: mime, size: file.size, region: "" });
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

	// submitDuplicate files a deletion request for a game the user believes is a
	// duplicate. It goes to the review queue like any other contribution and
	// carries the link to the game that should be kept plus a mandatory reason.
	async function submitDuplicate() {
		if (!game) return;
		if (!dupLink.trim()) {
			setDupStatus({ text: t("metadataSubmit.duplicate.linkRequired"), tone: "error" });
			return;
		}
		if (!dupNote.trim()) {
			setDupStatus({ text: t("metadataSubmit.duplicate.noteRequired"), tone: "error" });
			return;
		}
		setDupBusy(true);
		setDupStatus({ text: t("metadataSubmit.duplicate.sending"), tone: "info" });
		try {
			await createMetadataSubmission({
				game_id: game.id,
				payload: { delete_game: true, duplicate_of: dupLink.trim(), note: dupNote.trim() },
			});
			setDupLink("");
			setDupNote("");
			setDupStatus(null);
			setDupDone(true);
		} catch (e) {
			setDupStatus({ text: (e as Error).message, tone: "error" });
		} finally {
			setDupBusy(false);
		}
	}

	// closeDuplicate resets the duplicate report modal so it opens clean next time.
	function closeDuplicate() {
		setDupOpen(false);
		setDupDone(false);
		setDupStatus(null);
		setDupLink("");
		setDupNote("");
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
						<span className={`badge badge-sm shrink-0 ${typeBadgeClass(game.type)}`}>{t("metadata.type." + (game.type || "base"))}</span>
					</p>
				</div>
				{/* Game-level action: report this game as a duplicate of another one.
				    Kept in the header so it does not mix with the field/media form. */}
				<button
					type="button"
					onClick={() => { setDupStatus(null); setDupDone(false); setDupOpen(true); }}
					className="btn btn-sm ml-auto shrink-0 border border-[var(--color-error)]/40 text-[var(--color-error)] hover:bg-[var(--color-error)]/10"
				>
					<Copy className="w-4 h-4" />
					{t("metadataSubmit.duplicate.title")}
				</button>
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

				<div>
					<p className="label-text mb-2 flex items-center gap-1.5">
						<HardDrive className="w-3.5 h-3.5" /> {t("metadataSubmit.form.roms")}
					</p>
					<div className="flex flex-wrap gap-2">
						{typeButton(ROMS_KIND, t("metadataSubmit.form.roms"))}
					</div>
					<p className="text-xs text-[var(--color-base-content)]/50 mt-1.5">{t("metadataSubmit.form.romHint")}</p>
				</div>
			</section>

			{type ? (
				<section className="card p-6 space-y-4">
					<h2 className="font-semibold">{t("metadataSubmit.detailsTitle")}</h2>

					{isRoms ? (
						<div className="space-y-3">
							<div className="space-y-2">
								{romRows.map((row) => (
									<div key={row.key} className="relative rounded-lg border border-[var(--color-base-300)] p-3 pr-10 space-y-2">
										{romRows.length > 1 ? (
											<button type="button" className="btn btn-ghost btn-xs absolute top-2 right-2" onClick={() => removeRomRow(row.key)} aria-label={t("common.delete")}>
												<Trash2 className="w-3.5 h-3.5" />
											</button>
										) : null}
										<div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
											<div>
												<label className="label-text">{t("metadataSubmit.form.actionLabel")}</label>
												<select className="select select-sm w-full" value={row.action} onChange={(e) => updateRomRow(row.key, { action: e.target.value as RomRow["action"] })}>
													<option value="add">{t("common.add")}</option>
													<option value="edit" disabled={!game.roms || game.roms.length === 0}>{t("common.edit")}</option>
													<option value="delete" disabled={!game.roms || game.roms.length === 0}>{t("common.delete")}</option>
												</select>
											</div>
											<div>
												<label className="label-text">{t("metadataSubmit.form.regionLabel")}</label>
												<select className="select select-sm w-full" value={row.region} onChange={(e) => updateRomRow(row.key, { region: e.target.value })}>
													{regions.map((r) => (
														<option key={r.id} value={r.name}>{regionLabel(t, r.name)}</option>
													))}
												</select>
											</div>
										</div>
										{row.action !== "add" ? (
											<div>
												<label className="label-text">{t("metadataSubmit.form.romPick")}</label>
												<select
													className="select select-sm w-full"
													value={row.id}
													onChange={(e) => {
														const id = e.target.value;
														const rom = (game.roms || []).find((x) => x.id === id);
														if (rom) {
															updateRomRow(row.key, { id, name: rom.name, size: rom.size ? String(rom.size) : "", region: rom.region || DEFAULT_REGION, crc: rom.crc || "", md5: rom.md5 || "", sha1: rom.sha1 || "", sha256: rom.sha256 || "" });
														} else {
															updateRomRow(row.key, { id: "" });
														}
													}}
												>
													<option value="">—</option>
													{(game.roms || []).map((r) => <option key={r.id} value={r.id}>{r.name}</option>)}
												</select>
											</div>
										) : null}
										{row.action !== "delete" ? (
											<>
											<label
												className={`flex flex-col items-center justify-center gap-2 rounded-xl border-2 border-dashed border-[var(--color-base-300)] px-4 py-10 text-sm text-[var(--color-base-content)]/60 cursor-pointer text-center transition-colors hover:border-[var(--color-primary)]/50 hover:bg-[var(--color-primary)]/5 ${row.hashing ? "opacity-60" : ""}`}
												onDragOver={(e) => e.preventDefault()}
												onDrop={(e) => {
													e.preventDefault();
													const f = e.dataTransfer.files?.[0];
													if (f) void onPickRomFile(row.key, f);
												}}
											>
												<Upload className="w-8 h-8" />
												<span className="max-w-md">{row.hashing ? t("metadataSubmit.form.romHashing") : t("metadataSubmit.form.romDrop")}</span>
												<input
													type="file"
													className="hidden"
													disabled={busy || row.hashing}
													onChange={(e) => {
														const f = e.target.files?.[0] || null;
														if (f) void onPickRomFile(row.key, f);
														e.target.value = "";
													}}
												/>
											</label>
											<div>
												<label className="label-text">{t("common.name")}</label>
												<input className="input input-sm w-full" value={row.name} onChange={(e) => updateRomRow(row.key, { name: e.target.value })} />
											</div>
											<div className="grid grid-cols-1 sm:grid-cols-2 gap-x-4 gap-y-1.5 text-xs">
												<div className="flex items-baseline gap-2 min-w-0"><span className="label-text shrink-0">{t("common.size")}</span><span className="font-mono truncate">{row.size ? fmtBytes(Number(row.size)) : "—"}</span></div>
												<div className="flex items-baseline gap-2 min-w-0"><span className="label-text shrink-0">CRC</span><span className="font-mono truncate">{row.crc || "—"}</span></div>
												<div className="flex items-baseline gap-2 min-w-0"><span className="label-text shrink-0">MD5</span><span className="font-mono truncate">{row.md5 || "—"}</span></div>
												<div className="flex items-baseline gap-2 min-w-0"><span className="label-text shrink-0">SHA1</span><span className="font-mono truncate">{row.sha1 || "—"}</span></div>
												<div className="flex items-baseline gap-2 min-w-0 sm:col-span-2"><span className="label-text shrink-0">SHA256</span><span className="font-mono truncate">{row.sha256 || "—"}</span></div>
											</div>
											{row.duplicate ? <p className="text-xs text-[var(--color-error)]">{t("metadataSubmit.form.romDuplicate")}</p> : null}
											</>
										) : null}
									</div>
								))}
							</div>
							<button type="button" className="btn btn-outline btn-sm w-fit" onClick={() => setRomRows((rows) => [...rows, newRomRow()])}>
								{t("metadataSubmit.form.addRom")}
							</button>
							<p className="text-xs text-[var(--color-base-content)]/50">{t("metadataSubmit.form.romHint")}</p>
							<p className="text-xs text-[var(--color-base-content)]/50">{t("metadataSubmit.form.romZipNote")}</p>

							{romList.length > 0 ? (
								<div className="space-y-3 border-t border-[var(--color-base-300)] pt-4">
									<p className="label-text">{t("metadataGame.romDumpsTitle", { count: romList.length })}</p>
									<Pagination page={romPageClamped} totalPages={romTotalPages} onChange={setRomPage} />
									<div className="space-y-1.5">
										{romPageItems.map((r) => (
											<div key={r.id} className="text-sm text-[var(--color-base-content)]/70 flex items-center gap-2 flex-wrap">
												<span className="font-medium">{r.name}</span>
												{r.region ? <RegionLabel region={r.region} /> : null}
												{r.size ? <span className="text-[var(--color-base-content)]/50">{fmtBytes(r.size)}</span> : null}
												{r.sha1 ? <span className="font-mono text-[11px] text-[var(--color-base-content)]/40 break-all">SHA1 {r.sha1}</span> : null}
											</div>
										))}
									</div>
									<Pagination page={romPageClamped} totalPages={romTotalPages} onChange={setRomPage} />
								</div>
							) : null}
						</div>
					) : isText ? (
						type === "name" || type === "release_year" ? (
							<div className="space-y-3">
								{existingText.length > 0 ? (
									<div>
										<p className="label-text mb-1">{t("metadataSubmit.form.existingByRegion")}</p>
										<div className="space-y-1">
											{existingText.map((r) => (
												<p key={r.region} className="text-sm text-[var(--color-base-content)]/70 flex items-center gap-2">
													<span className="badge badge-solid-neutral badge-xs"><RegionLabel region={r.region} /></span>
													<span>{textValueOf(r) || "—"}</span>
												</p>
											))}
										</div>
									</div>
								) : null}
								<div className="space-y-2">
									{textRows.map((row) => (
										<div key={row.key} className="relative rounded-lg border border-[var(--color-base-300)] p-3 pr-10 space-y-2">
											{textRows.length > 1 ? (
												<button type="button" className="btn btn-ghost btn-xs absolute top-2 right-2" onClick={() => removeTextRow(row.key)} aria-label={t("common.delete")}>
													<Trash2 className="w-3.5 h-3.5" />
												</button>
											) : null}
											<div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
												<div>
													<label className="label-text">{t("metadataSubmit.form.actionLabel")}</label>
													<select className="select select-sm w-full" value={row.action} onChange={(e) => updateTextRow(row.key, { action: e.target.value as RegionTextRow["action"] })}>
														<option value="set">{t("metadataSubmit.form.addNewValue")}</option>
														<option value="move" disabled={existingText.length === 0}>{t("metadataSubmit.form.changeRegion")}</option>
														<option value="delete" disabled={existingText.length === 0}>{t("metadataSubmit.form.deleteRegion")}</option>
													</select>
												</div>
												<div>
													<label className="label-text">{t("metadataSubmit.form.regionLabel")}</label>
													<select className="select select-sm w-full" value={row.region} onChange={(e) => updateTextRow(row.key, { region: e.target.value })}>
														{regions.map((r) => (
															<option key={r.id} value={r.name}>{regionLabel(t, r.name)}{regionHasData(r) ? " •" : ""}</option>
														))}
													</select>
												</div>
											</div>
											{row.action === "move" ? (
												<div>
													<label className="label-text">{t("metadataSubmit.form.moveFromRegion")}</label>
													<select className="select select-sm w-full" value={row.fromRegion} onChange={(e) => updateTextRow(row.key, { fromRegion: e.target.value })}>
														<option value="">{t("metadataSubmit.form.regionPlaceholder")}</option>
														{existingText.map((r) => <option key={r.region} value={r.region}>{regionLabel(t, r.region)}</option>)}
													</select>
												</div>
											) : null}
											{row.action === "set" ? (
												<input
													className="input input-sm w-full"
													value={row.value}
													onChange={(e) => updateTextRow(row.key, { value: e.target.value })}
													placeholder={type === "release_year" ? "YYYY-MM" : t("metadataSubmit.form.newField", { field: textLabel.toLowerCase() })}
												/>
											) : null}
										</div>
									))}
								</div>
								<button type="button" className="btn btn-outline btn-sm w-fit" onClick={() => setTextRows((rows) => [...rows, newTextRow()])}>
									{t("metadataSubmit.form.addRegion")}
								</button>
								<p className="text-xs text-[var(--color-base-content)]/50">{t("metadataSubmit.form.moveHint")}</p>
							</div>
						) : (
							<div className="space-y-3">
								<div>
									<p className="label-text">{t("metadataSubmit.form.currentField", { field: textLabel.toLowerCase() })}</p>
									<p className="text-sm text-[var(--color-base-content)]/70">
										{currentText || "—"}
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
								<>
									{existingMedia.length > 0 ? (
										<div>
											<p className="label-text mb-2">{t("metadataSubmit.form.currentMedia", { media: t(MEDIA_LABEL[currentKind]).toLowerCase(), count: existingMedia.length })}</p>
											<div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
												{existingMedia.map((m) => (
													<div key={m.id} className="relative">
														<img src={mediaUrl(m)} alt={t(MEDIA_LABEL[currentKind])} className="w-full h-28 object-contain rounded-lg border border-[var(--color-base-300)] bg-[var(--color-base-300)]" onError={(e) => (e.currentTarget.style.display = "none")} />
														{m.region ? <span className="badge badge-solid-neutral badge-sm absolute bottom-1 right-1"><RegionLabel region={m.region} /></span> : null}
													</div>
												))}
											</div>
										</div>
									) : null}
									<div className="space-y-2">
										{mediaRows.map((row) => (
											<div key={row.key} className="relative rounded-lg border border-[var(--color-base-300)] p-3 pr-10 space-y-2">
												{mediaRows.length > 1 ? (
													<button type="button" className="btn btn-ghost btn-xs absolute top-2 right-2" onClick={() => removeMediaRow(row.key)} aria-label={t("common.delete")}>
														<Trash2 className="w-3.5 h-3.5" />
													</button>
												) : null}
												<div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
													<div>
														<label className="label-text">{t("metadataSubmit.form.actionLabel")}</label>
														<select className="select select-sm w-full" value={row.action} onChange={(e) => updateMediaRow(row.key, { action: e.target.value as RegionMediaRow["action"] })}>
															<option value="new">{t("metadataSubmit.form.addNewImage")}</option>
															<option value="move" disabled={existingMedia.length === 0}>{t("metadataSubmit.form.changeRegion")}</option>
															<option value="delete" disabled={existingMedia.length === 0}>{t("metadataSubmit.form.deleteRegion")}</option>
														</select>
													</div>
													<div>
														<label className="label-text">{t("metadataSubmit.form.regionLabel")}</label>
														<select className="select select-sm w-full" value={row.region} onChange={(e) => updateMediaRow(row.key, { region: e.target.value })}>
															{regions.map((r) => (
																<option key={r.id} value={r.name}>{regionLabel(t, r.name)}{regionHasData(r) ? " •" : ""}</option>
															))}
														</select>
													</div>
												</div>
												{row.action === "move" ? (
													<div>
														<label className="label-text">{t("metadataSubmit.form.moveFromRegion")}</label>
														<select className="select select-sm w-full" value={row.fromRegion} onChange={(e) => updateMediaRow(row.key, { fromRegion: e.target.value })}>
															<option value="">{t("metadataSubmit.form.regionPlaceholder")}</option>
															{existingMedia.map((m) => <option key={m.id} value={m.region || ""}>{regionLabel(t, m.region || "")}</option>)}
														</select>
													</div>
												) : null}
												{row.action === "new" ? (
													<label className="btn btn-outline btn-sm w-fit cursor-pointer">
														<Upload className="w-3.5 h-3.5" />
														{row.file ? row.file.name : t("metadataSubmit.form.chooseImage")}
														<input
															type="file"
															accept={IMAGE_ACCEPT}
															className="hidden"
															disabled={busy}
															onChange={(e) => {
																const f = e.target.files?.[0] || null;
																if (f) updateMediaRow(row.key, { file: f });
																e.target.value = "";
															}}
														/>
													</label>
												) : null}
											</div>
										))}
									</div>
									<button type="button" className="btn btn-outline btn-sm w-fit" onClick={() => setMediaRows((rows) => [...rows, newMediaRow()])}>
										{t("metadataSubmit.form.addRegion")}
									</button>
									<p className="text-xs text-[var(--color-base-content)]/50">
										{t("metadataSubmit.form.imageHint")}
										{currentKind === "logo" ? ` ${t("metadataSubmit.form.logoHint")}` : currentKind === "cover" ? ` ${t("metadataSubmit.form.coverHint")}` : ""}
									</p>
								</>
							) : (
								<>
									{!isVideo && file && previewUrl ? (
										<div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
											<div>
												<p className="label-text mb-2">{t("metadataSubmit.form.currentMedia", { media: t(MEDIA_LABEL[currentKind]).toLowerCase(), count: currentMedia.length })}</p>
												{currentMedia.length > 0 ? (
													<div className="relative">
														<img src={mediaUrl(currentMedia[0])} alt={t(MEDIA_LABEL[currentKind])} className="w-full h-44 object-contain rounded-lg border border-[var(--color-base-300)] bg-[var(--color-base-300)]" onError={(e) => (e.currentTarget.style.display = "none")} />
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
											{currentKind === "fanart" ? ` ${t("metadataSubmit.form.fanartHint")}` : ""}
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
												<p>{t("metadataSubmit.form.frameRate", { fps: videoMeta.fps > 0 ? `${videoMeta.fps} fps` : t("metadataSubmit.form.frameRateUnknown") })}</p>
												{fpsWarning ? <p className="text-[var(--color-warning)]">{fpsWarning}</p> : null}
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

			{/* Duplicate report: requests the deletion of this game in favor of a
			    more complete one. Red-toned because it is a deletion request. */}
			{dupOpen ? (
				<div className="fixed inset-0 z-50 bg-black/70 backdrop-blur-sm flex items-center justify-center p-4" onClick={(e) => e.target === e.currentTarget && closeDuplicate()}>
					<div className={`card w-full max-w-lg p-6 space-y-4 border ${dupDone ? "border-[var(--color-success)]/40" : "border-[var(--color-error)]/40"}`}>
						{dupDone ? (
							<>
								<div className="flex items-start gap-3">
									<div className="grid size-9 place-items-center rounded-full bg-[var(--color-success)]/15 shrink-0">
										<Check className="w-5 h-5 text-[var(--color-success)]" />
									</div>
									<div className="min-w-0">
										<h2 className="text-lg font-bold">{t("metadataSubmit.duplicate.title")}</h2>
										<p className="text-sm text-[var(--color-base-content)]/70 mt-1">{t("metadataSubmit.duplicate.sent")}</p>
									</div>
								</div>
								<div className="flex justify-end">
									<button className="btn btn-primary" type="button" onClick={closeDuplicate}>{t("common.close")}</button>
								</div>
							</>
						) : (
							<>
								<div className="flex items-start gap-3">
									<div className="grid size-9 place-items-center rounded-full bg-[var(--color-error)]/15 shrink-0">
										<Copy className="w-5 h-5 text-[var(--color-error)]" />
									</div>
									<div className="min-w-0">
										<h2 className="text-lg font-bold text-[var(--color-error)]">{t("metadataSubmit.duplicate.title")}</h2>
										<p className="text-sm text-[var(--color-base-content)]/70 mt-1">{t("metadataSubmit.duplicate.subtitle")}</p>
									</div>
								</div>

								<div>
									<label className="label-text">{t("metadataSubmit.duplicate.linkLabel")} <span className="text-[var(--color-error)]">*</span></label>
									<input className="input w-full" type="url" value={dupLink} onChange={(e) => setDupLink(e.target.value)} placeholder={t("metadataSubmit.duplicate.linkPlaceholder")} disabled={dupBusy} />
								</div>

								<div>
									<label className="label-text">{t("metadataSubmit.duplicate.noteLabel")} <span className="text-[var(--color-error)]">*</span></label>
									<textarea className="input w-full min-h-20" value={dupNote} onChange={(e) => setDupNote(e.target.value)} placeholder={t("metadataSubmit.duplicate.notePlaceholder")} disabled={dupBusy} />
								</div>

								{dupStatus ? (
									<p className={`text-sm ${dupStatus.tone === "error" ? "text-[var(--color-error)]" : "text-[var(--color-info)]"}`}>{dupStatus.text}</p>
								) : null}

								<div className="flex justify-end gap-2">
									<button className="btn btn-ghost" type="button" onClick={closeDuplicate} disabled={dupBusy}>{t("common.cancel")}</button>
									<button className="btn btn-error" type="button" onClick={submitDuplicate} disabled={dupBusy}>
										{dupBusy ? t("metadataSubmit.working") : <><Trash2 className="w-4 h-4" /> {t("metadataSubmit.duplicate.request")}</>}
									</button>
								</div>
							</>
						)}
					</div>
				</div>
			) : null}
		</div>
	);
}