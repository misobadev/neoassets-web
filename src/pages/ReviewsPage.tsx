import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { useTranslation } from "react-i18next";
import { Check, ChevronLeft, Clock, Coins, Image as ImageIcon, X } from "lucide-react";
import { cdnUrl, type MediaKind } from "../lib/api";
import { formatDate } from "../lib/format";
import { useReviews, type ReviewItem, type ReviewStatus } from "../lib/reviews";

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

export default function ReviewsPage() {
	const { t } = useTranslation();
	const { items, totalPoints, loading, markAllSeen } = useReviews();
	const [statusFilter, setStatusFilter] = useState<ReviewStatus | "">("");
	const [selected, setSelected] = useState<ReviewItem | null>(null);

	useEffect(() => {
		markAllSeen();
	}, [markAllSeen]);

	function kindLabel(key: string): string {
		if (TEXT_LABEL[key]) return t(TEXT_LABEL[key]);
		const media = MEDIA_LABEL[key as MediaKind];
		if (media) return t(media);
		return key;
	}

	const visible = items.filter((i) => !statusFilter || i.status === statusFilter);
	const filters: { label: string; value: ReviewStatus | "" }[] = [
		{ label: t("common.all"), value: "" },
		{ label: t("metadataStatus.pending"), value: "pending" },
		{ label: t("metadataStatus.approved"), value: "approved" },
		{ label: t("metadataStatus.rejected"), value: "rejected" },
	];

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
					<Coins className="w-5 h-5 text-[var(--color-warning)]" />
					<div>
						<p className="text-[11px] uppercase tracking-wider text-[var(--color-base-content)]/50">{t("reviews.pointsEarned")}</p>
						<p className="text-lg font-bold leading-none">{totalPoints.toLocaleString()}</p>
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
			</div>

			{loading && items.length === 0 ? (
				<p className="text-sm text-[var(--color-base-content)]/50 text-center py-10">{t("common.loading")}</p>
			) : visible.length === 0 ? (
				<p className="text-sm text-[var(--color-base-content)]/50 text-center py-10">{t("reviews.empty")}</p>
			) : (
				<div className="space-y-3">
					{visible.map((r) => (
						<div key={r.key} className="card card-hover p-4 cursor-pointer" onClick={() => setSelected(r)}>
							<div className="flex items-center gap-3">
								{r.cover ? (
									<img
										src={cdnUrl(r.cover) + (r.coverUpdated ? `?v=${encodeURIComponent(r.coverUpdated)}` : "")}
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
									</div>
									{(r.changeKinds || []).length > 0 ? (
										<div className="flex flex-wrap gap-1 mt-1">
											{(r.changeKinds || []).map((k) => (
												<span key={k} className="badge badge-outline badge-xs">{kindLabel(k)}</span>
											))}
										</div>
									) : null}
									<p className="text-xs text-[var(--color-base-content)]/50 mt-1">
										{formatDate(r.at)}
										{r.status === "approved" && r.points > 0 ? <> · +{r.points} {t("reviews.points")}</> : null}
									</p>
								</div>
								<span className={`badge ${STATUS_BADGE[r.status]} shrink-0`}>{t("metadataStatus." + r.status, { defaultValue: r.status })}</span>
							</div>
						</div>
					))}
				</div>
			)}

			{selected ? (
				<div className="fixed inset-0 z-50 bg-black/70 backdrop-blur-sm flex items-start justify-center overflow-y-auto p-4" onClick={(e) => e.target === e.currentTarget && setSelected(null)}>
					<div className="card w-full max-w-lg my-8 p-6 space-y-4">
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
									<p className="label-text">{t("reviews.pointsEarned")}</p>
									<p className="font-semibold text-[var(--color-warning)]">+{selected.points}</p>
								</div>
							) : null}
						</div>

						{(selected.changeKinds || []).length > 0 ? (
							<div>
								<p className="label-text">{t("reviews.changes")}</p>
								<div className="flex flex-wrap gap-1 mt-1">
									{(selected.changeKinds || []).map((k) => (
										<span key={k} className="badge badge-outline badge-sm">{kindLabel(k)}</span>
									))}
								</div>
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
		</div>
	);
}
