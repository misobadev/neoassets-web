import { useEffect, useState } from "react";
import { Link, useNavigate, useParams } from "react-router-dom";
import { useTranslation } from "react-i18next";
import { AlertTriangle, Check, ChevronLeft, Loader2, Trash2, X } from "lucide-react";
import { api, reviewToken, cdnUrl, isAdmin, type SubmissionDetail, type SubmissionFile } from "../lib/api";
import { formatDate } from "../lib/format";
import { useSystems } from "../lib/systems";
import { useReviews } from "../lib/reviews";
import UserLink from "../components/UserLink";

const STATUS_BADGE: Record<string, string> = {
	created: "badge-info",
	pending: "badge-warning",
	approved: "badge-success",
	rejected: "badge-error",
	trashed: "badge-ghost",
};

function fmtSize(bytes: number): string {
	if (!bytes) return "—";
	if (bytes < 1024) return `${bytes} B`;
	if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(0)} KB`;
	return `${(bytes / 1024 / 1024).toFixed(1)} MB`;
}

function imgUrl(objectKey: string, v?: string): string {
	return cdnUrl(objectKey) + (v ? `?v=${encodeURIComponent(v)}` : "");
}

export default function AdminSubmissionReview() {
	const { t } = useTranslation();
	const { id } = useParams<{ id: string }>();
	const [detail, setDetail] = useState<SubmissionDetail | null>(null);
	const [comment, setComment] = useState("");
	const navigate = useNavigate();
	const [busy, setBusy] = useState(false);
	const [busyAction, setBusyAction] = useState<"approve" | "reject" | "delete" | null>(null);
	const [progress, setProgress] = useState(0);
	const [msg, setMsg] = useState<string | null>(null);
	const [confirmReject, setConfirmReject] = useState(false);
	const [confirmDelete, setConfirmDelete] = useState(false);
	const [lightbox, setLightbox] = useState<{ oldUrl?: string; newUrl: string; label: string; reason?: string } | null>(null);
	const { systems } = useSystems();
	const { refresh: refreshReviews } = useReviews();
	const sysName = (id: string) => systems.find((s) => s.id === id)?.name || id;

	useEffect(() => {
		if (!id) return;
		api<SubmissionDetail>(`/api/v1/admin/submissions/${id}`, { token: reviewToken() })
			.then(setDetail)
			.catch((e: Error) => setMsg(e.message));
	}, [id]);

	async function approve() {
		if (!detail) return;
		setBusyAction("approve");
		setBusy(true);
		setProgress(0);
		try {
			const req = api(`/api/v1/admin/submissions/${detail.id}/approve`, { method: "POST", token: reviewToken(), body: { comment } });
			// Poll the submission while it is being approved: each file row moves
			// to its canonical key as the server progresses, so we can report a
			// real percentage instead of an indeterminate spinner.
			const poll = setInterval(async () => {
				try {
					const d = await api<SubmissionDetail>(`/api/v1/admin/submissions/${detail.id}`, { token: reviewToken() });
					const files = d.files || [];
					const total = files.length;
					const moved = files.filter((f) => !f.object_key.includes("/review/")).length;
					setProgress(total ? Math.round((moved / total) * 100) : 0);
				} catch { /* transient poll error, keep the last value */ }
			}, 700);
			await req;
			clearInterval(poll);
			setProgress(100);
			setMsg(t("admin.approvedMsg"));
			setDetail((d) => (d ? { ...d, status: "approved" } : d));
			refreshReviews();
		} catch (e) {
			setMsg((e as Error).message);
		} finally {
			setBusy(false);
			setBusyAction(null);
		}
	}

	async function deleteConfirmed() {
		if (!detail) return;
		setBusyAction("delete");
		setBusy(true);
		try {
			await api(`/api/v1/admin/submissions/${detail.id}`, { method: "DELETE", token: reviewToken() });
			navigate("/app/admin/sap");
		} catch (e) {
			setMsg((e as Error).message);
			setConfirmDelete(false);
		} finally {
			setBusy(false);
			setBusyAction(null);
		}
	}

	async function rejectConfirmed() {
		if (!detail) return;
		setBusyAction("reject");
		setBusy(true);
		try {
			await api(`/api/v1/admin/submissions/${detail.id}/reject`, { method: "POST", token: reviewToken(), body: { comment } });
			setMsg(t("admin.rejectedMsg"));
			setConfirmReject(false);
			setDetail((d) => (d ? { ...d, status: "rejected" } : d));
			refreshReviews();
		} catch (e) {
			setMsg((e as Error).message);
		} finally {
			setBusy(false);
			setBusyAction(null);
		}
	}

	if (msg && !detail) return <p className="text-sm text-[var(--color-error)] text-center py-10">{msg}</p>;
	if (!detail) return <p className="text-sm text-[var(--color-base-content)]/50 text-center py-10">{t("admin.loadingReview")}</p>;

	return (
		<div className="space-y-6">
			<div className="flex items-center gap-3">
				<Link to="/app/admin/sap" className="btn btn-ghost !p-2" aria-label={t("common.back")}>
					<ChevronLeft className="w-5 h-5" />
				</Link>
				<div className="min-w-0 flex-1">
					<h1 className="text-2xl md:text-3xl font-bold tracking-tight truncate">{detail.name}</h1>
					<p className="text-sm text-[var(--color-base-content)]/60">
						{t("admin.by")} <UserLink>{detail.submitted_by || detail.author}</UserLink> · {formatDate(detail.created_at)} ·{" "}
						<span className={`badge ${STATUS_BADGE[detail.status] || "badge-warning"} !px-2`}>{t("status." + detail.status)}</span>
						{detail.reviewed_by_name ? <> · {t("admin.reviewedBy")} <UserLink>{detail.reviewed_by_name}</UserLink></> : null}
					</p>
				</div>
			</div>

			{detail.description ? <div className="card p-6 text-sm text-[var(--color-base-content)]/70">{detail.description}</div> : null}

			{!detail.ai ? (
				<div className="flex items-start gap-2 rounded-lg border border-[var(--color-warning)]/30 bg-[var(--color-warning)]/10 p-3">
					<AlertTriangle className="w-4 h-4 text-[var(--color-warning)] shrink-0 mt-0.5" />
					<span className="text-xs text-[var(--color-base-content)]/70">{t("admin.aiWarning")}</span>
				</div>
			) : null}

			{(detail.files || []).length > 0 ? (
				(() => {
					const all = detail.files || [];
					const updateOnly = all.some((f) => !f.changed);
					const bgs = all.filter((f) => f.kind === "background");
					const others = all.filter((f) => f.kind !== "background");
					const groups = new Map<string, SubmissionFile[]>();
					for (const f of bgs) {
						const k = f.system_id || "?";
						groups.set(k, [...(groups.get(k) || []), f]);
					}
					const visibleGroups = updateOnly ? [...groups.entries()].filter(([, g]) => g.some((f) => f.changed)) : [...groups.entries()];
					const visibleOthers = updateOnly ? others.filter((f) => f.changed) : others;
					const visibleCount = visibleGroups.reduce((n, [, g]) => n + g.length, 0) + visibleOthers.length;
					return (
						<section className="card p-6 space-y-5">
							<h2 className="font-semibold">
								{t("admin.files", { count: visibleCount })}{updateOnly && <span className="text-xs font-normal text-[var(--color-base-content)]/50"> {t("admin.showingUpdateOnly")}</span>}
							</h2>
							<div className="space-y-5">
								{visibleGroups.length > 0 ? (
									<div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
										{visibleGroups.map(([sys, group]) => (
											<BackgroundCard key={sys} group={group} name={sysName(sys)} onOpen={setLightbox} />
										))}
									</div>
								) : null}
								{visibleOthers.length > 0 ? (
									<div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
										{visibleOthers.map((f) => (
											<OtherCard key={f.id} file={f} onOpen={setLightbox} />
										))}
									</div>
								) : null}
							</div>
						</section>
					);
				})()
			) : null}

			{detail.status === "pending" ? (
				<div className="card p-6 space-y-4">
					<div>
						<label className="label-text" htmlFor="review-comment">{t("admin.commentLabel")}</label>
						<textarea id="review-comment" className="input !h-auto min-h-[4rem] py-2.5 w-full" placeholder={t("admin.commentPlaceholder")} value={comment} onChange={(e) => setComment(e.target.value)} />
					</div>
					<div className="flex flex-wrap gap-2">
						<button className="btn btn-primary" type="button" onClick={approve} disabled={busy}><Check className="w-4 h-4" /> {t("admin.approve")}</button>
						<button className="btn btn-danger" type="button" onClick={() => setConfirmReject(true)} disabled={busy}><X className="w-4 h-4" /> {t("admin.reject")}</button>
						{isAdmin() ? (
							<button className="btn btn-outline btn-error" type="button" onClick={() => setConfirmDelete(true)} disabled={busy}><Trash2 className="w-4 h-4" /> {t("common.delete")}</button>
						) : null}
						<span className="text-xs text-[var(--color-base-content)]/50 self-center">{t("admin.versionAuto")}</span>
					</div>
				</div>
			) : (
				<div className="card p-3 text-sm">
					<span className="text-[var(--color-base-content)]/60">{msg || t("admin.reviewedMsg")}</span>
				</div>
			)}

			{detail.logs?.length ? (
				<section className="card p-6">
					<h2 className="font-semibold mb-3">{t("admin.statusHistory")}</h2>
					<div className="space-y-1">
						{detail.logs.map((l) => (
							<p key={l.id} className="text-xs text-[var(--color-base-content)]/60">
								<span className="font-mono text-[var(--color-info)]">{t("log." + l.action, { defaultValue: l.action })}</span> · {formatDate(l.created_at)}
								{l.user_name ? <> · {t("admin.by")} <UserLink>{l.user_name}</UserLink></> : null}
								{l.detail ? <> · {l.detail}</> : null}
							</p>
						))}
					</div>
				</section>
			) : null}

			{lightbox ? (
				<div className="fixed inset-0 z-[60] bg-black/90 backdrop-blur-sm flex items-center justify-center p-4" onClick={(e) => e.target === e.currentTarget && setLightbox(null)}>
					<div className="w-full max-w-6xl space-y-3">
						<div className="flex items-center justify-between text-white">
							<div className="min-w-0">
								<h2 className="text-lg font-bold">{t("admin.comparison", { label: lightbox.label })}</h2>
								{lightbox.reason ? <p className="text-sm text-white/70 mt-1">{t("admin.reason")} {lightbox.reason}</p> : null}
							</div>
							<button className="btn btn-ghost !p-2" type="button" onClick={() => setLightbox(null)} aria-label={t("common.close")}>
								<X className="w-5 h-5" />
							</button>
						</div>
						<div className={`grid gap-4 ${lightbox.oldUrl ? "grid-cols-1 md:grid-cols-2" : "grid-cols-1"}`}>
							{lightbox.oldUrl ? (
								<div>
									<span className="inline-block badge badge-ghost badge-sm mb-2">{t("admin.old")}</span>
									<img src={lightbox.oldUrl} alt={t("admin.old")} className="w-full max-h-[75vh] object-contain rounded-lg bg-black/40" onError={(e) => (e.currentTarget.style.display = "none")} />
								</div>
							) : null}
							<div>
								<span className="inline-block badge badge-primary badge-sm mb-2">{t("admin.new")}</span>
								<img src={lightbox.newUrl} alt={t("admin.new")} className="w-full max-h-[75vh] object-contain rounded-lg bg-black/40" onError={(e) => (e.currentTarget.style.display = "none")} />
							</div>
						</div>
					</div>
				</div>
			) : null}

			{busyAction ? (
				<div className="fixed inset-0 z-[60] bg-black/70 backdrop-blur-sm flex items-center justify-center p-4" onClick={(e) => e.target === e.currentTarget && null}>
					<div className="card w-full max-w-md p-8 space-y-5 text-center">
						<div className="mx-auto size-12 rounded-full bg-[var(--color-primary)]/15 grid place-items-center">
							<Loader2 className="w-6 h-6 text-[var(--color-primary)] animate-spin" />
						</div>
						<div>
							<h2 className="text-lg font-bold">{busyAction === "approve" ? t("admin.approving") : t("admin.rejecting")}</h2>
							<p className="text-sm text-[var(--color-base-content)]/70 mt-1">
								{busyAction === "approve"
									? t("admin.promoting", { count: (detail?.files || []).length })
									: t("admin.removing")}
							</p>
						</div>
						<div className="relative h-1.5 w-full overflow-hidden rounded-full bg-[var(--color-base-300)]">
							<div className="absolute inset-y-0 left-0 rounded-full bg-[var(--color-primary)] transition-all" style={{ width: `${progress}%` }} />
						</div>
						<p className="text-xs text-[var(--color-base-content)]/60">{progress}%</p>
					</div>
				</div>
			) : null}

			{confirmReject ? (
				<div className="fixed inset-0 z-50 bg-black/70 backdrop-blur-sm flex items-center justify-center p-4" onClick={(e) => e.target === e.currentTarget && setConfirmReject(false)}>
					<div className="card w-full max-w-md p-6 space-y-4">
						<div className="flex items-start gap-3">
							<div className="grid size-9 place-items-center rounded-full bg-[var(--color-error)]/15 shrink-0">
								<X className="w-5 h-5 text-[var(--color-error)]" />
							</div>
							<div className="min-w-0">
								<h2 className="text-lg font-bold">{t("admin.confirmRejectTitle")}</h2>
								<p className="text-sm text-[var(--color-base-content)]/70 mt-1">
									{t("admin.confirmRejectBody")}
								</p>
							</div>
						</div>
						<div className="flex justify-end gap-2">
							<button className="btn btn-ghost" type="button" onClick={() => setConfirmReject(false)}>{t("common.cancel")}</button>
							<button className="btn btn-danger" type="button" disabled={busy} onClick={rejectConfirmed}>{t("admin.reject")}</button>
						</div>
					</div>
				</div>
			) : null}

			{confirmDelete ? (
				<div className="fixed inset-0 z-50 bg-black/70 backdrop-blur-sm flex items-center justify-center p-4" onClick={(e) => e.target === e.currentTarget && setConfirmDelete(false)}>
					<div className="card w-full max-w-md p-6 space-y-4">
						<div className="flex items-start gap-3">
							<div className="grid size-9 place-items-center rounded-full bg-[var(--color-error)]/15 shrink-0">
								<Trash2 className="w-5 h-5 text-[var(--color-error)]" />
							</div>
							<div className="min-w-0">
								<h2 className="text-lg font-bold">{t("admin.confirmDeleteTitle")}</h2>
								<p className="text-sm text-[var(--color-base-content)]/70 mt-1">
									{t("admin.confirmDeleteBody")}
								</p>
							</div>
						</div>
						<div className="flex justify-end gap-2">
							<button className="btn btn-ghost" type="button" onClick={() => setConfirmDelete(false)}>{t("common.cancel")}</button>
							<button className="btn btn-danger" type="button" disabled={busy} onClick={deleteConfirmed}>{t("common.delete")}</button>
						</div>
					</div>
				</div>
			) : null}
		</div>
	);
}

function BackgroundCard({ group, name, onOpen }: { group: SubmissionFile[]; name: string; onOpen: (lb: { oldUrl?: string; newUrl: string; label: string; reason?: string }) => void }) {
	const { t } = useTranslation();
	const sorted = [...group].sort((a, b) => (a.created_at > b.created_at ? 1 : -1));
	const newest = sorted[sorted.length - 1];
	const prior = sorted.length > 1 ? sorted[0] : null;
	const olds: string[] = prior ? [imgUrl(prior.object_key, prior.created_at)] : [];
	if (newest.replaces_object_key) olds.push(imgUrl(newest.replaces_object_key));
	const oldSize = prior ? prior.size : 0;

	return (
		<div className="rounded-lg border border-[var(--color-base-300)] p-4">
			<div className="flex items-center justify-between mb-2">
				<p className="font-medium text-sm">{name}</p>
				{olds.length > 0 ? <span className="badge badge-primary badge-xs">{t("admin.update")}</span> : <span className="badge badge-ghost badge-xs">{t("admin.new")}</span>}
			</div>
			<div className={`grid gap-2 ${olds.length > 0 ? "grid-cols-2" : "grid-cols-1"}`}>
				{olds.length > 0 ? (
					<button type="button" className="text-left" onClick={() => onOpen({ oldUrl: olds[0], newUrl: imgUrl(newest.object_key, newest.created_at), label: name, reason: newest.reason })}>
						<span className="inline-block badge badge-ghost badge-xs mb-1">{t("admin.old")} · {fmtSize(oldSize)}</span>
						<img src={olds[0]} alt={t("admin.old")} className="w-full h-28 object-contain rounded-md border border-[var(--color-base-300)] bg-[var(--color-base-300)]" onError={(e) => (e.currentTarget.style.display = "none")} />
					</button>
				) : null}
				<button type="button" className="text-left" onClick={() => onOpen({ oldUrl: olds.length > 0 ? olds[0] : undefined, newUrl: imgUrl(newest.object_key, newest.created_at), label: name, reason: newest.reason })}>
					<span className="inline-block badge badge-primary badge-xs mb-1">{t("admin.new")} · {fmtSize(newest.size)}</span>
					<img src={imgUrl(newest.object_key, newest.created_at)} alt={t("admin.new")} className="w-full h-28 object-contain rounded-md border border-[var(--color-primary)]/40 bg-[var(--color-base-300)]" onError={(e) => (e.currentTarget.style.display = "none")} />
				</button>
			</div>
			{newest.reason ? (
				<p className="text-xs text-[var(--color-base-content)]/70 mt-2"><span className="font-semibold">{t("admin.reason")}</span> {newest.reason}</p>
			) : null}
			<p className="text-[11px] text-[var(--color-base-content)]/40 mt-1">{newest.file_name}</p>
		</div>
	);
}

function OtherCard({ file, onOpen }: { file: SubmissionFile; onOpen: (lb: { oldUrl?: string; newUrl: string; label: string; reason?: string }) => void }) {
	const { t } = useTranslation();
	const label = t("admin.imageKind." + file.kind, { defaultValue: file.kind });
	if (file.kind === "theme" || file.object_key.endsWith(".json")) {
		return (
			<div className="rounded-lg border border-[var(--color-base-300)] p-3">
				<div className="flex items-center justify-between">
					<span className="font-medium text-sm">{label}</span>
					<span className="pill">{file.file_name}</span>
				</div>
				{file.reason ? <p className="text-xs text-[var(--color-base-content)]/60 mt-2">{t("admin.reason")} {file.reason}</p> : null}
			</div>
		);
	}
	return (
		<div className="rounded-lg border border-[var(--color-base-300)] p-4">
			<p className="font-medium text-sm mb-2">{label}</p>
			<button type="button" className="text-left" onClick={() => onOpen({ newUrl: imgUrl(file.object_key, file.created_at), label, reason: file.reason })}>
				<span className="inline-block badge badge-primary badge-xs mb-2">{t("admin.new")} · {fmtSize(file.size)}</span>
				<img src={imgUrl(file.object_key, file.created_at)} alt={label} className="w-full h-32 object-contain rounded-md border border-[var(--color-primary)]/40 bg-[var(--color-base-300)]" onError={(e) => (e.currentTarget.style.display = "none")} />
			</button>
		</div>
	);
}
