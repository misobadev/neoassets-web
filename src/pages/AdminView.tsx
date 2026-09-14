import { useEffect, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { useTranslation } from "react-i18next";
import { ChevronLeft } from "lucide-react";
import { api, reviewToken, cdnUrl, type SubmissionDetail } from "../lib/api";
import { formatDate } from "../lib/format";
import { useSystems } from "../lib/systems";
import UserLink from "../components/UserLink";

const STATUS_BADGE: Record<string, string> = {
	pending: "badge-warning",
	approved: "badge-success",
	rejected: "badge-error",
};

function coveredSystems(files: { kind: string; system_id: string }[], total: number): { covered: number; pct: number } {
	const covered = new Set(files.filter((f) => f.kind === "background" && f.system_id).map((f) => f.system_id)).size;
	const pct = total > 0 ? Math.round((covered / total) * 100) : 0;
	return { covered, pct };
}

export default function AdminView() {
	const { t } = useTranslation();
	const navigate = useNavigate();
	const [status, setStatus] = useState("pending");
	const [submissions, setSubmissions] = useState<SubmissionDetail[] | null>(null);
	const [listMsg, setListMsg] = useState<string | null>(null);
	const { systems } = useSystems();

	async function loadSubmissions(s: string) {
		setStatus(s);
		setSubmissions(null);
		setListMsg(null);
		try {
			const q = s ? `?status=${s}` : "";
			const data = await api<{ submissions: SubmissionDetail[] }>(`/api/v1/admin/submissions${q}`, { token: reviewToken() });
			setSubmissions(data.submissions || []);
		} catch (e) {
			setSubmissions([]);
			setListMsg((e as Error).message);
		}
	}

	useEffect(() => {
		loadSubmissions("pending");
		// eslint-disable-next-line react-hooks/exhaustive-deps
	}, []);

	return (
		<div className="space-y-6">
			<div className="flex items-center gap-3">
				<Link to="/app/admin" className="btn btn-ghost !p-2" aria-label={t("common.back")}>
					<ChevronLeft className="w-5 h-5" />
				</Link>
				<div>
					<h1 className="text-2xl md:text-3xl font-bold tracking-tight">{t("admin.title")}</h1>
					<p className="text-[var(--color-base-content)]/60">{t("admin.subtitle")}</p>
				</div>
			</div>

			<div className="flex flex-wrap items-center gap-2">
				{[
					{ label: t("admin.filter.pending"), value: "pending" },
					{ label: t("admin.filter.approved"), value: "approved" },
					{ label: t("admin.filter.rejected"), value: "rejected" },
					{ label: t("common.all"), value: "" },
				].map((f) => (
					<button key={f.label} className={`btn btn-sm ${status === f.value ? "btn-primary" : "btn-ghost"}`} type="button" onClick={() => loadSubmissions(f.value)}>
						{f.label}
					</button>
				))}
			</div>

			{submissions === null ? (
				<p className="text-sm text-[var(--color-base-content)]/50 py-8 text-center">{t("admin.loadingSubmissions")}</p>
			) : submissions.length === 0 ? (
				<p className="text-sm text-[var(--color-base-content)]/50 py-8 text-center">{listMsg || t("admin.noSubmissions")}</p>
			) : (
				<div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
					{submissions.map((s) => {
						const images = (s.files || []).filter((f) => f.kind === "preview" || f.kind === "background").map((f) => cdnUrl(f.object_key) + (f.created_at ? `?v=${encodeURIComponent(f.created_at)}` : ""));
						const { covered, pct } = coveredSystems(s.files || [], systems.length);
						return (
							<button key={s.id} type="button" onClick={() => navigate(`/app/admin/sap/${s.id}`)} className="card card-hover overflow-hidden flex flex-col text-left">
								<div className="h-32 bg-[var(--color-base-300)] flex items-center justify-center overflow-hidden">
									{images.length > 0 ? (
										<div className="flex flex-wrap items-center justify-center gap-1 p-2">
											{images.slice(0, 4).map((src, i) => (
												<img key={i} src={src} alt="" className="w-16 h-16 object-cover rounded-md" onError={(e) => (e.currentTarget.style.display = "none")} />
											))}
										</div>
									) : (
										<span className="text-sm font-semibold text-[var(--color-base-content)]/30">{t("admin.noImages")}</span>
									)}
								</div>
								<div className="p-4 space-y-2 flex-1 flex flex-col">
									<div className="flex items-center justify-between gap-2">
										<h3 className="font-semibold truncate">{s.name || t("admin.untitledPack")}</h3>
										<span className={`badge ${STATUS_BADGE[s.status] || "badge-info"} shrink-0`}>{t("status." + s.status)}</span>
									</div>
									<p className="text-xs text-[var(--color-base-content)]/50">
										{t("admin.by")} <UserLink>{s.submitted_by || s.author}</UserLink> · {formatDate(s.created_at)}
									</p>
									{s.reviewed_by_name ? <p className="text-xs text-[var(--color-base-content)]/50">{t("admin.reviewedBy")} <UserLink>{s.reviewed_by_name}</UserLink></p> : null}
									{s.admin_version ? <p className="text-xs text-[var(--color-base-content)]/50">{t("common.version")}: <span className="font-mono text-[var(--color-primary)]">{s.admin_version}</span></p> : null}
									<div className="pt-2 border-t border-[var(--color-base-300)] space-y-1.5">
										<div className="flex items-center justify-between text-[11px] text-[var(--color-base-content)]/50">
											<span>{t("admin.systemsCovered")}</span>
											<span>{covered}/{systems.length}{systems.length > 0 ? ` (${pct}%)` : ""}</span>
										</div>
										<div className="h-1.5 w-full overflow-hidden rounded-full bg-[var(--color-base-300)]">
											<div className="h-full rounded-full bg-[var(--color-primary)] transition-[width] duration-300" style={{ width: `${pct}%` }} />
										</div>
									</div>
								</div>
							</button>
						);
					})}
				</div>
			)}
		</div>
	);
}
