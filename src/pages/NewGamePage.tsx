import { useEffect, useState } from "react";
import { Link, useNavigate, useParams } from "react-router-dom";
import { useTranslation } from "react-i18next";
import { AlertTriangle, Check, ChevronLeft, Clapperboard, Plus, Trash2, Upload } from "lucide-react";
import {
	createMetadataSubmission,
	fetchGenres,
	fetchMetadataSystems,
	fetchRegions,
	requestMetadataUploadUrl,
	searchMetadataGames,
	type GameSummary,
	type Genre,
	type MediaKind,
	type MetadataSystem,
	type Region,
} from "../lib/api";
import { ACCEPTED_ASPECTS, IMAGE_ACCEPT, MAX_DESCRIPTION_LENGTH, VIDEO_ACCEPT, VIDEO_FPS, VIDEO_FPS_MAX, VIDEO_FPS_MIN, VIDEO_MAX_SECONDS, VIDEO_MIN_SECONDS, aspectLabel, measureVideo } from "../lib/media";
import { uploadWithProgress } from "../lib/upload";

const GAME_TYPES = ["base", "homebrew", "hack"] as const;
const IMAGE_KINDS: MediaKind[] = ["cover", "screenshot", "fanart", "logo"];
const REGION_KINDS: MediaKind[] = ["cover", "logo"];
const VIDEO_KIND: MediaKind = "video";

const MEDIA_LABEL: Record<MediaKind, string> = {
	cover: "metadataSubmit.mediaKind.cover",
	boxfront: "metadataSubmit.mediaKind.boxfront",
	boxback: "metadataSubmit.mediaKind.boxback",
	screenshot: "metadataSubmit.mediaKind.screenshot",
	logo: "metadataSubmit.mediaKind.logo",
	fanart: "metadataSubmit.mediaKind.fanart",
	video: "metadataSubmit.mediaKind.video",
};

const MEDIA_HINT: Partial<Record<MediaKind, string>> = {
	cover: "metadataSubmit.form.coverHint",
	logo: "metadataSubmit.form.logoHint",
	fanart: "metadataSubmit.form.fanartHint",
	screenshot: "metadataSubmit.form.screenshotHint",
};

// A regional name/release value: the region it belongs to and the text itself.
interface RegionValue {
	region: string;
	value: string;
}

// One picked file and the region it belongs to (empty for non-regional kinds).
interface MediaRow {
	region: string;
	file: File | null;
}

// newMediaRow starts an empty regional media row.
function newMediaRow(): MediaRow {
	return { region: "", file: null };
}

// FilePreview renders a picked file from a local object URL (image or video).
function FilePreview({ file }: { file: File }) {
	const [url, setUrl] = useState<string | null>(null);
	useEffect(() => {
		const u = URL.createObjectURL(file);
		setUrl(u);
		return () => URL.revokeObjectURL(u);
	}, [file]);
	if (!url) return null;
	return file.type.startsWith("video/") ? (
		<video src={url} controls muted className="w-full max-h-56 rounded-lg border border-[var(--color-base-300)] bg-black" />
	) : (
		<img src={url} alt="" className="w-full max-h-56 object-contain rounded-lg border border-[var(--color-base-300)] bg-[var(--color-base-300)]/40" />
	);
}

