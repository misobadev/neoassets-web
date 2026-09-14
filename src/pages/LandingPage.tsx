import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { Heart, Download, Image } from "lucide-react";
import { useTranslation } from "react-i18next";
import { api, type Pack, CDN_BASE, userToken } from "../lib/api";
import DonateButton from "../components/DonateButton";

export default function LandingPage() {
	const [packs, setPacks] = useState<Pack[] | null>(null);
	const [packsError, setPacksError] = useState<string | null>(null);
	const signedIn = !!userToken();
	const { t } = useTranslation();

	useEffect(() => {
		api<{ themes: Pack[] }>("/api/v1/packs")
			.then((data) => {
				setPacks(data.themes || []);
				setPacksError(null);
			})
			.catch((e: Error) => setPacksError(e.message));
	}, []);

	return (
		<div>
			{/* Hero */}
			<section className="relative overflow-hidden">
				<div className="max-w-5xl mx-auto px-4 pt-20 pb-16 md:pt-28 md:pb-24 text-center">
					<span className="pill inline-flex mx-auto mb-6 animate-fade-up">
						<Image className="w-3.5 h-3.5 text-[var(--color-primary)]" />
						NeoAssets
					</span>
				<h1 className="text-4xl md:text-6xl font-bold tracking-tight mb-6 animate-fade-up">
					{t("landing.hero.title")} <span className="text-gradient">{t("landing.hero.titleHighlight")}</span>
				</h1>
				<p className="text-lg md:text-xl text-[var(--color-base-content)]/60 max-w-2xl mx-auto mb-6 animate-fade-up">
					{t("landing.hero.subtitle")}
				</p>
				<p className="text-sm md:text-base text-[var(--color-base-content)]/60 max-w-2xl mx-auto mb-2 animate-fade-up flex flex-wrap items-center justify-center gap-2">
					<span className="badge badge-ghost badge-sm">{t("landing.hero.free")}</span>
					<span className="badge badge-ghost badge-sm">{t("landing.hero.noRateLimits")}</span>
					<span className="badge badge-ghost badge-sm">{t("landing.hero.noThreadCaps")}</span>
					<span className="badge badge-ghost badge-sm">{t("landing.hero.noTransferLimits")}</span>
				</p>
				<p className="text-sm text-[var(--color-base-content)]/50 max-w-2xl mx-auto mb-8 animate-fade-up">
					{t("landing.hero.freeNote")}
				</p>
				<div className="flex flex-col sm:flex-row items-center justify-center gap-3 mb-4 animate-fade-up">
					{signedIn ? (
						<Link to="/app" className="btn btn-primary btn-lg">
							{t("landing.hero.openApp")}
						</Link>
					) : (
						<>
							<Link to="/app" className="btn btn-primary btn-lg">
								{t("nav.signIn")}
							</Link>
							<Link to="/app" className="btn btn-outline btn-lg">
								{t("nav.createAccount")}
							</Link>
						</>
					)}
				</div>
				<div className="flex flex-col sm:flex-row items-center justify-center gap-3 animate-fade-up">
					<a href="https://ko-fi.com/neostation" target="_blank" rel="noopener noreferrer" className="btn btn-ghost btn-sm">
						<Heart className="w-4 h-4" />
						{t("landing.hero.supportKofi")}
					</a>
					<a href="https://www.patreon.com/cw/NeoAssets" target="_blank" rel="noopener noreferrer" className="btn btn-ghost btn-sm">
						<Heart className="w-4 h-4" />
						{t("landing.hero.becomePatron")}
					</a>
				</div>
				</div>
			</section>

			{/* Categories */}
			<section className="border-t border-base-300 py-16 md:py-20">
				<div className="max-w-6xl mx-auto px-4">
					<h2 className="text-2xl md:text-3xl font-bold tracking-tight mb-2 text-center">{t("landing.categories.title")}</h2>
					<p className="text-[var(--color-base-content)]/60 text-center mb-10 max-w-2xl mx-auto">
						{t("landing.categories.subtitle")}
					</p>
					<div className="grid grid-cols-1 md:grid-cols-3 gap-4">
						{[
							{
								titleKey: "nav.systemArtPack",
								bodyKey: "landing.categories.systemArtPackBody",
								status: "active",
								href: "/app",
							},
							{
								titleKey: "nav.gameMetadata",
								bodyKey: "landing.categories.gameMetadataBody",
								status: "soon",
								href: null,
							},
							{
								titleKey: "landing.categories.systemMetadata",
								bodyKey: "landing.categories.systemMetadataBody",
								status: "soon",
								href: null,
							},
						].map((c) => (
							<div key={c.titleKey} className="card p-6 card-hover flex flex-col">
								<div className="flex items-center justify-between gap-2 mb-3">
									<h3 className="font-semibold">{t(c.titleKey)}</h3>
									{c.status === "active" ? (
										<span className="badge badge-success badge-sm">{t("landing.categories.available")}</span>
									) : (
										<span className="badge badge-ghost badge-sm">{t("common.comingSoon")}</span>
									)}
								</div>
								<p className="text-sm text-[var(--color-base-content)]/60 leading-relaxed flex-1">{t(c.bodyKey)}</p>
								<div className="mt-4">
									{c.href ? (
										<Link to={c.href} className="btn btn-primary btn-sm w-full">
											{t("landing.categories.getStarted")}
										</Link>
									) : (
										<button className="btn btn-ghost btn-sm w-full" disabled>
											{t("landing.categories.disabledForNow")}
										</button>
									)}
								</div>
							</div>
						))}
					</div>
				</div>
			</section>

			{/* What it is */}
			<section className="border-t border-base-300 py-16 md:py-20">
				<div className="max-w-6xl mx-auto px-4">
					<h2 className="text-2xl md:text-3xl font-bold tracking-tight mb-10 text-center">
						{t("landing.howItWorks.title")}
					</h2>
					<div className="grid grid-cols-1 md:grid-cols-3 gap-4">
						{[
							{
								titleKey: "landing.howItWorks.contribute.title",
								bodyKey: "landing.howItWorks.contribute.body",
							},
							{
								titleKey: "landing.howItWorks.review.title",
								bodyKey: "landing.howItWorks.review.body",
							},
							{
								titleKey: "landing.howItWorks.share.title",
								bodyKey: "landing.howItWorks.share.body",
							},
						].map((f) => (
							<div key={f.titleKey} className="card p-6 card-hover">
								<h3 className="font-semibold mb-2">{t(f.titleKey)}</h3>
								<p className="text-sm text-[var(--color-base-content)]/60 leading-relaxed">{t(f.bodyKey)}</p>
							</div>
						))}
					</div>
				</div>
			</section>

			{/* Browse approved contributions */}
			<section className="border-t border-base-300 py-16 md:py-20">
				<div className="max-w-6xl mx-auto px-4">
					<div className="flex items-end justify-between mb-8 gap-4 flex-wrap">
						<div>
							<h2 className="text-2xl md:text-3xl font-bold tracking-tight">{t("landing.community.title")}</h2>
							<p className="text-[var(--color-base-content)]/60 mt-1">
								{t("landing.community.subtitle")}
							</p>
						</div>
						{!signedIn ? (
							<Link to="/app" className="btn btn-primary">
								{t("landing.community.signInToSubmit")}
							</Link>
						) : (
							<Link to="/app" className="btn btn-primary">
								{t("landing.community.buildAPack")}
							</Link>
						)}
					</div>

					{packsError ? (
						<p className="text-center text-[var(--color-error)] py-10">{packsError}</p>
					) : packs === null ? (
						<p className="text-center text-[var(--color-base-content)]/50 py-10">{t("landing.community.loadingPacks")}</p>
					) : packs.length === 0 ? (
						<p className="text-center text-[var(--color-base-content)]/50 py-10">
							{t("landing.community.empty")}
						</p>
					) : (
						<div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
							{packs.map((p) => {
								const preview = p.preview ? `${CDN_BASE}/${p.preview}` : "";
								return (
									<div key={p.folder} className="card card-hover overflow-hidden">
										<div className="h-32 bg-[var(--color-base-300)] flex items-center justify-center overflow-hidden">
											{preview ? (
												<img src={preview} alt={p.name} className="object-cover w-full h-full" onError={(e) => (e.currentTarget.style.display = "none")} />
											) : null}
										</div>
										<div className="p-4 space-y-2">
											<div className="flex items-center justify-between gap-2">
												<h3 className="font-semibold truncate">{p.name}</h3>
												<span className="badge badge-success">v{p.version || "?"}</span>
											</div>
											<p className="text-sm text-[var(--color-base-content)]/60 line-clamp-2 min-h-[2.5rem]">{p.description}</p>
											<div className="flex items-center justify-between gap-2 pt-2 border-t border-[var(--color-base-300)]">
												<span className="text-sm text-[var(--color-base-content)]/50 flex items-center gap-1">
													{p.downloads ? (
														<>
															<Download className="w-3.5 h-3.5" />
															{p.downloads.toLocaleString()}
														</>
													) : null}
													{p.author}
												</span>
												<DonateButton url={p.donation_url} author={p.author} />
											</div>
										</div>
									</div>
								);
							})}
						</div>
					)}
				</div>
			</section>
		</div>
	);
}
