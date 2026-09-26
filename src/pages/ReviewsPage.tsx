import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { useTranslation } from "react-i18next";
import { Check, ChevronLeft, Clock, Image as ImageIcon, Sparkles, Trash2, X, Zap } from "lucide-react";
import { cancelMetadataSubmission, cdnUrl, fetchMetadataGameDetail, fetchPackDetail, trashSubmission, type MediaKind, type MetadataMedia, type PackDetail } from "../lib/api";
import { formatDate } from "../lib/format";
import Pagination from "../components/Pagination";
import { useReviews, loadReviews, type ReviewItem, type ReviewStatus } from "../lib/reviews";

const PER_PAGE = 20;

const STATUS_BADGE: Record<ReviewStatus, string> = {
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

function mediaUrl(objectKey: string, v?: string): string {
	return cdnUrl(objectKey) + (v ? `?v=${encodeURIComponent(v)}` : "");
}

export default function ReviewsPage() {
	const { t } = useTranslation();
	const { markAllSeen } = useReviews();
	const [statusFilter, setStatusFilter] = useState<ReviewStatus | "">("");
	const [kindFilter, setKindFilter] = useState<"" | "metadata" | "sap">("");
	const [page, setPage] = useState(1);
	const [items, setItems] = useState<ReviewItem[]>([]);
	const [total, setTotal] = useState(0);
	const [totalXP, setTotalXP] = useState(0);
	const [loading, setLoading] = useState(false);
	const [selected, setSelected] = useState<ReviewItem | null>(null);
	const [gameMedia, setGameMedia] = useState<MetadataMedia[]>([]);
	const [pack, setPack] = useState<PackDetail | null>(null);
	const [reloadTick, setReloadTick] = useState(0);
	const [confirmCancel, setConfirmCancel] = useState(false);
	const [cancelling, setCancelling] = useState(false);

	// The kind filter (game metadata vs system art pack) is applied client-side
	// over the loaded feed.
	const visibleItems = kindFilter ? items.filter((r) => r.kind === kindFilter) : items;
	const visibleTotal = kindFilter ? visibleItems.length : total;
	const totalPages = Math.max(1, Math.ceil(visibleTotal / PER_PAGE));
	const pageItems = visibleItems.slice((page - 1) * PER_PAGE, page * PER_PAGE);

	// The feed is paginated server-side: each page fetches the newest
	// page*PER_PAGE items of the merged review list (the top N of the merge is
	// contained in the union of the top N of both sources), so we never load the
	// whole history at once.
	useEffect(() => {
		let cancelled = false;
		setLoading(true);
		loadReviews(page * PER_PAGE, statusFilter === "" ? "review" : statusFilter)
			.then(({ items: list, total: t, totalXP: xp }) => {
				if (cancelled) return;
				setItems(list);
				setTotal(t);
				setTotalXP(xp);
			})
			.finally(() => {
				if (!cancelled) setLoading(false);
			});
		return () => {
			cancelled = true;
		};
	}, [page, statusFilter, reloadTick]);

	useEffect(() => {
		markAllSeen();
	}, [markAllSeen]);

	// Reset to the first page when a filter changes.
	useEffect(() => {
		setPage(1);
	}, [statusFilter, kindFilter]);

	// Keep the page in range when the list shrinks (e.g. after a refetch).
	useEffect(() => {
		if (page > totalPages) setPage(totalPages);
	}, [page, totalPages]);

	// Approved metadata media lives on the game; approved SAP art lives on the
	// pack. Fetch the target so the review detail can show what was published.
	useEffect(() => {
		setGameMedia([]);
		setPack(null);
		if (!selected || selected.status !== "approved") return;
		let cancelled = false;
		if (selected.kind === "metadata" && selected.gameId) {
			fetchMetadataGameDetail(selected.gameId)
				.then((g) => !cancelled && setGameMedia(g.media || []))
				.catch(() => {});
		} else if (selected.kind === "sap" && selected.packId) {
			fetchPackDetail(selected.packId)
				.then((p) => !cancelled && setPack(p))
				.catch(() => {});
		}
		return () => {
			cancelled = true;
		};
	}, [selected]);

	function kindLabel(key: string): string {
		if (TEXT_LABEL[key]) return t(TEXT_LABEL[key]);
		const media = MEDIA_LABEL[key as MediaKind];
		if (media) return t(media);
		return key;
	}

	function textValue(key: string): string {
		const payload = selected?.payload || {};
		if (key === "release_year") {
			const y = payload.release_year;
			if (y === undefined || y === null || y === "") return "";
			const m = payload.release_month;
			return `${y}${m ? `-${String(m).padStart(2, "0")}` : ""}`;
		}
		const v = payload[key];
		return v === undefined || v === null ? "" : String(v);
	}

	// cancelSelected deletes the current user's own submission so it can be
	// submitted again without waiting for a review.
	async function cancelSelected() {
		if (!selected) return;
		setCancelling(true);
		try {
			if (selected.kind === "metadata") await cancelMetadataSubmission(selected.id);
			else await trashSubmission(selected.id);
			setConfirmCancel(false);
			setSelected(null);
			setReloadTick((n) => n + 1);
		} catch (e) {
			alert((e as Error).message);
		} finally {
			setCancelling(false);
		}
	}

	const filters: { label: string; value: ReviewStatus | "" }[] = [
		{ label: t("common.all"), value: "" },
		{ label: t("metadataStatus.pending"), value: "pending" },
		{ label: t("metadataStatus.approved"), value: "approved" },
		{ label: t("metadataStatus.rejected"), value: "rejected" },
	];

	const changeKinds = selected?.changeKinds || [];
	const textKinds = changeKinds.filter((k) => TEXT_LABEL[k]);
	const mediaKinds = changeKinds.filter((k) => MEDIA_LABEL[k as MediaKind]);
	const publishedMedia = gameMedia.filter((m) => mediaKinds.includes(m.kind));

	return (
		<div className="space-y-6">
			<div className="flex items-center gap-3">
				<Link to="/app/home" className="btn btn-ghost !p-2" aria-label={t("common.back")}>
					<ChevronLeft className="w-5 h-5" />
				</Link>
				<div>
					<h1 className="text-2xl md:text-3xl font-bold tracking-tight">{t("reviews.title")}</h1>
					<p className="text-sm text-[var(--color-base-content)]/60 pt-1">{t("reviews.subtitle")}</p>
				</div>
				<div className="ml-auto card px-4 py-2 flex items-center gap-2 shrink-0">
					<Sparkles className="w-5 h-5 text-[var(--color-primary)]" />
					<div>
						<p className="text-[11px] uppercase tracking-wider text-[var(--color-base-content)]/50">{t("reviews.experienceEarned")}</p>
						<p className="text-lg font-bold leading-none">{totalXP.toLocaleString()}</p>
					</div>
				</div>
			</div>

			<div className="flex flex-wrap items-center gap-2">
				{filters.map((f) => (
					<button
						key={f.value || "all"}
						type="button"
						className={statusFilter === f.value ? "btn btn-sm btn-primary" : "btn btn-sm btn-ghost"}
						onClick={() => setStatusFilter(f.value)}
					>
						{f.label}
					</button>
				))}
				<select
					className="select select-sm w-52 sm:ml-auto"
					value={kindFilter}
					onChange={(e) => setKindFilter(e.target.value as "" | "metadata" | "sap")}
					aria-label={t("reviews.filterKind")}
				>
					<option value="">{t("reviews.kindAll")}</option>
					<option value="metadata">{t("reviews.metadata")}</option>
					<option value="sap">{t("reviews.sap")}</option>
				</select>
			</div>

			{loading && items.length === 0 ? (
				<p className="text-sm text-[var(--color-base-content)]/50 text-center py-10">{t("common.loading")}</p>
			) : visibleItems.length === 0 ? (
				<p className="text-sm text-[var(--color-base-content)]/50 text-center py-10">{t("reviews.empty")}</p>
			) : (
				<>
					{totalPages > 1 ? <Pagination page={page} totalPages={totalPages} onChange={setPage} /> : null}
					<div className="space-y-3">
						{pageItems.map((r) => {
							const boosted = r.status === "approved" && (r.baseXP ?? 0) > 0 && r.xp > (r.baseXP ?? 0);
							const boostPct = boosted ? Math.round((r.xp / (r.baseXP as number) - 1) * 100) : 0;
							return (
						<div key={r.key} className="card card-hover p-4 cursor-pointer" onClick={() => setSelected(r)}>
							<div className="flex items-center gap-3">
								{r.cover ? (
									<img
										src={mediaUrl(r.cover, r.coverUpdated)}
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
										<p className="font-semibold truncate text-sm">{r.title}</p>
										{r.systemName ? <span className="badge badge-ghost badge-sm shrink-0">{r.systemName}</span> : null}
										<span className="badge badge-ghost badge-sm shrink-0">{t(r.kind === "metadata" ? "reviews.metadata" : "reviews.sap")}</span>
										{r.newGame ? <span className="badge badge-primary badge-sm shrink-0">{t("metadataAdmin.newGame")}</span> : null}
									</div>
									{(r.changeKinds || []).length > 0 ? (
										<div className="flex flex-wrap gap-1 mt-1">
											{(r.changeKinds || []).map((k) => (
												<span key={k} className="badge badge-outline badge-xs">{kindLabel(k)}</span>
											))}
										</div>
									) : null}
									<p className="text-xs text-[var(--color-base-content)]/50 mt-1">{formatDate(r.at)}</p>
								</div>
								<div className="flex items-center gap-2 shrink-0">
									{r.status === "approved" && r.xp > 0 ? (
										boosted ? (
											<span className="badge badge-lime badge-sm gap-1" title={t("reviews.boostTitle", { pct: boostPct })}>
												<Zap className="w-3 h-3" />
												+{r.xp} {t("reviews.experience")} · +{boostPct}%
											</span>
										) : (
											<span className="badge badge-primary badge-sm gap-1">
												<Sparkles className="w-3 h-3" />
												+{r.xp} {t("reviews.experience")}
											</span>
										)
									) : null}
									<span className={`badge ${STATUS_BADGE[r.status]} shrink-0`}>{t("metadataStatus." + r.status, { defaultValue: r.status })}</span>
								</div>
							</div>
						</div>
							);
						})}
					</div>
					{totalPages > 1 ? <Pagination page={page} totalPages={totalPages} onChange={setPage} /> : null}
				</>
			)}

			{selected ? (
				<div className="fixed inset-0 z-50 bg-black/70 backdrop-blur-sm flex items-start justify-center overflow-y-auto p-4" onClick={(e) => e.target === e.currentTarget && setSelected(null)}>
					<div className="card w-full max-w-2xl my-8 p-6 space-y-4">
						<div className="flex items-center justify-between gap-3">
							<div className="flex items-center gap-2 min-w-0">
								{selected.status === "approved" ? (
									<div className="grid size-9 place-items-center rounded-full bg-[var(--color-success)]/15 shrink-0">
										<Check className="w-5 h-5 text-[var(--color-success)]" />
									</div>
								) : selected.status === "rejected" ? (
									<div className="grid size-9 place-items-center rounded-full bg-[var(--color-error)]/15 shrink-0">
										<X className="w-5 h-5 text-[var(--color-error)]" />
									</div>
								) : (
									<div className="grid size-9 place-items-center rounded-full bg-[var(--color-warning)]/15 shrink-0">
										<Clock className="w-5 h-5 text-[var(--color-warning)]" />
									</div>
								)}
								<div className="min-w-0">
									<h2 className="text-lg font-bold truncate">{selected.title}</h2>
									{selected.systemName ? <p className="text-xs text-[var(--color-base-content)]/60">{selected.systemName}</p> : null}
								</div>
							</div>
							<span className={`badge ${STATUS_BADGE[selected.status]} shrink-0`}>{t("metadataStatus." + selected.status, { defaultValue: selected.status })}</span>
						</div>

						<div className="grid grid-cols-2 gap-3 text-sm">
							<div>
								<p className="label-text">{t("reviews.type")}</p>
								<p>{t(selected.kind === "metadata" ? "reviews.metadata" : "reviews.sap")}</p>
							</div>
							<div>
								<p className="label-text">{t("reviews.date")}</p>
								<p>{formatDate(selected.at)}</p>
							</div>
							{selected.reviewer ? (
								<div>
									<p className="label-text">{t("reviews.reviewedBy")}</p>
									<p>{selected.reviewer}</p>
								</div>
							) : null}
							{selected.status === "approved" ? (
								<div>
									<p className="label-text">{t("reviews.experienceEarned")}</p>
									<p className="font-semibold text-[var(--color-primary)]">+{selected.xp} {t("reviews.experience")}</p>
								</div>
							) : null}
						</div>

						{/* Published content: the approved text and media. */}
						{textKinds.length > 0 || publishedMedia.length > 0 || (selected.kind === "sap" && pack) ? (
							<div className="space-y-3">
								<p className="label-text">{selected.status === "approved" ? t("reviews.approvedContent") : t("reviews.submittedContent")}</p>

								{textKinds.map((k) => (
									<div key={k} className="rounded-lg border border-[var(--color-base-300)] p-3">
										<p className="font-medium text-sm mb-1">{kindLabel(k)}</p>
										<p className="text-sm text-[var(--color-base-content)]/70 whitespace-pre-wrap break-words max-h-64 overflow-y-auto">
											{textValue(k) || <span className="italic opacity-60">{t("reviews.noComment")}</span>}
										</p>
									</div>
								))}

								{publishedMedia.map((m) =>
									m.kind === "video" ? (
										<video key={m.id} src={mediaUrl(m.object_key, m.created_at)} controls className="w-full max-h-[45vh] rounded-lg border border-[var(--color-base-300)] bg-black" />
									) : (
										<img
											key={m.id}
											src={mediaUrl(m.object_key, m.created_at)}
											alt={kindLabel(m.kind)}
											className="w-full max-h-[45vh] object-contain rounded-lg border border-[var(--color-base-300)] bg-[var(--color-base-300)]/40"
											onError={(e) => (e.currentTarget.style.display = "none")}
										/>
									),
								)}

								{selected.kind === "sap" && pack
									? (() => {
											const bgs = (pack.files || []).filter((f) => f.kind === "background");
											if (bgs.length === 0) return null;
											return (
												<div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
													{bgs.map((f) => (
														<img
															key={f.object_key}
															src={f.url}
															alt=""
															className="w-full h-28 object-cover rounded-lg border border-[var(--color-base-300)]"
															onError={(e) => (e.currentTarget.style.display = "none")}
														/>
													))}
												</div>
											);
										})()
									: null}
							</div>
						) : null}

						{selected.status !== "pending" ? (
							<div>
								<p className="label-text">{t("reviews.reviewerComment")}</p>
								<p className="text-sm text-[var(--color-base-content)]/70 whitespace-pre-wrap">
									{selected.comment ? selected.comment : <span className="italic text-[var(--color-base-content)]/40">{t("reviews.noComment")}</span>}
								</p>
							</div>
						) : null}

						<div className="flex justify-end gap-2">
							{selected.status === "pending" ? (
								<button type="button" className="btn btn-error btn-outline mr-auto" onClick={() => setConfirmCancel(true)}>
									<Trash2 className="w-4 h-4" />
									{t("reviews.cancel")}
								</button>
							) : null}
							<button className="btn btn-ghost" type="button" onClick={() => setSelected(null)}>{t("common.close")}</button>
							{selected.status === "approved" && selected.href ? (
								<Link to={selected.href} className="btn btn-primary" onClick={() => setSelected(null)}>
									{selected.kind === "metadata" ? t("reviews.viewGame") : t("reviews.viewPack")}
								</Link>
							) : null}
						</div>
					</div>
				</div>
			) : null}

			{confirmCancel && selected ? (
				<div className="fixed inset-0 z-[60] bg-black/70 backdrop-blur-sm flex items-center justify-center p-4" onClick={(e) => e.target === e.currentTarget && !cancelling && setConfirmCancel(false)}>
					<div className="card w-full max-w-md p-6 space-y-4">
						<div className="flex items-start gap-3">
							<div className="grid size-9 place-items-center rounded-full bg-[var(--color-error)]/15 shrink-0">
								<Trash2 className="w-5 h-5 text-[var(--color-error)]" />
							</div>
							<div className="min-w-0">
								<h2 className="text-lg font-bold">{t("reviews.cancelConfirmTitle")}</h2>
								<p className="text-sm text-[var(--color-base-content)]/70 mt-1">{t("reviews.cancelConfirmBody")}</p>
							</div>
						</div>
						<div className="flex justify-end gap-2">
							<button className="btn btn-ghost" type="button" onClick={() => setConfirmCancel(false)} disabled={cancelling}>{t("common.cancel")}</button>
							<button className="btn btn-error" type="button" onClick={cancelSelected} disabled={cancelling}>
								{cancelling ? t("common.loading") : t("reviews.cancel")}
							</button>
						</div>
					</div>
				</div>
			) : null}
		</div>
	);
}
