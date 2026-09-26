import { useEffect, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { ChevronLeft, ChevronRight, Download, Layers } from "lucide-react";
import { useTranslation } from "react-i18next";
import { api, CDN_BASE, type Pack, userToken, userUsername } from "../lib/api";
import UserLink from "../components/UserLink";
import DonateButton from "../components/DonateButton";
import { usePageTitle } from "../lib/seo";

// SubmissionsView is the community System Art Pack gallery: every user's
// published contribution. The current user's own submissions (drafts and
// reviews) live in "My contributions" (/app/contributions).
export default function SubmissionsView() {
	const { t } = useTranslation();
	const navigate = useNavigate();
	const signedIn = !!userToken();
	usePageTitle(t("nav.systemArtPack"));
	const [packs, setPacks] = useState<Pack[] | null>(null);
	const [packsTotal, setPacksTotal] = useState(0);
	const [page, setPage] = useState(0);
	const pageSize = 9;

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

	// renderPager is shown above and below the pack grid so paginating is always
	// one click away.
	function renderPager() {
		if (!packs || packsTotal <= pageSize) return null;
		return (
			<div className="flex items-center justify-center gap-3">
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
		);
	}

	return (
		<div className="space-y-8">
			<div className="flex items-end justify-between gap-3 flex-wrap">
				<div>
					<h1 className="text-2xl md:text-3xl font-bold tracking-tight">{t("nav.systemArtPack")}</h1>
					<p className="text-[var(--color-base-content)]/60 text-sm">{t("submissions.guestSubtitle")}</p>
				</div>
				{signedIn ? (
					<Link to="/app/submissions/new" className="btn btn-primary">
						{t("submissions.addNewPack")}
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

			{/* Community System Art Packs: every user's published contributions. */}
			<section className="space-y-4">
				{packs === null ? (
					<p className="text-sm text-[var(--color-base-content)]/50 py-6 text-center">{t("submissions.loadingPacks")}</p>
				) : packs.length === 0 ? (
					<p className="text-sm text-[var(--color-base-content)]/50 py-6 text-center">{t("submissions.noPacks")}</p>
				) : (
					<>
						{renderPager()}
						<div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
							{packs.map((p) => {
								const icons = (p.backgrounds || []).map((k) => `${CDN_BASE}/${k}`);
								const contributed = signedIn && (p.contributors || []).includes(userUsername() || "");
								return (
									<div
										key={p.folder}
										role="link"
										tabIndex={0}
										onClick={() => navigate(`/app/sap/${p.folder}`)}
										onKeyDown={(e) => { if (e.key === "Enter") navigate(`/app/sap/${p.folder}`); }}
										className="card card-hover overflow-hidden flex flex-col cursor-pointer"
									>
										<div className="h-32 bg-[var(--color-base-300)] flex items-center justify-center overflow-hidden">
											{icons.length > 0 ? (
												<div className="flex flex-wrap items-center justify-center gap-1 p-2">
													{icons.slice(0, 4).map((src, i) => (
														<img key={i} src={src} alt="" loading="lazy" className="w-16 h-16 object-cover rounded-md" onError={(e) => (e.currentTarget.style.display = "none")} />
													))}
												</div>
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
	
											<div className="flex flex-wrap items-center gap-2 pt-2 border-t border-[var(--color-base-300)] mt-auto" onClick={(e) => e.stopPropagation()}>
												<DonateButton url={p.donation_url} author={p.author} />
											</div>
										</div>
									</div>
								);
							})}
						</div>
						{renderPager()}
					</>
				)}
			</section>
		</div>
	);
}
