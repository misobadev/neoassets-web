import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { ChevronLeft, ChevronRight, Download, Layers, Plus } from "lucide-react";
import { useTranslation } from "react-i18next";
import { api, CDN_BASE, cdnUrl, type Pack, type SubmissionDetail, type SubmissionFile, userToken, userUsername } from "../lib/api";
import { useSystems } from "../lib/systems";
import { loadPackDraft, type PackDraft } from "../lib/draft";
import UserLink from "../components/UserLink";
import DonateButton from "../components/DonateButton";

// coveredSystems counts how many distinct systems already have a background
// image in a submission.
function coveredSystems(files: SubmissionFile[], total: number): { covered: number; pct: number } {
	const covered = new Set(files.filter((f) => f.kind === "background" && f.system_id).map((f) => f.system_id)).size;
	const pct = total > 0 ? Math.round((covered / total) * 100) : 0;
	return { covered, pct };
}

// submissionThumbs returns up to three public thumbnail URLs for a submission.
function submissionThumbs(s: SubmissionDetail): string[] {
	return (s.files || [])
		.filter((f) => (f.kind === "background" || f.kind === "preview") && f.object_key)
		.sort((a, b) => (a.created_at > b.created_at ? -1 : 1))
		.slice(0, 3)
		.map((f) => cdnUrl(f.object_key) + (f.created_at ? `?v=${encodeURIComponent(f.created_at)}` : ""));
}

const STATUS_BADGE: Record<string, string> = {
	created: "badge-info",
	pending: "badge-warning",
	approved: "badge-success",
	rejected: "badge-error",
	trashed: "badge-ghost",
};

