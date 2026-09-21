import { useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { AlertTriangle, ChevronLeft, ExternalLink, Image as ImageIcon, ShieldCheck, X } from "lucide-react";
import { useTranslation } from "react-i18next";
import Pagination from "../components/Pagination";
import UserLink from "../components/UserLink";
import { useReviews } from "../lib/reviews";
import {
	approveMetadataSubmission,
	cdnUrl,
	rejectMetadataSubmission,
	fetchMetadataSubmissionDetail,
	fetchMetadataSubmissions,
	type MediaKind,
	type MetadataMedia,
	type MetadataSubmission,
	type MetadataSubmissionDetail,
	type MetadataSubmissionFile,
	type MetadataStatus,
} from "../lib/api";
import { formatDate } from "../lib/format";
import { regionLabel } from "../lib/regions";

const BADGE: Record<MetadataStatus, string> = {
	created: "badge-info",
	pending: "badge-warning",
	approved: "badge-success",
	rejected: "badge-error",
};

const MEDIA_LABEL: Record<MediaKind, string> = {
	cover: "metadataSubmit.mediaKind.cover",
	boxfront: "metadataSubmit.mediaKind.boxfront",
	boxback: "metadataSubmit.mediaKind.boxback",
	screenshot: "metadataSubmit.mediaKind.screenshot",
	logo: "metadataSubmit.mediaKind.logo",
	fanart: "metadataSubmit.mediaKind.fanart",
	video: "metadataSubmit.mediaKind.video",
};

// Text payload fields, in the order they are shown in the comparison. The
// region is shown as a badge, not as a text change.
const TEXT_ORDER = ["name", "description", "genre", "developer", "publisher", "release_year", "rating", "type"];
const TEXT_LABEL: Record<string, string> = {
	name: "metadataSubmit.textTypes.name",
	description: "metadataSubmit.textTypes.description",
	region: "metadataSubmit.textTypes.region",
	genre: "metadataSubmit.textTypes.genre",
	developer: "metadataSubmit.textTypes.developer",
	publisher: "metadataSubmit.textTypes.publisher",
	release_year: "metadataSubmit.textTypes.release",
	rating: "metadataSubmit.textTypes.rating",
	type: "metadataSubmit.textTypes.type",
};

// PAGE_SIZE is the number of submissions shown per page in the review list.
const PAGE_SIZE = 20;

function fmtSize(bytes?: number): string {
	if (!bytes) return "—";
	if (bytes < 1024) return `${bytes} B`;
	if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(0)} KB`;
	return `${(bytes / 1024 / 1024).toFixed(1)} MB`;
}

function mediaUrl(objectKey: string, v?: string): string {
	return cdnUrl(objectKey) + (v ? `?v=${encodeURIComponent(v)}` : "");
}

export default function MetadataAdminView() {
	const { t } = useTranslation();
	const { refresh: refreshReviews } = useReviews();
	const [status, setStatus] = useState<MetadataStatus | "">("pending");
	const [kindFilter, setKindFilter] = useState("");
	const [userFilter, setUserFilter] = useState("");
	const [sortDir, setSortDir] = useState<"asc" | "desc">("desc");
	const [page, setPage] = useState(1);
	const [submissions, setSubmissions] = useState<MetadataSubmission[] | null>(null);
	const [detail, setDetail] = useState<MetadataSubmissionDetail | null>(null);
	const [lightbox, setLightbox] = useState<{ url: string; label: string } | null>(null);
	const [comment, setComment] = useState("");
	const [listMsg, setListMsg] = useState<string | null>(null);
	const [busy, setBusy] = useState(false);
	const [approved, setApproved] = useState<{ id: string; description: boolean } | null>(null);

	function load(s = status) {
		fetchMetadataSubmissions(s)
			.then((list) => {
				setSubmissions(list);
				setListMsg(null);
			})
			.catch((e: Error) => {
				setSubmissions([]);
				setListMsg(e.message);
			});
	}

	useEffect(() => {
		load();
		// eslint-disable-next-line react-hooks/exhaustive-deps
	}, []);

	async function open(id: string) {
		try {
			const d = await fetchMetadataSubmissionDetail(id);
			setDetail({ ...d, files: d.files || [], media: d.media || [] });
			setComment("");
		} catch (e) {
			alert((e as Error).message);
		}
	}

	async function approve() {
		if (!detail) return;
		setBusy(true);
		try {
			await approveMetadataSubmission(detail.submission.id, comment);
			const hasDescription =
				typeof detail.submission.payload.description === "string" && (detail.submission.payload.description as string).trim() !== "";
			setApproved({ id: detail.submission.id, description: hasDescription });
			setDetail(null);
			load();
			refreshReviews();
		} catch (e) {
			alert((e as Error).message);
		} finally {
			setBusy(false);
		}
	}

	async function reject() {
		if (!detail) return;
		setBusy(true);
		try {
			await rejectMetadataSubmission(detail.submission.id, comment);
			setDetail(null);
			load();
			refreshReviews();
		} catch (e) {
			alert((e as Error).message);
		} finally {
			setBusy(false);
		}
	}

	const payload = (detail?.submission.payload || {}) as Record<string, unknown>;
	const note = typeof payload.note === "string" ? payload.note : "";
	const payloadKeys = Object.keys(payload).filter((k) => k !== "note" && k !== "release_month" && k !== "region");
	const textKeys = [...TEXT_ORDER.filter((k) => payloadKeys.includes(k)), ...payloadKeys.filter((k) => !TEXT_ORDER.includes(k))];

	// Header data for the detail modal: the target game/system and a link to
	// open the game in a new tab. A brand-new game has no row (and no link)
	// until it is approved, so its name falls back to the payload.
	const gameID = detail?.submission.game_id || detail?.game?.id || "";
	const systemID = detail?.game?.system_id || detail?.submission.system_id || "";
	const systemName = detail?.game?.system_name || detail?.submission.system_name || detail?.system?.name || "";
	const gameName = detail?.game?.name || detail?.submission.game_name || (typeof payload.name === "string" ? payload.name : "");

	// old_payload / old_media snapshot the target's published state at approval
	// time, so an approved submission still shows the correct "old" side (the
	// target itself already holds the new values).
	const oldPayload = (detail?.submission.old_payload || {}) as Record<string, unknown>;
	const hasOldPayload = Object.keys(oldPayload).length > 0;
	const oldMedia = (detail?.submission.old_media || []) as MetadataMedia[];

	// Region the submission targets (name/release/logo/cover), if any.
	const subRegion = typeof payload.region === "string" ? payload.region : "";

	// currentValue resolves the target's value for a payload key so it can be
	// compared against the proposed one. For an approved submission the target
	// already holds the new value, so the old snapshot is used instead.
	function currentValue(key: string): string {
		// A new game has no current value to compare against.
		if (detail?.submission.kind === "new_game") return "";
		if (hasOldPayload) {
			if (key === "release_year") {
				const y = oldPayload.release_year;
				if (y === undefined || y === null || y === "") return "";
				const m = oldPayload.release_month;
				return `${y}${m ? `-${String(m).padStart(2, "0")}` : ""}`;
			}
			const v = oldPayload[key];
			return v === undefined || v === null ? "" : String(v);
		}
		const g = detail?.game;
		const sys = detail?.system;
		// The name/release belong to the submission's region, so compare against
		// that region's value (never another region's).
		if (subRegion && (key === "name" || key === "release_year")) {
			const gr = g?.regions?.find((r) => r.region === subRegion);
			if (key === "name") return gr?.name || "";
			const y = gr?.release_year;
			return y ? `${y}${gr?.release_month ? `-${String(gr.release_month).padStart(2, "0")}` : ""}` : "";
		}
		if (key === "release_year") {
			if (!g?.release_year) return "";
			return `${g.release_year}${g.release_month ? `-${String(g.release_month).padStart(2, "0")}` : ""}`;
		}
		if (g) {
			switch (key) {
				case "name": return g.name || "";
				case "description": return g.description || "";
				case "region": return g.region || "";
				case "genre": return g.genre || "";
				case "developer": return g.developer || "";
				case "publisher": return g.publisher || "";
				case "rating": return g.rating ? String(g.rating) : "";
				case "type": return g.type || "";
			}
		}
		if (sys) {
			switch (key) {
				case "description": return sys.description || "";
				case "region": return sys.region || "";
			}
		}
		return "";
	}

	function newValue(key: string): string {
		if (key === "release_year") {
			const y = payload.release_year;
			if (y === undefined || y === null || y === "") return "";
			const m = payload.release_month;
			return `${y}${m ? `-${String(m).padStart(2, "0")}` : ""}`;
		}
		const v = payload[key];
		return v === undefined || v === null ? "" : String(v);
	}

	function textLabel(key: string): string {
		return TEXT_LABEL[key] ? t(TEXT_LABEL[key]) : key;
	}

	// kindLabel resolves a change kind (a payload field or a media kind) to a
	// human label for the list badges and the filter chips.
	function kindLabel(key: string): string {
		if (TEXT_LABEL[key]) return t(TEXT_LABEL[key]);
		const media = MEDIA_LABEL[key as MediaKind];
		if (media) return t(media);
		return key;
	}

	const allKinds = [...new Set((submissions || []).flatMap((s) => s.change_kinds || []))].sort();

	// userOptions lists every contributor present in the current result set so
	// the review list can be filtered by author.
	const userOptions = useMemo(() => {
		const map = new Map<string, string>();
		for (const s of submissions || []) {
			if (!map.has(s.user_id)) map.set(s.user_id, s.submitted_by_name || s.user_id);
		}
		return [...map.entries()]
			.map(([id, name]) => ({ id, name }))
			.sort((a, b) => a.name.localeCompare(b.name));
	}, [submissions]);

	// Reset to the first page whenever a filter or the status tab changes.
	useEffect(() => {
		setPage(1);
	}, [status, kindFilter, userFilter, sortDir]);

	const visible = [...(submissions || [])]
		.filter((s) => !kindFilter || (s.change_kinds || []).includes(kindFilter))
		.filter((s) => !userFilter || s.user_id === userFilter)
		.sort((a, b) => (sortDir === "asc" ? (a.created_at > b.created_at ? 1 : -1) : a.created_at < b.created_at ? 1 : -1));

	const totalPages = Math.max(1, Math.ceil(visible.length / PAGE_SIZE));
	const currentPage = Math.min(page, totalPages);
	const pageItems = visible.slice((currentPage - 1) * PAGE_SIZE, currentPage * PAGE_SIZE);

	return (
		<div className="space-y-6">
			<div className="flex items-center gap-3">
				<Link to="/app/admin" className="btn btn-ghost !p-2" aria-label={t("common.back")}>
					<ChevronLeft className="w-5 h-5" />
				</Link>
				<div>
					<h1 className="text-2xl md:text-3xl font-bold tracking-tight">{t("nav.metadataReview")}</h1>
					<p className="text-[var(--color-base-content)]/60 text-sm pt-2">
						{t("metadataAdmin.subtitle")}
					</p>
				</div>
			</div>

			<div className="flex flex-wrap items-center gap-2">
				{([
					{ label: t("metadataStatus.pending"), value: "pending" },
					{ label: t("metadataStatus.approved"), value: "approved" },
					{ label: t("metadataStatus.rejected"), value: "rejected" },
					{ label: t("common.all"), value: "" },
				] as { label: string; value: MetadataStatus | "" }[]).map((f) => (
					<button
						key={f.value || "all"}
						className={status === f.value ? "btn btn-primary" : "btn btn-ghost"}
						type="button"
						onClick={() => {
							setStatus(f.value);
							load(f.value);
						}}
					>
						{f.label}
					</button>
				))}
			</div>

			{submissions === null ? (
				<p className="text-sm text-[var(--color-base-content)]/50 text-center py-6">{t("common.loading")}</p>
			) : submissions.length === 0 ? (
				<p className="text-sm text-[var(--color-base-content)]/50 text-center py-6">{listMsg || t("metadataAdmin.noSubmissions")}</p>
			) : (
				<>
					<div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
						<label className="w-full">
							<span className="block text-xs text-[var(--color-base-content)]/50 mb-1">{t("metadataAdmin.filterBy")}</span>
							<select className="select select-sm w-full" value={kindFilter} onChange={(e) => setKindFilter(e.target.value)} aria-label={t("metadataAdmin.filterBy")}>
								<option value="">{t("common.all")}</option>
								{allKinds.map((k) => (
									<option key={k} value={k}>{kindLabel(k)}</option>
								))}
							</select>
						</label>
						<label className="w-full">
							<span className="block text-xs text-[var(--color-base-content)]/50 mb-1">{t("metadataAdmin.filterUser")}</span>
							<select className="select select-sm w-full" value={userFilter} onChange={(e) => setUserFilter(e.target.value)} aria-label={t("metadataAdmin.filterUser")}>
								<option value="">{t("metadataAdmin.allUsers")}</option>
								{userOptions.map((u) => (
									<option key={u.id} value={u.id}>{u.name}</option>
								))}
							</select>
						</label>
						<label className="w-full">
							<span className="block text-xs text-[var(--color-base-content)]/50 mb-1">{t("metadataAdmin.sortBy")}</span>
							<select className="select select-sm w-full" value={sortDir} onChange={(e) => setSortDir(e.target.value as "asc" | "desc")} aria-label={t("metadataAdmin.sortBy")}>
								<option value="desc">{t("metadataAdmin.newestFirst")}</option>
								<option value="asc">{t("metadataAdmin.oldestFirst")}</option>
							</select>
						</label>
					</div>

					{visible.length === 0 ? (
						<p className="text-sm text-[var(--color-base-content)]/50 text-center py-6">{t("metadataAdmin.noSubmissions")}</p>
					) : (
						<>
							<Pagination page={currentPage} totalPages={totalPages} onChange={setPage} />
							<div className="space-y-3">
								{pageItems.map((s) => (
									<div key={s.id} className="card card-hover p-4 cursor-pointer" onClick={() => open(s.id)}>
										<div className="flex items-center gap-3">
											{s.cover ? (
												<img
													src={cdnUrl(s.cover) + (s.cover_updated ? `?v=${encodeURIComponent(s.cover_updated)}` : "")}
													alt=""
													className="w-14 h-14 object-cover rounded-lg border border-[var(--color-base-300)] shrink-0"
													onError={(e) => (e.currentTarget.style.display = "none")}
												/>
											) : (
												<div className="w-14 h-14 rounded-lg bg-[var(--color-base-300)] grid place-items-center shrink-0 text-[var(--color-base-content)]/30">
													<ImageIcon className="w-6 h-6" />
												</div>
											)}
											<div className="min-w-0 flex-1">
												<div className="flex items-center gap-2 flex-wrap">
													<p className="font-semibold truncate text-sm">
														{s.game_name || (s.game_id ? t("metadataAdmin.gameContribution") : t("metadataAdmin.systemContribution"))}
													</p>
													{s.system_name ? <span className="badge badge-ghost badge-sm shrink-0">{s.system_name}</span> : null}
													{s.kind === "new_game" ? <span className="badge badge-primary badge-sm shrink-0">{t("metadataAdmin.newGame")}</span> : null}
												</div>
												<div className="flex flex-wrap gap-1 mt-1">
													{(s.change_kinds || []).map((k) => (
														<span key={k} className="badge badge-outline badge-xs">{kindLabel(k)}</span>
													))}
												</div>
												<p className="text-xs text-[var(--color-base-content)]/50 mt-1">
													{t("metadataAdmin.by")} <UserLink>{s.submitted_by_name}</UserLink> · {formatDate(s.created_at)}
													{s.reviewed_by_name ? <span> · {t("metadataAdmin.reviewedBy")} <UserLink>{s.reviewed_by_name}</UserLink></span> : null}
												</p>
											</div>
											<span className={`badge ${BADGE[s.status]} shrink-0`}>{t("metadataStatus." + s.status, { defaultValue: s.status })}</span>
										</div>
									</div>
								))}
							</div>
							<Pagination page={currentPage} totalPages={totalPages} onChange={setPage} />
						</>
					)}
				</>
			)}

			{detail ? (
				<div className="fixed inset-0 z-50 bg-black/70 backdrop-blur-sm flex items-start justify-center overflow-y-auto p-4" onClick={(e) => e.target === e.currentTarget && setDetail(null)}>
					<div className="card w-full max-w-5xl my-8 p-6 space-y-4">
						<div className="flex items-start justify-between gap-3">
							<div className="min-w-0">
								<div className="flex items-center gap-2 flex-wrap">
									<h2 className="text-xl font-bold truncate">{gameName || t("metadataAdmin.submissionTitle")}</h2>
									{systemName ? <span className="badge badge-ghost badge-sm shrink-0">{systemName}</span> : null}
									{subRegion ? <span className="badge badge-ghost badge-sm shrink-0">{regionLabel(t, subRegion)}</span> : null}
									{detail.submission.kind === "new_game" ? <span className="badge badge-primary badge-sm shrink-0">{t("metadataAdmin.newGame")}</span> : null}
								</div>
								{gameID && systemID ? (
									<Link
										to={`/app/metadata/${systemID}/game/${gameID}`}
										target="_blank"
										rel="noreferrer"
										className="link link-primary text-sm inline-flex items-center gap-1 mt-1"
									>
										<ExternalLink className="w-3.5 h-3.5" />
										{t("metadataAdmin.openGame")}
									</Link>
								) : null}
							</div>
							<button className="btn btn-ghost !p-2 shrink-0" onClick={() => setDetail(null)} aria-label={t("common.close")}>
								<X className="w-5 h-5" />
							</button>
						</div>

						<div className="grid grid-cols-2 gap-4 text-sm">
							<div>
								<p className="label-text">{t("common.status")}</p>
								<span className={`badge ${BADGE[detail.submission.status]}`}>{t("metadataStatus." + detail.submission.status, { defaultValue: detail.submission.status })}</span>
								<p className="label-text mt-3">{t("metadataAdmin.submittedBy")}</p>
								<p><UserLink>{detail.submission.submitted_by_name}</UserLink></p>
							</div>
							<div>
								<p className="label-text">{t("log.created")}</p>
								<p>{formatDate(detail.submission.created_at)}</p>
							</div>
						</div>

						{note ? (
							<div>
								<p className="label-text">{t("metadataAdmin.note")}</p>
								<p className="text-sm text-[var(--color-base-content)]/70 whitespace-pre-wrap">{note}</p>
							</div>
						) : null}

						{textKeys.length > 0 ? (
							<div>
								<p className="label-text mb-2">{t("metadataAdmin.textChanges")}</p>
								<div className="space-y-3">
									{textKeys.map((k) => (
										<div key={k} className="rounded-lg border border-[var(--color-base-300)] p-3 space-y-2">
											<p className="font-medium text-sm">
												{textLabel(k)}
												{(k === "name" || k === "release_year") && subRegion ? ` (${regionLabel(t, subRegion)})` : ""}
											</p>
											<div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
												<div className="min-w-0">
													<span className="inline-block badge badge-ghost badge-sm mb-1">{t("admin.old")}</span>
													<p className="text-sm whitespace-pre-wrap break-words max-h-64 overflow-y-auto text-[var(--color-base-content)]/60">
														{currentValue(k) || <span className="italic opacity-60">{t("metadataAdmin.none")}</span>}
													</p>
												</div>
												<div className="min-w-0">
													<span className="inline-block badge badge-primary badge-sm mb-1">{t("admin.new")}</span>
													<p className="text-sm whitespace-pre-wrap break-words max-h-64 overflow-y-auto">
														{newValue(k) || <span className="italic opacity-60">{t("metadataAdmin.none")}</span>}
													</p>
												</div>
											</div>
										</div>
									))}
								</div>
							</div>
						) : null}

						{detail.files.length > 0 ? (
							<div>
								<p className="label-text mb-2">{t("metadataAdmin.mediaChanges")}</p>
								<div className="space-y-4">
									{detail.files.map((f) => {
										// For an approved submission the target media already holds the
										// new asset, so the old snapshot is used for the "old" side.
										const current = (oldMedia.length > 0 ? oldMedia : detail.media).find((m) => m.kind === f.kind && (m.region || "") === (f.region || ""));
										const isVideo = f.kind === "video";
										return (
											<div key={f.id} className="space-y-2">
												<p className="font-medium text-sm flex items-center gap-2">
													{t(MEDIA_LABEL[f.kind])}
													{f.region ? <span className="badge badge-ghost badge-xs">{regionLabel(t, f.region)}</span> : null}
												</p>
												<div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
													{isVideo ? (
														current ? (
															<CompareVideo label={t("admin.old")} url={mediaUrl(current.object_key, current.created_at)} size={current.size} />
														) : (
															<EmptySlot label={t("admin.old")} />
														)
													) : current ? (
														<CompareImage label={t("admin.old")} url={mediaUrl(current.object_key, current.created_at)} size={current.size} onOpen={setLightbox} />
													) : (
														<EmptySlot label={t("admin.old")} />
													)}
													{isVideo ? (
														<CompareVideo label={t("admin.new")} url={mediaUrl(f.object_key, f.created_at)} size={f.size} file={f} highlight />
													) : (
														<CompareImage label={t("admin.new")} url={mediaUrl(f.object_key, f.created_at)} size={f.size} onOpen={setLightbox} highlight />
													)}
												</div>
											</div>
										);
									})}
								</div>
							</div>
						) : (
							<p className="text-sm text-[var(--color-base-content)]/50">{t("metadataAdmin.noFiles")}</p>
						)}

						{detail.submission.status === "pending" ? (
							<div className="space-y-3">
								<textarea className="input !h-auto min-h-[4rem] py-2.5" placeholder={t("metadataAdmin.commentPlaceholder")} value={comment} onChange={(e) => setComment(e.target.value)} disabled={busy} />
								{busy ? (
									<div className="space-y-1">
										<div className="relative h-1.5 rounded-full bg-[var(--color-base-300)] overflow-hidden">
											<div className="absolute inset-y-0 w-1/2 rounded-full bg-[var(--color-primary)] animate-[progress-slide_1.2s_linear_infinite]" />
										</div>
										<p className="text-xs text-[var(--color-base-content)]/60">
											{typeof detail.submission.payload.description === "string" && detail.submission.payload.description
												? t("metadataAdmin.approvingWithTranslations")
												: t("metadataAdmin.approving")}
										</p>
									</div>
								) : null}
								<div className="flex justify-end gap-2">
									<button className="btn btn-danger" onClick={reject} disabled={busy}>
										<AlertTriangle className="w-4 h-4" />
										{t("metadataAdmin.reject")}
									</button>
									<button className="btn btn-primary" onClick={approve} disabled={busy}>
										<ShieldCheck className="w-4 h-4" />
										{t("metadataAdmin.approve")}
									</button>
								</div>
							</div>
						) : detail.submission.review_comment ? (
							<div>
								<p className="label-text">{t("metadataAdmin.reviewComment")}</p>
								<p className="text-sm text-[var(--color-base-content)]/70">{detail.submission.review_comment}</p>
							</div>
						) : null}
					</div>
				</div>
			) : null}

			{lightbox ? (
				<div className="fixed inset-0 z-[60] bg-black/90 backdrop-blur-sm flex items-center justify-center p-4" onClick={(e) => e.target === e.currentTarget && setLightbox(null)}>
					<div className="w-full max-w-6xl space-y-3">
						<div className="flex items-center justify-between text-white">
							<h2 className="text-lg font-bold">{lightbox.label}</h2>
							<button className="btn btn-ghost !p-2" type="button" onClick={() => setLightbox(null)} aria-label={t("common.close")}>
								<X className="w-5 h-5" />
							</button>
						</div>
						<img src={lightbox.url} alt={lightbox.label} className="w-full max-h-[85vh] object-contain rounded-lg bg-black/40" />
					</div>
				</div>
			) : null}

			{approved ? (
				<div className="fixed inset-0 z-50 bg-black/70 backdrop-blur-sm flex items-center justify-center p-4">
					<div className="card w-full max-w-md p-6 space-y-4 text-center">
						<ShieldCheck className="w-10 h-10 mx-auto text-[var(--color-success)]" />
						<h2 className="text-xl font-bold">{t("metadataAdmin.approvedTitle")}</h2>
						<p className="text-sm text-[var(--color-base-content)]/70">
							{approved.description
								? t("metadataAdmin.approvedWithTranslations")
								: t("metadataAdmin.approvedBody")}
						</p>
						<div className="flex justify-center">
							<button className="btn btn-primary" onClick={() => setApproved(null)} autoFocus>
								{t("metadataAdmin.ok")}
							</button>
						</div>
					</div>
				</div>
			) : null}
		</div>
	);
}

// EmptySlot renders a placeholder when the target has no current media of the
// submitted kind (a brand-new asset rather than a replacement).
function EmptySlot({ label }: { label: string }) {
	const { t } = useTranslation();
	return (
		<div className="rounded-lg border border-dashed border-[var(--color-base-300)] p-3 space-y-2">
			<span className="inline-block badge badge-ghost badge-sm">{label}</span>
			<div className="h-40 flex items-center justify-center text-sm text-[var(--color-base-content)]/40">{t("metadataAdmin.none")}</div>
		</div>
	);
}

// CompareImage shows an image at full size with its resolution (read from the
// loaded bitmap) and file size. Clicking opens the lightbox.
function CompareImage({ label, url, size, highlight, onOpen }: { label: string; url: string; size?: number; highlight?: boolean; onOpen: (lb: { url: string; label: string }) => void }) {
	const [dim, setDim] = useState<string | null>(null);
	return (
		<div className={`rounded-lg border p-3 space-y-2 ${highlight ? "border-[var(--color-primary)]/40" : "border-[var(--color-base-300)]"}`}>
			<div className="flex items-center justify-between gap-2">
				<span className={`badge badge-sm ${highlight ? "badge-primary" : "badge-ghost"}`}>{label}</span>
				<span className="text-[11px] text-[var(--color-base-content)]/50">{dim ? `${dim} · ` : ""}{fmtSize(size)}</span>
			</div>
			<button type="button" className="block w-full" onClick={() => onOpen({ url, label })}>
				<img
					src={url}
					alt={label}
					className="w-full max-h-[45vh] object-contain rounded-md bg-[var(--color-base-300)]/40"
					onLoad={(e) => setDim(`${e.currentTarget.naturalWidth}×${e.currentTarget.naturalHeight}`)}
					onError={(e) => (e.currentTarget.style.display = "none")}
				/>
			</button>
		</div>
	);
}

// CompareVideo shows a video with its size and (for new submissions) the probe
// metadata captured at upload time.
function CompareVideo({ label, url, size, file, highlight }: { label: string; url: string; size?: number; file?: MetadataSubmissionFile; highlight?: boolean }) {
	const { t } = useTranslation();
	return (
		<div className={`rounded-lg border p-3 space-y-2 ${highlight ? "border-[var(--color-primary)]/40" : "border-[var(--color-base-300)]"}`}>
			<div className="flex items-center justify-between gap-2">
				<span className={`badge badge-sm ${highlight ? "badge-primary" : "badge-ghost"}`}>{label}</span>
				<span className="text-[11px] text-[var(--color-base-content)]/50">{fmtSize(size)}</span>
			</div>
			<video src={url} controls className="w-full max-h-[45vh] rounded-md bg-black" />
			{file ? (
				<div className="grid grid-cols-2 gap-x-3 gap-y-0.5 text-[11px] text-[var(--color-base-content)]/60">
					<p>{t("metadataAdmin.format")}: {file.video_format || file.file_name.split(".").pop() || "—"}</p>
					<p>{t("metadataAdmin.codec")}: {file.video_codec || "—"}</p>
					<p>{t("metadataAdmin.resolution")}: {file.width && file.height ? `${file.width}×${file.height}` : "—"}</p>
					<p>{t("metadataAdmin.fps")}: {file.fps ? `${file.fps} fps` : "—"}</p>
					<p>{t("metadataAdmin.duration")}: {file.duration_sec ? `${file.duration_sec.toFixed(1)}s` : "—"}</p>
				</div>
			) : null}
		</div>
	);
}