export default function NewGamePage() {
	const { t } = useTranslation();
	const { systemId: routeSystemId } = useParams<{ systemId: string }>();
	const navigate = useNavigate();

	const [systems, setSystems] = useState<MetadataSystem[] | null>(null);
	const [systemId, setSystemId] = useState(routeSystemId && routeSystemId !== "new" ? routeSystemId : "");
	const [type, setType] = useState<(typeof GAME_TYPES)[number]>("base");
	const [nameRows, setNameRows] = useState<RegionValue[]>([{ region: "", value: "" }]);
	const [releaseRows, setReleaseRows] = useState<RegionValue[]>([{ region: "", value: "" }]);
	const [suggestions, setSuggestions] = useState<GameSummary[]>([]);
	const [showSuggestions, setShowSuggestions] = useState(false);
	const [existing, setExisting] = useState<GameSummary | null>(null);

	const [description, setDescription] = useState("");
	const [regions, setRegions] = useState<Region[]>([]);
	const [genre, setGenre] = useState("");
	const [genres, setGenres] = useState<Genre[]>([]);
	const [developer, setDeveloper] = useState("");
	const [publisher, setPublisher] = useState("");
	const [rating, setRating] = useState("");
	const [note, setNote] = useState("");

	const [mediaRows, setMediaRows] = useState<Partial<Record<MediaKind, MediaRow[]>>>({});
	const [videoMeta, setVideoMeta] = useState<{ duration: number; width: number; height: number; fps: number; aspect: string } | null>(null);
	const [videoError, setVideoError] = useState<string | null>(null);

	const [status, setStatus] = useState<{ text: string; tone: string } | null>(null);
	const [busy, setBusy] = useState(false);
	const [progress, setProgress] = useState<number | null>(null);
	const [confirmSubmit, setConfirmSubmit] = useState(false);
	const [done, setDone] = useState(false);

	// The first filled name row drives the "existing game" search.
	const primaryName = nameRows.find((r) => r.value.trim())?.value.trim() || "";

	function updateNameRow(index: number, patch: Partial<RegionValue>) {
		setNameRows((rows) => rows.map((r, i) => (i === index ? { ...r, ...patch } : r)));
	}
	function updateReleaseRow(index: number, patch: Partial<RegionValue>) {
		setReleaseRows((rows) => rows.map((r, i) => (i === index ? { ...r, ...patch } : r)));
	}
	function rowsFor(kind: MediaKind): MediaRow[] {
		return mediaRows[kind] ?? [newMediaRow()];
	}
	function updateMediaRow(kind: MediaKind, index: number, patch: Partial<MediaRow>) {
		setMediaRows((prev) => ({ ...prev, [kind]: (prev[kind] ?? [newMediaRow()]).map((r, i) => (i === index ? { ...r, ...patch } : r)) }));
	}
	function addMediaRow(kind: MediaKind) {
		setMediaRows((prev) => ({ ...prev, [kind]: [...(prev[kind] ?? [newMediaRow()]), newMediaRow()] }));
	}
	function removeMediaRow(kind: MediaKind, index: number) {
		setMediaRows((prev) => {
			const rows = (prev[kind] ?? [newMediaRow()]).filter((_, i) => i !== index);
			return { ...prev, [kind]: rows.length ? rows : [newMediaRow()] };
		});
	}

	useEffect(() => {
		fetchMetadataSystems()
			.then((list) => setSystems(list.filter((s) => !s.virtual)))
			.catch((e: Error) => setStatus({ text: e.message, tone: "error" }));
		fetchGenres()
			.then(setGenres)
			.catch(() => {});
		fetchRegions()
			.then(setRegions)
			.catch(() => {});
	}, []);

	// Suggest existing games so the user can open and contribute to them
	// instead of creating a duplicate.
	useEffect(() => {
		const q = primaryName;
		if (!systemId || q.length < 2) {
			setSuggestions([]);
			setExisting(null);
			return;
		}
		const handle = setTimeout(() => {
			searchMetadataGames(q, systemId, 8, 0, "", "")
				.then((d) => {
					setSuggestions(d.games || []);
					setExisting((d.games || []).find((g) => g.name.toLowerCase() === q.toLowerCase()) || null);
				})
				.catch(() => setSuggestions([]));
		}, 300);
		return () => clearTimeout(handle);
	}, [primaryName, systemId]);

	// Validate a picked video before upload.
	useEffect(() => {
		const file = rowsFor(VIDEO_KIND)[0]?.file;
		if (!file) {
			setVideoMeta(null);
			setVideoError(null);
			return;
		}
		let cancelled = false;
		measureVideo(file)
			.then(({ duration, width, height, fps }) => {
				if (cancelled) return;
				const errors: string[] = [];
				if (!VIDEO_ACCEPT.split(",").some((e) => file.name.toLowerCase().endsWith(e))) {
					errors.push(t("metadataSubmit.errors.format"));
				}
				if (duration < VIDEO_MIN_SECONDS - 0.5) errors.push(t("metadataSubmit.errors.durationMin", { min: VIDEO_MIN_SECONDS, current: duration.toFixed(1) }));
				if (duration > VIDEO_MAX_SECONDS + 0.5) errors.push(t("metadataSubmit.errors.durationMax", { max: VIDEO_MAX_SECONDS, current: duration.toFixed(1) }));
				if (width <= 0 || height <= 0) errors.push(t("metadataSubmit.errors.dimensions"));
				const ratio = width / height;
				if (width > 0 && height > 0 && !ACCEPTED_ASPECTS.some((a) => Math.abs(a.ratio - ratio) < 0.03)) {
					errors.push(t("metadataSubmit.errors.aspect", { ratio: ratio.toFixed(2) }));
				}
				if (fps > 0 && fps < VIDEO_FPS_MIN) {
					errors.push(t("metadataSubmit.errors.frameRate", { fpsMin: VIDEO_FPS_MIN, fps: VIDEO_FPS, detected: fps }));
				}
				setVideoMeta({ duration, width, height, fps, aspect: aspectLabel(width, height) });
				setVideoError(errors.length ? errors.join(" ") : null);
			})
			.catch(() => {
				if (cancelled) return;
				setVideoError(t("metadataSubmit.errors.readVideo"));
				setVideoMeta(null);
			});
		return () => {
			cancelled = true;
		};
	}, [mediaRows, t]);

	// Images are uploaded in their original format: the backend normalizes them
	// to WebP (crop/scale/quality) on approval, so client-side conversion is no
	// longer trusted.
	function buildPayload(): Record<string, unknown> {
		const payload: Record<string, unknown> = { type };
		if (description.trim()) payload.description = description.trim();
		if (genre.trim()) payload.genre = genre.trim();
		if (developer.trim()) payload.developer = developer.trim();
		if (publisher.trim()) payload.publisher = publisher.trim();
		if (rating) payload.rating = Number(rating);
		if (note.trim()) payload.note = note.trim();

		// Merge the name and release rows by region so each region carries its
		// own name and/or release date.
		const byRegion = new Map<string, { region: string; name?: string; release_year?: number; release_month?: number }>();
		for (const row of nameRows) {
			const region = row.region.trim();
			const value = row.value.trim();
			if (!region || !value) continue;
			byRegion.set(region, { ...(byRegion.get(region) || { region }), region, name: value });
		}
		for (const row of releaseRows) {
			const region = row.region.trim();
			if (!region || !row.value) continue;
			const [ys, ms] = row.value.split("-");
			const entry = byRegion.get(region) || { region };
			entry.release_year = Number(ys);
			if (ms) entry.release_month = Number(ms);
			byRegion.set(region, entry);
		}
		const regionList = [...byRegion.values()];
		payload.regions = regionList;

		// The canonical name/release come from the highest-priority region (the
		// catalog order), matching how the backend resolves the primary.
		const priority = new Map(regions.map((r, i) => [r.name, i]));
		const canonical = [...regionList].sort((a, b) => (priority.get(a.region) ?? 999) - (priority.get(b.region) ?? 999))[0];
		payload.name = canonical?.name || primaryName;
		if (canonical?.release_year) {
			payload.release_year = canonical.release_year;
			if (canonical.release_month) payload.release_month = canonical.release_month;
		}
		return payload;
	}

	async function submit() {
		setConfirmSubmit(false);
		if (!systemId) return setStatus({ text: t("metadata.newGame.needSystem"), tone: "error" });
		if (!primaryName) return setStatus({ text: t("metadata.newGame.needName"), tone: "error" });
		if (existing) return setStatus({ text: t("metadata.newGame.existingBody"), tone: "error" });
		if (description.trim().length > MAX_DESCRIPTION_LENGTH) {
			return setStatus({ text: t("metadataSubmit.status.descriptionTooLong", { max: MAX_DESCRIPTION_LENGTH }), tone: "error" });
		}
		if (rowsFor(VIDEO_KIND)[0]?.file && videoError) return setStatus({ text: t("metadataSubmit.status.fixVideo"), tone: "error" });

		setBusy(true);
		setStatus({ text: t("metadataSubmit.status.creating"), tone: "info" });
		try {
			const uploaded: { kind: MediaKind; object_key: string; file_name: string; mime_type: string; size: number; region?: string }[] = [];
			for (const kind of Object.keys(mediaRows) as MediaKind[]) {
				const isRegional = REGION_KINDS.includes(kind);
				for (const row of mediaRows[kind] ?? []) {
					const file = row.file;
					if (!file) continue;
					const mime = file.type || "application/octet-stream";
					const fileRegion = isRegional ? row.region.trim() : "";
					const resp = await requestMetadataUploadUrl({ system_id: systemId, kind, file_name: file.name, mime_type: mime, size: file.size, region: fileRegion });
					await uploadWithProgress(resp.upload_url, file, mime, (p) => setProgress(Math.round(p * 100)));
					setProgress(100);
					uploaded.push({ kind, object_key: resp.object_key, file_name: file.name, mime_type: mime, size: file.size, region: fileRegion });
				}
			}
			await createMetadataSubmission({ system_id: systemId, kind: "new_game", payload: buildPayload(), files: uploaded });
			setStatus({ text: t("metadata.newGame.submitted"), tone: "success" });
			setProgress(null);
			setDone(true);
		} catch (e) {
			setStatus({ text: (e as Error).message, tone: "error" });
			setProgress(null);
		} finally {
			setBusy(false);
		}
	}

	if (done) {
		return (
			<div className="max-w-2xl mx-auto space-y-4">
				<div className="card p-8 text-center space-y-4">
					<div className="mx-auto grid size-12 place-items-center rounded-full bg-[var(--color-success)]/15">
						<Check className="w-6 h-6 text-[var(--color-success)]" />
					</div>
					<h1 className="text-xl font-bold">{t("metadata.newGame.submittedTitle")}</h1>
					<p className="text-sm text-[var(--color-base-content)]/70">{t("metadata.newGame.submittedBody")}</p>
					<div className="flex justify-center gap-2">
						<button className="btn btn-outline" onClick={() => { setDone(false); setNameRows([{ region: "", value: "" }]); setReleaseRows([{ region: "", value: "" }]); setDescription(""); setMediaRows({}); setExisting(null); }}>{t("metadata.newGame.addAnother")}</button>
						<Link to="/app/contributions" className="btn btn-primary">{t("reviews.title")}</Link>
					</div>
				</div>
			</div>
		);
	}

	return (
		<div className="space-y-6 max-w-3xl mx-auto">
			<div className="flex items-center gap-3">
				<Link to={systemId ? `/app/metadata/${systemId}` : "/app/metadata"} className="btn btn-ghost !p-2" aria-label={t("common.back")}>
					<ChevronLeft className="w-5 h-5" />
				</Link>
				<div>
					<h1 className="text-2xl md:text-3xl font-bold tracking-tight">{t("metadata.newGame.title")}</h1>
					<p className="text-sm text-[var(--color-base-content)]/60 pt-1">{t("metadata.newGame.subtitle")}</p>
				</div>
			</div>

			{/* Target: system, type, name */}
			<section className="card p-6 space-y-4">
				<div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
					<div>
						<label className="label-text" htmlFor="ng-system">{t("metadata.newGame.system")}</label>
						<select id="ng-system" className="select w-full" value={systemId} onChange={(e) => { setSystemId(e.target.value); setExisting(null); }} disabled={busy}>
							<option value="">{t("metadata.newGame.systemPlaceholder")}</option>
							{(systems || []).map((s) => (
								<option key={s.id} value={s.id}>{s.name}</option>
							))}
						</select>
					</div>
					<div>
						<label className="label-text" htmlFor="ng-type">{t("metadataSubmit.textTypes.type")}</label>
						<select id="ng-type" className="select w-full" value={type} onChange={(e) => setType(e.target.value as (typeof GAME_TYPES)[number])} disabled={busy}>
							{GAME_TYPES.map((g) => (
								<option key={g} value={g}>{g}</option>
							))}
						</select>
					</div>
				</div>

				<div className="space-y-2">
					<div className="flex items-center justify-between gap-2">
						<label className="label-text">{t("metadataSubmit.textTypes.name")}</label>
						<button type="button" className="btn btn-ghost btn-xs" onClick={() => setNameRows((rows) => [...rows, { region: "", value: "" }])} disabled={busy}>
							<Plus className="w-3.5 h-3.5" />
							{t("metadataSubmit.form.addAnotherRegion")}
						</button>
					</div>
					{nameRows.map((row, i) => (
						<div key={i} className="flex items-center gap-2">
							<div className="w-36 sm:w-44 shrink-0">
								<select
									className="select w-full"
									aria-label={t("metadataSubmit.textTypes.region")}
									value={row.region}
									onChange={(e) => updateNameRow(i, { region: e.target.value })}
									disabled={busy}
								>
									<option value="">{t("metadataSubmit.form.regionPlaceholder")}</option>
									{regions.map((r) => (
										<option key={r.id} value={r.name}>{t("metadata.regions." + r.id, { defaultValue: r.name })}</option>
									))}
								</select>
							</div>
							<div className="relative flex-1 min-w-0">
								<input
									className="input w-full"
									value={row.value}
									placeholder={t("metadata.newGame.namePlaceholder")}
									disabled={busy}
									onChange={(e) => { updateNameRow(i, { value: e.target.value }); setShowSuggestions(true); }}
									onFocus={() => i === 0 && setShowSuggestions(true)}
									onBlur={() => setTimeout(() => setShowSuggestions(false), 150)}
								/>
								{i === 0 && showSuggestions && suggestions.length > 0 ? (
									<div className="absolute z-30 left-0 right-0 mt-1 card shadow-xl max-h-64 overflow-y-auto p-1">
										{suggestions.map((g) => (
											<button
												key={g.id}
												type="button"
												className="w-full text-left rounded-md px-3 py-2 hover:bg-[var(--color-base-300)]"
												onMouseDown={(e) => {
													e.preventDefault();
													updateNameRow(0, { value: g.name });
													setExisting(g);
													setSuggestions([]);
													setShowSuggestions(false);
												}}
											>
												<p className="text-sm font-medium truncate">{g.name}</p>
												<p className="text-xs text-[var(--color-base-content)]/50">{g.release_year ? `${g.release_year}` : t("metadata.na")}</p>
											</button>
										))}
									</div>
								) : null}
							</div>
							{nameRows.length > 1 ? (
								<button type="button" className="btn btn-ghost btn-sm !px-2 shrink-0" onClick={() => setNameRows((rows) => rows.filter((_, idx) => idx !== i))} disabled={busy} aria-label={t("common.delete")}>
									<Trash2 className="w-4 h-4" />
								</button>
							) : null}
						</div>
					))}
					<p className="text-xs text-[var(--color-base-content)]/50">{t("metadata.newGame.nameSearchHint")}</p>
				</div>

				{existing ? (
					<div className="flex items-start gap-3 rounded-lg border border-[var(--color-warning)]/40 bg-[var(--color-warning)]/10 p-3">
						<AlertTriangle className="w-4 h-4 text-[var(--color-warning)] shrink-0 mt-0.5" />
						<div className="min-w-0 space-y-1">
							<p className="text-sm font-semibold">{t("metadata.newGame.existingTitle")}</p>
							<p className="text-xs text-[var(--color-base-content)]/70">{t("metadata.newGame.existingBody")}</p>
							<Link to={`/app/metadata/${systemId}/game/${existing.id}`} className="btn btn-warning btn-sm w-fit">
								{t("metadata.newGame.openGame")}
							</Link>
						</div>
					</div>
				) : null}
			</section>

			{/* Details */}
			<section className="card p-6 space-y-4">
				<h2 className="font-semibold">{t("metadata.newGame.fieldsTitle")}</h2>
				<div>
					<label className="label-text" htmlFor="ng-description">{t("metadataSubmit.textTypes.description")}</label>
					<textarea id="ng-description" className="input w-full min-h-32" maxLength={MAX_DESCRIPTION_LENGTH} value={description} onChange={(e) => setDescription(e.target.value)} disabled={busy} />
					<div className="flex items-center justify-between gap-2 mt-1">
						<p className="text-xs text-[var(--color-base-content)]/50">{t("metadataSubmit.form.descriptionNote", { max: MAX_DESCRIPTION_LENGTH })}</p>
						<span className={`text-xs shrink-0 ${description.length >= MAX_DESCRIPTION_LENGTH ? "text-[var(--color-error)]" : "text-[var(--color-base-content)]/50"}`}>
							{t("metadataSubmit.form.charCount", { count: description.length, max: MAX_DESCRIPTION_LENGTH })}
						</span>
					</div>
				</div>
				<div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
					<div>
						<label className="label-text" htmlFor="ng-genre">{t("metadataSubmit.textTypes.genre")}</label>
						<select id="ng-genre" className="select w-full" value={genre} onChange={(e) => setGenre(e.target.value)} disabled={busy}>
							<option value="">{t("metadataSubmit.form.genrePlaceholder")}</option>
							{genres.map((g) => (
								<option key={g.id} value={g.name}>{t("metadata.genres." + g.id, { defaultValue: g.name })}</option>
							))}
						</select>
					</div>
					<div>
						<label className="label-text" htmlFor="ng-developer">{t("metadataSubmit.textTypes.developer")}</label>
						<input id="ng-developer" className="input w-full" value={developer} onChange={(e) => setDeveloper(e.target.value)} disabled={busy} />
					</div>
					<div>
						<label className="label-text" htmlFor="ng-publisher">{t("metadataSubmit.textTypes.publisher")}</label>
						<input id="ng-publisher" className="input w-full" value={publisher} onChange={(e) => setPublisher(e.target.value)} disabled={busy} />
					</div>
					<div>
						<label className="label-text" htmlFor="ng-rating">{t("metadataSubmit.textTypes.rating")}</label>
						<input id="ng-rating" type="number" min={1} max={10} step={1} className="input w-full" value={rating} onChange={(e) => setRating(e.target.value)} placeholder="1-10" disabled={busy} />
					</div>
				</div>

				<div className="space-y-2">
					<div className="flex items-center justify-between gap-2">
						<label className="label-text">{t("metadataSubmit.textTypes.release")}</label>
						<button type="button" className="btn btn-ghost btn-xs" onClick={() => setReleaseRows((rows) => [...rows, { region: "", value: "" }])} disabled={busy}>
							<Plus className="w-3.5 h-3.5" />
							{t("metadataSubmit.form.addAnotherRegion")}
						</button>
					</div>
					{releaseRows.map((row, i) => (
						<div key={i} className="flex items-center gap-2">
							<div className="w-36 sm:w-44 shrink-0">
								<select
									className="select w-full"
									aria-label={t("metadataSubmit.textTypes.region")}
									value={row.region}
									onChange={(e) => updateReleaseRow(i, { region: e.target.value })}
									disabled={busy}
								>
									<option value="">{t("metadataSubmit.form.regionPlaceholder")}</option>
									{regions.map((r) => (
										<option key={r.id} value={r.name}>{t("metadata.regions." + r.id, { defaultValue: r.name })}</option>
									))}
								</select>
							</div>
							<input
								type="month"
								min="1950-01"
								max="2100-12"
								className="input flex-1 min-w-0"
								value={row.value}
								onChange={(e) => updateReleaseRow(i, { value: e.target.value })}
								disabled={busy}
							/>
							{releaseRows.length > 1 ? (
								<button type="button" className="btn btn-ghost btn-sm !px-2 shrink-0" onClick={() => setReleaseRows((rows) => rows.filter((_, idx) => idx !== i))} disabled={busy} aria-label={t("common.delete")}>
									<Trash2 className="w-4 h-4" />
								</button>
							) : null}
						</div>
					))}
				</div>
			</section>

			{/* Media */}
			<section className="card p-6 space-y-4">
				<h2 className="font-semibold">{t("metadata.newGame.mediaTitle")}</h2>
				{IMAGE_KINDS.map((kind) => {
					const isRegional = REGION_KINDS.includes(kind);
					const rows = rowsFor(kind);
					return (
						<div key={kind} className="space-y-2">
							<div className="flex items-center justify-between gap-2">
								<p className="label-text">{t(MEDIA_LABEL[kind])}</p>
								{isRegional ? (
									<button type="button" className="btn btn-ghost btn-xs" onClick={() => addMediaRow(kind)} disabled={busy}>
										<Plus className="w-3.5 h-3.5" />
										{t("metadataSubmit.form.addAnotherRegion")}
									</button>
								) : null}
							</div>
							{rows.map((row, i) => (
								<div key={i} className="flex items-center gap-2">
									{isRegional ? (
										<div className="w-36 sm:w-44 shrink-0">
											<select
												className="select w-full"
												aria-label={t("metadataSubmit.textTypes.region")}
												value={row.region}
												onChange={(e) => updateMediaRow(kind, i, { region: e.target.value })}
												disabled={busy}
											>
												<option value="">{t("metadataSubmit.form.regionPlaceholder")}</option>
												{regions.map((r) => (
													<option key={r.id} value={r.name}>{t("metadata.regions." + r.id, { defaultValue: r.name })}</option>
												))}
											</select>
										</div>
									) : null}
									<div className="flex-1 min-w-0 space-y-2">
										{row.file ? (
											<>
												<FilePreview file={row.file} />
												<button type="button" className="btn btn-ghost btn-xs" onClick={() => updateMediaRow(kind, i, { file: null })} disabled={busy}>
													{t("common.delete")}
												</button>
											</>
										) : (
											<label className="btn btn-outline cursor-pointer">
												<Upload className="w-4 h-4" />
												{t("metadataSubmit.form.chooseImage")}
												<input type="file" accept={IMAGE_ACCEPT} className="hidden" disabled={busy} onChange={(e) => { const f = e.target.files?.[0] || null; if (f) updateMediaRow(kind, i, { file: f }); e.target.value = ""; }} />
											</label>
										)}
									</div>
									{isRegional && rows.length > 1 ? (
										<button type="button" className="btn btn-ghost btn-sm !px-2 shrink-0" onClick={() => removeMediaRow(kind, i)} disabled={busy} aria-label={t("common.delete")}>
											<Trash2 className="w-4 h-4" />
										</button>
									) : null}
								</div>
							))}
							<p className="text-xs text-[var(--color-base-content)]/50">
								{t("metadataSubmit.form.imageHint")}
								{MEDIA_HINT[kind] ? ` ${t(MEDIA_HINT[kind] as string)}` : ""}
							</p>
						</div>
					);
				})}

				<div className="space-y-2">
					<div className="flex items-center justify-between gap-2">
						<p className="label-text">{t(MEDIA_LABEL[VIDEO_KIND])}</p>
						{rowsFor(VIDEO_KIND)[0]?.file ? (
							<button type="button" className="btn btn-ghost btn-xs" onClick={() => updateMediaRow(VIDEO_KIND, 0, { file: null })} disabled={busy}>
								{t("common.delete")}
							</button>
						) : null}
					</div>
					{rowsFor(VIDEO_KIND)[0]?.file ? (
						<FilePreview file={rowsFor(VIDEO_KIND)[0].file as File} />
					) : (
						<label className="btn btn-outline cursor-pointer">
							<Clapperboard className="w-4 h-4" />
							{t("metadataSubmit.form.chooseVideo")}
							<input type="file" accept={VIDEO_ACCEPT} className="hidden" disabled={busy} onChange={(e) => { const f = e.target.files?.[0] || null; if (f) updateMediaRow(VIDEO_KIND, 0, { file: f }); e.target.value = ""; }} />
						</label>
					)}
					<p className="text-xs text-[var(--color-base-content)]/50">{t("metadataSubmit.videoHint", { min: VIDEO_MIN_SECONDS, max: VIDEO_MAX_SECONDS, fpsMin: VIDEO_FPS_MIN, fpsMax: VIDEO_FPS_MAX, fps: VIDEO_FPS })}</p>
					{rowsFor(VIDEO_KIND)[0]?.file && videoMeta ? (
						<div className="rounded-lg border border-[var(--color-base-300)] p-3 space-y-1 text-xs text-[var(--color-base-content)]/60">
							<p>{t("metadataSubmit.form.resolution", { width: videoMeta.width, height: videoMeta.height, aspect: videoMeta.aspect })}</p>
							<p>{t("metadataSubmit.form.duration", { duration: videoMeta.duration.toFixed(1) })}</p>
							<p>{t("metadataSubmit.form.frameRate", { fps: videoMeta.fps > 0 ? `${videoMeta.fps} fps` : t("metadataSubmit.form.frameRateUnknown") })}</p>
						</div>
					) : null}
					{videoError ? <p className="text-xs text-[var(--color-error)]">{videoError}</p> : null}
					<p className="text-xs text-[var(--color-warning)] leading-relaxed">{t("metadataSubmit.form.videoAspectHint")}</p>
				</div>
			</section>

			<section className="card p-6">
				<label className="label-text" htmlFor="ng-note">{t("metadataSubmit.form.whyLabel")}</label>
				<textarea id="ng-note" className="input w-full min-h-20" value={note} onChange={(e) => setNote(e.target.value)} placeholder={t("metadataSubmit.form.whyPlaceholder")} disabled={busy} />
			</section>

			{progress !== null ? (
				<div className="card p-3">
					<div className="flex justify-between text-xs mb-1">
						<span className="text-[var(--color-base-content)]/60">{t("metadataSubmit.status.creating")}</span>
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
				<button className="btn btn-ghost" onClick={() => navigate(systemId ? `/app/metadata/${systemId}` : "/app/metadata")} disabled={busy}>{t("common.cancel")}</button>
				<button className="btn btn-primary" onClick={() => setConfirmSubmit(true)} disabled={busy || !!existing || !systemId || !primaryName}>
					<Plus className="w-4 h-4" />
					{t("metadata.newGame.submit")}
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
							<button className="btn btn-primary" type="button" disabled={busy} onClick={submit}>{t("metadata.newGame.submit")}</button>
						</div>
					</div>
				</div>
			) : null}
		</div>
	);
}