export default function SubmissionsView() {
	const { t } = useTranslation();
	const signedIn = !!userToken();
	const [submissions, setSubmissions] = useState<SubmissionDetail[] | null>(null);
	const [error, setError] = useState<string | null>(null);
	const [packs, setPacks] = useState<Pack[] | null>(null);
	const [packsTotal, setPacksTotal] = useState(0);
	const [page, setPage] = useState(0);
	const pageSize = 9;
	const [subPage, setSubPage] = useState(0);
	const subPageSize = 4;
	const [localDraft, setLocalDraft] = useState<PackDraft | null>(null);
	const { systems } = useSystems();

	function load() {
		api<{ submissions: SubmissionDetail[] }>("/api/v1/auth/submissions", { token: userToken() })
			.then((data) => {
				setSubmissions(data.submissions || []);
				setError(null);
			})
			.catch((e: Error) => {
				setSubmissions([]);
				setError(e.message);
			});
	}

	// Approved packs are public: show them to everyone, guests included, sorted
	// by downloads and paginated.
	useEffect(() => {
		api<{ themes: Pack[]; total: number }>(`/api/v1/packs?sort=downloads&limit=${pageSize}&offset=${page * pageSize}`)
			.then((data) => {
				setPacks(data.themes || []);
				setPacksTotal(data.total || 0);
			})
			.catch(() => setPacks([]));
	}, [page]);

	useEffect(() => {
		if (!signedIn) return;
		load();
		loadPackDraft("current")
			.then((d) => setLocalDraft(d))
			.catch(() => {});
	}, [signedIn]);

	// Object URLs for the local draft's image blobs (revoked on cleanup).
	const [draftThumbs, setDraftThumbs] = useState<string[]>([]);
	useEffect(() => {
		if (!localDraft) {
			setDraftThumbs([]);
			return;
		}
		const blobs = (localDraft.files || [])
			.filter((f) => (f.kind === "background" || f.kind === "preview") && f.blob)
			.map((f) => f.blob)
			.filter(Boolean) as Blob[];
		const urls = blobs.slice(0, 3).map((b) => URL.createObjectURL(b));
		setDraftThumbs(urls);
		return () => urls.forEach((u) => URL.revokeObjectURL(u));
	}, [localDraft]);

	const draftCovered = localDraft ? new Set((localDraft.files || []).filter((f) => f.kind === "background" && f.systemId).map((f) => f.systemId)).size : 0;

	const mySubs = submissions || [];
	const subPages = Math.max(1, Math.ceil(mySubs.length / subPageSize));
	const mySubsPage = mySubs.slice(subPage * subPageSize, subPage * subPageSize + subPageSize);

	return (
		<div className="space-y-8">
			<div className="flex items-end justify-between gap-3 flex-wrap">
				<div>
					<h1 className="text-2xl md:text-3xl font-bold tracking-tight">{t("nav.systemArtPack")}</h1>
					<p className="text-[var(--color-base-content)]/60 text-sm">{t("submissions.guestSubtitle")}</p>
				</div>
				{signedIn && submissions && submissions.length > 0 ? (
					<Link to="/app/submissions/new" className="btn btn-primary">
						{t("submissions.newSubmission")}
					</Link>
				) : null}
			</div>

			{!signedIn ? (
				<div className="card p-6 flex flex-col sm:flex-row items-center justify-between gap-4">
					<div>
						<h2 className="font-semibold mb-1">{t("submissions.signInToCreate")}</h2>
						<p className="text-sm text-[var(--color-base-content)]/60">{t("submissions.signInBody")}</p>
					</div>
					<div className="flex flex-wrap items-center gap-3">
						<Link to="/app/register" className="btn btn-primary">{t("nav.createAccount")}</Link>
						<Link to="/app/login" className="btn btn-outline">{t("nav.signIn")}</Link>
					</div>
				</div>
			) : null}

			{/* My submissions: a compact row of small cards, 4 per page */}
			{signedIn ? (
				<section>
					<div className="flex items-end justify-between gap-3 flex-wrap mb-3">
						<div>
							<h2 className="text-lg font-bold tracking-tight">{t("submissions.title")}</h2>
							<p className="text-sm text-[var(--color-base-content)]/60">{t("submissions.subtitle")}</p>
						</div>
						{subPages > 1 ? (
							<div className="flex items-center gap-2">
								<button type="button" className="btn btn-outline btn-xs" disabled={subPage === 0} onClick={() => setSubPage((p) => Math.max(0, p - 1))}>
									<ChevronLeft className="w-3.5 h-3.5" />
								</button>
								<span className="text-xs text-[var(--color-base-content)]/60">{subPage + 1} / {subPages}</span>
								<button type="button" className="btn btn-outline btn-xs" disabled={subPage + 1 >= subPages} onClick={() => setSubPage((p) => p + 1)}>
									<ChevronRight className="w-3.5 h-3.5" />
								</button>
							</div>
						) : null}
					</div>

					{submissions === null ? (
						<p className="text-sm text-[var(--color-base-content)]/50 py-6 text-center">{t("submissions.loading")}</p>
					) : error ? (
						<p className="text-sm text-[var(--color-error)] py-6 text-center">{error}</p>
					) : mySubs.length === 0 && !localDraft ? (
						<Link to="/app/submissions/new" className="card card-hover p-6 flex flex-col items-center justify-center text-center">
							<div className="grid size-12 place-items-center rounded-2xl bg-[var(--color-base-300)] mb-3">
								<Plus className="w-6 h-6 text-[var(--color-primary)]" />
							</div>
							<h3 className="font-semibold text-sm mb-1">{t("submissions.startNew")}</h3>
							<p className="text-xs text-[var(--color-base-content)]/60">{t("submissions.guestSubtitle")}</p>
						</Link>
					) : (
						<div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-3">
							{localDraft ? (
								<Link to="/app/submissions/new" className="card card-hover overflow-hidden flex flex-col">
									<div className="grid grid-cols-3 gap-0.5 bg-[var(--color-base-300)]">
										{[0, 1, 2].map((i) => (
											<div key={i} className="w-full aspect-square overflow-hidden bg-[var(--color-base-300)]">
												{draftThumbs[i] ? <img src={draftThumbs[i]} alt="" className="w-full h-full object-cover" /> : null}
											</div>
										))}
									</div>
									<div className="p-2.5 space-y-1">
										<div className="flex items-center justify-between gap-1.5">
											<p className="font-semibold text-xs truncate">{localDraft.name || t("submissions.untitledDraft")}</p>
											<span className="badge badge-info badge-xs shrink-0">{t("status.created")}</span>
										</div>
										<p className="text-[10px] text-[var(--color-base-content)]/50">{draftCovered}/{systems.length} {t("submissions.systemsShort")}</p>
									</div>
								</Link>
							) : null}

							{mySubsPage.map((s) => {
								const thumbs = submissionThumbs(s);
								const { covered } = coveredSystems(s.files || [], systems.length);
								return (
									<Link key={s.id} to={`/app/submissions/${s.id}`} className="card card-hover overflow-hidden flex flex-col">
										<div className="grid grid-cols-3 gap-0.5 bg-[var(--color-base-300)]">
											{[0, 1, 2].map((i) => (
												<div key={i} className="w-full aspect-square overflow-hidden bg-[var(--color-base-300)]">
													{thumbs[i] ? <img src={thumbs[i]} alt="" className="w-full h-full object-cover" onError={(e) => (e.currentTarget.style.display = "none")} /> : null}
												</div>
											))}
										</div>
										<div className="p-2.5 space-y-1">
											<div className="flex items-center justify-between gap-1.5">
												<p className="font-semibold text-xs truncate">{s.name || t("submissions.untitledPack")}</p>
												<span className={`badge ${STATUS_BADGE[s.status] || "badge-info"} badge-xs shrink-0`}>{t("status." + s.status)}</span>
											</div>
											<p className="text-[10px] text-[var(--color-base-content)]/50">{covered}/{systems.length} {t("submissions.systemsShort")}</p>
											{s.status === "approved" && s.reviewed_by_name ? (
												<p className="text-[10px] text-[var(--color-base-content)]/50 truncate">
													{t("submissions.approvedBy")} <UserLink>{s.reviewed_by_name}</UserLink>
												</p>
											) : null}
										</div>
									</Link>
								);
							})}
						</div>
					)}
				</section>
			) : null}

			{/* Community System Art Packs (full detail) */}
			<section>
				<div className="flex items-end justify-between gap-3 flex-wrap mb-4">
					<div>
						<h2 className="text-xl font-bold tracking-tight">{t("submissions.publicTitle")}</h2>
						<p className="text-[var(--color-base-content)]/60 text-sm">{t("submissions.publicSubtitle")}</p>
					</div>
				</div>

				{packs === null ? (
					<p className="text-sm text-[var(--color-base-content)]/50 py-6 text-center">{t("submissions.loadingPacks")}</p>
				) : packs.length === 0 ? (
					<p className="text-sm text-[var(--color-base-content)]/50 py-6 text-center">{t("submissions.noPacks")}</p>
				) : (
					<div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
						{packs.map((p) => {
							const preview = p.preview ? `${CDN_BASE}/${p.preview}` : "";
							const icons = (p.backgrounds || []).map((k) => `${CDN_BASE}/${k}`);
							const contributed = signedIn && (p.contributors || []).includes(userUsername() || "");
							return (
								<div key={p.folder} className="card card-hover overflow-hidden flex flex-col">
									<div className="h-32 bg-[var(--color-base-300)] flex items-center justify-center overflow-hidden">
										{icons.length > 0 ? (
											<div className="flex flex-wrap items-center justify-center gap-1 p-2">
												{icons.slice(0, 4).map((src, i) => (
													<img key={i} src={src} alt="" className="w-16 h-16 object-cover rounded-md" onError={(e) => (e.currentTarget.style.display = "none")} />
												))}
											</div>
										) : preview ? (
											<img src={preview} alt={p.name} className="object-cover w-full h-full" onError={(e) => (e.currentTarget.style.display = "none")} />
										) : (
											<span className="text-sm font-semibold text-[var(--color-base-content)]/30">{t("submissions.noImages")}</span>
										)}
									</div>
									<div className="p-4 space-y-2 flex-1 flex flex-col">
										<div className="flex items-center justify-between gap-2">
											<h3 className="font-semibold truncate">{p.name}</h3>
											<span className="badge badge-success shrink-0">v{p.version || "?"}</span>
										</div>
										<p className="text-sm text-[var(--color-base-content)]/60 line-clamp-2 min-h-[2.5rem]">{p.description}</p>

										<div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-[var(--color-base-content)]/60">
											<span className="flex items-center gap-1">
												<Download className="w-3.5 h-3.5" />
												{(p.downloads || 0).toLocaleString()} {t("submissions.downloadsShort")}
											</span>
											<span className="flex items-center gap-1">
												<Layers className="w-3.5 h-3.5" />
												{p.systems_covered || 0} {t("submissions.systemsShort")}
											</span>
											{(p.contributions || 0) > 0 ? (
												<span className="badge badge-warning badge-sm">{t("submissions.contributionCount", { count: p.contributions })}</span>
											) : null}
											{contributed ? (
												<span className="badge badge-success badge-sm">{t("submissions.contributedByYou")}</span>
											) : null}
										</div>

										<div className="pt-2 border-t border-[var(--color-base-300)] space-y-0.5">
											<p className="text-sm font-semibold">
												{t("submissions.realAuthor")}: <span className="text-[var(--color-primary-soft)]">{p.author}</span>
											</p>
											<p className="text-[11px] text-[var(--color-base-content)]/40">
												{t("submissions.submittedBy")} <UserLink>{p.submitted_by || p.author}</UserLink>
											</p>
										</div>

										<div className="flex flex-wrap items-center gap-2 pt-2 border-t border-[var(--color-base-300)] mt-auto">
											<DonateButton url={p.donation_url} author={p.author} />
											{signedIn ? (
												<Link to={`/app/sap/${p.folder}/contribute`} className="btn btn-primary btn-sm ml-auto">
													<Plus className="w-3.5 h-3.5" />
													{t("submissions.contribute")}
												</Link>
											) : null}
										</div>
									</div>
								</div>
							);
						})}
					</div>
				)}

				{packs && packsTotal > pageSize ? (
					<div className="flex items-center justify-center gap-3 mt-6">
						<button type="button" className="btn btn-outline btn-sm" disabled={page === 0} onClick={() => setPage((p) => Math.max(0, p - 1))}>
							<ChevronLeft className="w-4 h-4" /> {t("common.prev")}
						</button>
						<span className="text-sm text-[var(--color-base-content)]/60">
							{t("submissions.pageOf", { page: page + 1, total: Math.max(1, Math.ceil(packsTotal / pageSize)) })}
						</span>
						<button
							type="button"
							className="btn btn-outline btn-sm"
							disabled={(page + 1) * pageSize >= packsTotal}
							onClick={() => setPage((p) => p + 1)}
						>
							{t("common.next")} <ChevronRight className="w-4 h-4" />
						</button>
					</div>
				) : null}
			</section>
		</div>
	);
}