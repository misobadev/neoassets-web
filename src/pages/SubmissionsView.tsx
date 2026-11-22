import { useEffect, useState } from "react";
import PageTitle from "../components/ui/PageTitle";
import { Link, useNavigate } from "react-router-dom";
import { ChevronLeft, ChevronRight, Download, Layers, Palette } from "lucide-react";
import { useTranslation } from "react-i18next";
import { api, CDN_BASE, type Pack, userUsername } from "../lib/api";
import DonateButton from "../components/DonateButton";
import { useSession } from "../lib/session";
import { usePageMeta } from "../lib/seo";

// SubmissionsView is the community System Art Pack gallery: every user's
// published contribution. The current user's own submissions (drafts and
// reviews) live in "My contributions" (/app/contributions).
export default function SubmissionsView() {
	const { t } = useTranslation();
	const navigate = useNavigate();
	const { authed: signedIn } = useSession();
	usePageMeta({
		title: `${t("nav.systemArtPack")} - NeoAssets`,
		description:
			"Browse community system art packs for emulation frontends: backgrounds, logos and themes for every system, ready to download.",
	});
	const [packs, setPacks] = useState<Pack[] | null>(null);
	const [packsTotal, setPacksTotal] = useState(0);
	const [page, setPage] = useState(0);
	const pageSize = 12;

	// Approved packs are public: show them to everyone, guests included, sorted
	// by downloads and paginated.
	useEffect(() => {
		api<{ themes: Pack[]; total: number }>(
			`/api/v1/packs?sort=downloads&limit=${pageSize}&offset=${page * pageSize}`,
		)
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
				<button
					type="button"
					className="btn btn-outline btn-sm"
					disabled={page === 0}
					onClick={() => setPage((p) => Math.max(0, p - 1))}
				>
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
					<PageTitle icon={Palette} tone="tone-sap">
						{t("nav.systemArtPack")}
					</PageTitle>
					<p className="text-[var(--color-base-content)]/60 text-sm">{t("submissions.guestSubtitle")}</p>
				</div>
				{signedIn ? (
					<Link to="/app/submissions/new" className="btn btn-primary">
						{t("submissions.addNewPack")}
					</Link>
				) : null}
			</div>

			{!signedIn ? (
				<div className="card card-tone tone-sap p-6 flex flex-col sm:flex-row items-center justify-between gap-4">
					<div>
						<h2 className="font-semibold mb-1">{t("submissions.signInToCreate")}</h2>
						<p className="text-sm text-[var(--color-base-content)]/60">{t("submissions.signInBody")}</p>
					</div>
					<div className="flex flex-wrap items-center gap-3">
						<Link to="/app/register" className="btn btn-primary">
							{t("nav.createAccount")}
						</Link>
						<Link to="/app/login" className="btn btn-outline">
							{t("nav.signIn")}
						</Link>
					</div>
				</div>
			) : null}

			{/* Community System Art Packs: every user's published contributions. */}
			<section className="space-y-4">
				{packs === null ? (
					<p className="text-sm text-[var(--color-base-content)]/50 py-6 text-center">
						{t("submissions.loadingPacks")}
					</p>
				) : packs.length === 0 ? (
					<p className="text-sm text-[var(--color-base-content)]/50 py-6 text-center">
						{t("submissions.noPacks")}
					</p>
				) : (
					<>
						{renderPager()}
						<div className="grid grid-cols-[repeat(auto-fill,minmax(min(100%,18rem),1fr))] gap-3">
							{packs.map((p) => {
								const icons = (p.backgrounds || []).map((k) => `${CDN_BASE}/${k}`);
								const contributed = signedIn && (p.contributors || []).includes(userUsername() || "");
								return (
									<div
										key={p.folder}
										role="link"
										tabIndex={0}
										onClick={() => navigate(`/app/sap/${p.folder}`)}
										onKeyDown={(e) => {
											if (e.key === "Enter") navigate(`/app/sap/${p.folder}`);
										}}
										className="card card-hover card-tone-hover tone-sap overflow-hidden flex flex-col cursor-pointer"
									>
										<div className="h-24 bg-[color-mix(in_oklab,var(--tone)_12%,var(--color-base-100))] flex items-center justify-center overflow-hidden">
											{icons.length > 0 ? (
												<div className="flex items-center justify-center gap-1 p-2">
													{icons.slice(0, 4).map((src, i) => (
														<img
															key={i}
															src={src}
															alt=""
															loading="lazy"
															className="w-14 h-14 object-cover rounded-md"
															onError={(e) => (e.currentTarget.style.display = "none")}
														/>
													))}
												</div>
											) : (
												<span className="text-sm font-semibold text-[var(--color-base-content)]/30">
													{t("submissions.noImages")}
												</span>
											)}
										</div>
										<div className="p-3 flex-1 flex flex-col">
											<h3
												className="font-display font-semibold text-base leading-tight truncate"
												title={p.name}
											>
												{p.name}
											</h3>
											<p className="flex items-center gap-2 mt-1.5 min-w-0 text-xs text-[var(--color-base-content)]/60">
												<span className="inline-flex h-5 shrink-0 items-center rounded px-1.5 font-mono text-[10px] font-medium leading-none bg-[color-mix(in_oklab,var(--color-success)_14%,transparent)] text-[var(--color-success)]">
													v{p.version || "?"}
												</span>
												<span className="truncate">
													{t("submissions.byAuthor", { author: p.author })}
												</span>
											</p>
											{(p.contributions || 0) > 0 || contributed ? (
												<div className="flex flex-wrap items-center gap-1.5 mt-2">
													{(p.contributions || 0) > 0 ? (
														<span className="inline-flex h-5 items-center rounded px-1.5 text-[10px] font-medium leading-none bg-[color-mix(in_oklab,var(--color-warning)_14%,transparent)] text-[var(--color-warning)]">
															{t("submissions.contributionCount", {
																count: p.contributions,
															})}
														</span>
													) : null}
													{contributed ? (
														<span className="inline-flex h-5 items-center rounded px-1.5 text-[10px] font-medium leading-none bg-[color-mix(in_oklab,var(--color-success)_14%,transparent)] text-[var(--color-success)]">
															{t("submissions.contributedByYou")}
														</span>
													) : null}
												</div>
											) : null}
											<div className="@container mt-auto pt-3 min-h-11 flex items-center gap-2">
												<span
													className="inline-flex min-w-0 items-center gap-1.5 whitespace-nowrap rounded-md bg-[var(--color-base-300)]/60 px-2 py-1 text-[var(--color-base-content)]/70"
													title={`${(p.downloads || 0).toLocaleString()} ${t("submissions.downloadsShort")}`}
												>
													<Download className="w-4 h-4 shrink-0 text-[var(--color-info)]" />
													<span className="truncate text-xs font-medium tabular-nums">
														{(p.downloads || 0).toLocaleString()}
														<span className="hidden @min-[17rem]:inline">
															{" "}
															{t("submissions.downloadsShort")}
														</span>
													</span>
												</span>
												<span
													className="inline-flex min-w-0 items-center gap-1.5 whitespace-nowrap rounded-md bg-[var(--color-base-300)]/60 px-2 py-1 text-[var(--color-base-content)]/70"
													title={`${t("submissions.systemsCovered")}: ${p.systems_covered || 0}`}
												>
													<Layers className="w-4 h-4 shrink-0 text-[var(--tone)]" />
													<span className="truncate text-xs font-medium tabular-nums">
														<span className="@min-[17rem]:hidden">
															{p.systems_covered || 0}
														</span>
														<span className="hidden @min-[17rem]:inline">
															{t("metadata.systemsCount", {
																count: p.systems_covered || 0,
															})}
														</span>
													</span>
												</span>
												<div className="ml-auto shrink-0" onClick={(e) => e.stopPropagation()}>
													<DonateButton url={p.donation_url} author={p.author} compact />
												</div>
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
