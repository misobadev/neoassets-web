import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { AlertTriangle, ChevronLeft, ShieldCheck, X } from "lucide-react";
import { useTranslation } from "react-i18next";
import UserLink from "../components/UserLink";
import {
	approveMetadataSubmission,
	cdnUrl,
	rejectMetadataSubmission,
	fetchMetadataSubmissionDetail,
	fetchMetadataSubmissions,
	type MetadataSubmission,
	type MetadataSubmissionFile,
	type MetadataStatus,
} from "../lib/api";
import { formatDate } from "../lib/format";

const BADGE: Record<MetadataStatus, string> = {
	created: "badge-info",
	pending: "badge-warning",
	approved: "badge-success",
	rejected: "badge-error",
};

export default function MetadataAdminView() {
	const { t } = useTranslation();
	const [status, setStatus] = useState<MetadataStatus | "">("pending");
	const [submissions, setSubmissions] = useState<MetadataSubmission[] | null>(null);
	const [detail, setDetail] = useState<{ submission: MetadataSubmission; files: MetadataSubmissionFile[] } | null>(null);
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
			setDetail({ submission: d.submission, files: d.files || [] });
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
		} catch (e) {
			alert((e as Error).message);
		} finally {
			setBusy(false);
		}
	}

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
				<div className="space-y-3">
					{submissions.map((s) => (
						<div key={s.id} className="card card-hover p-4 cursor-pointer" onClick={() => open(s.id)}>
							<div className="flex items-center justify-between gap-3">
								<div className="min-w-0">
									<p className="font-semibold truncate text-sm">
										{s.game_id ? t("metadataAdmin.gameContribution") : t("metadataAdmin.systemContribution")}
									</p>
									<p className="text-xs text-[var(--color-base-content)]/50 mt-0.5">
										{t("metadataAdmin.by")} <UserLink>{s.submitted_by_name}</UserLink> · {formatDate(s.created_at)}
										{s.reviewed_by_name ? <span> · {t("metadataAdmin.reviewedBy")} <UserLink>{s.reviewed_by_name}</UserLink></span> : null}
									</p>
								</div>
								<span className={`badge ${BADGE[s.status]} shrink-0`}>{t("metadataStatus." + s.status, { defaultValue: s.status })}</span>
							</div>
						</div>
					))}
				</div>
			)}

			{detail ? (
				<div className="fixed inset-0 z-50 bg-black/70 backdrop-blur-sm flex items-start justify-center overflow-y-auto p-4" onClick={(e) => e.target === e.currentTarget && setDetail(null)}>
					<div className="card w-full max-w-3xl my-8 p-6 space-y-4">
						<div className="flex items-center justify-between">
							<h2 className="text-xl font-bold">{t("metadataAdmin.submissionTitle")}</h2>
							<button className="btn btn-ghost !p-2" onClick={() => setDetail(null)} aria-label={t("common.close")}>
								<X className="w-5 h-5" />
							</button>
						</div>

						<div className="grid grid-cols-2 gap-4 text-sm">
							<div>
								<p className="label-text">{t("common.status")}</p>
								<span className={`badge ${BADGE[detail.submission.status]}`}>{t("metadataStatus." + detail.submission.status, { defaultValue: detail.submission.status })}</span>
							</div>
							<div>
								<p className="label-text">{t("log.created")}</p>
								<p>{formatDate(detail.submission.created_at)}</p>
							</div>
						</div>

						<div>
							<p className="label-text">{t("metadataAdmin.payload")}</p>
							<pre className="text-xs bg-[var(--color-base-300)]/40 rounded-lg p-3 overflow-x-auto">{JSON.stringify(detail.submission.payload, null, 2)}</pre>
						</div>

						<div>
							<p className="label-text">{t("metadataAdmin.files", { count: detail.files.length })}</p>
							<div className="flex flex-wrap gap-3 mt-1">
								{detail.files.map((f) =>
									f.kind === "video" ? (
										<div key={f.id} className="w-full space-y-2 rounded-lg border border-[var(--color-base-300)] p-3">
											<video src={cdnUrl(f.object_key) + (f.created_at ? `?v=${encodeURIComponent(f.created_at)}` : "")} controls className="w-full max-h-72 rounded-lg bg-black" />
											<div className="grid grid-cols-2 sm:grid-cols-3 gap-x-4 gap-y-1 text-xs text-[var(--color-base-content)]/70">
												<p><span className="text-[10px] uppercase tracking-wider text-[var(--color-base-content)]/40">{t("metadataAdmin.format")}</span> {f.video_format || f.file_name.split(".").pop() || "—"}</p>
												<p><span className="text-[10px] uppercase tracking-wider text-[var(--color-base-content)]/40">{t("metadataAdmin.codec")}</span> {f.video_codec || "—"}</p>
												<p><span className="text-[10px] uppercase tracking-wider text-[var(--color-base-content)]/40">{t("metadataAdmin.resolution")}</span> {f.width && f.height ? `${f.width}×${f.height}` : "—"}</p>
												<p><span className="text-[10px] uppercase tracking-wider text-[var(--color-base-content)]/40">{t("metadataAdmin.aspectRatio")}</span> {f.width && f.height ? `${(f.width / f.height).toFixed(2)}:1` : "—"}</p>
												<p><span className="text-[10px] uppercase tracking-wider text-[var(--color-base-content)]/40">{t("metadataAdmin.fps")}</span> {f.fps ? `${f.fps} fps` : "—"}</p>
												<p><span className="text-[10px] uppercase tracking-wider text-[var(--color-base-content)]/40">{t("metadataAdmin.duration")}</span> {f.duration_sec ? `${f.duration_sec.toFixed(1)}s` : "—"}</p>
											</div>
										</div>
									) : (
										<img key={f.id} src={cdnUrl(f.object_key) + (f.created_at ? `?v=${encodeURIComponent(f.created_at)}` : "")} alt={f.kind} className="w-24 h-24 object-cover rounded-lg border border-[var(--color-base-300)]" onError={(e) => (e.currentTarget.style.display = "none")} />
									),
								)}
								{detail.files.length === 0 ? <p className="text-sm text-[var(--color-base-content)]/50">{t("metadataAdmin.noFiles")}</p> : null}
							</div>
						</div>

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
