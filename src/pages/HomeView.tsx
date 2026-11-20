import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { Check, Heart } from "lucide-react";
import { useTranslation } from "react-i18next";
import { fetchDashboard, mediaUrl, type DashboardData } from "../lib/api";
import { useSession } from "../lib/session";
import { DEFAULT_TITLE, usePageMeta } from "../lib/seo";

// HomeView is the in-app landing, shown to everyone (guests included) inside
// the app shell: what NeoAssets is, how to start contributing, and what the
// catalog holds today.
export default function HomeView() {
	const { authed: signedIn } = useSession();
	const { t } = useTranslation();
	usePageMeta({ title: DEFAULT_TITLE });
	const [stats, setStats] = useState<DashboardData | null>(null);

	useEffect(() => {
		let ignore = false;
		fetchDashboard()
			.then((d) => {
				if (!ignore) setStats(d);
			})
			.catch(() => {});
		return () => {
			ignore = true;
		};
	}, []);

	const highlights = [t("home.free"), t("home.noSubmissionsLimit"), t("home.fasterScraper")];
	const covers = (stats?.recent_metadata || []).filter((m) => m.cover).slice(0, 4);

	return (
		<div className="grid gap-10 lg:grid-cols-[minmax(0,1fr)_22rem] lg:items-start pt-4 md:pt-10">
			<section className="max-w-2xl">
				<h1 className="text-3xl md:text-[2.5rem] md:leading-[2.75rem] font-semibold mb-5">
					{t("home.title")} {t("home.titleHighlight")}
				</h1>
				<p className="text-lg text-[var(--color-base-content)]/75 mb-6 max-w-prose">{t("home.subtitle")}</p>
				<ul className="flex flex-wrap gap-x-6 gap-y-2 mb-8 text-sm">
					{highlights.map((h) => (
						<li key={h} className="inline-flex items-center gap-2">
							<Check className="w-4 h-4 text-[var(--color-success)]" aria-hidden="true" />
							{h}
						</li>
					))}
				</ul>
				<div className="flex flex-wrap items-center gap-3 mb-10">
					{signedIn ? (
						<>
							<Link to="/app/metadata" className="btn btn-primary btn-lg">
								{t("home.gameMetadata")}
							</Link>
							<Link to="/app/sap" className="btn btn-outline btn-lg">
								{t("home.systemArtPack")}
							</Link>
						</>
					) : (
						<>
							<Link to="/app/register" className="btn btn-primary btn-lg">
								{t("home.createAccount")}
							</Link>
							<Link to="/app/login" className="btn btn-outline btn-lg">
								{t("home.signIn")}
							</Link>
						</>
					)}
				</div>
				<div className="border-t border-[var(--color-base-300)] pt-6 space-y-3 max-w-prose">
					<p className="text-sm leading-6 text-[var(--color-base-content)]/65">{t("home.about")}</p>
					<p className="text-sm text-[var(--color-base-content)]/65">
						{t("home.freeNote")}{" "}
						<a
							href="https://www.patreon.com/cw/NeoAssets"
							target="_blank"
							rel="noopener noreferrer"
							className="link inline-flex items-center gap-1"
						>
							<Heart className="w-3.5 h-3.5" aria-hidden="true" />
							{t("home.becomePatron")}
						</a>
					</p>
				</div>
			</section>

			<aside className="card p-5" aria-label={t("nav.dashboard")}>
				<dl className="grid grid-cols-2 gap-x-4 gap-y-5">
					{[
						{ label: t("dashboard.totalGames"), value: stats?.total_games },
						{ label: t("dashboard.totalSystems"), value: stats?.total_systems },
						{ label: t("dashboard.totalPacks"), value: stats?.total_packs },
						{ label: t("dashboard.totalContributions"), value: stats?.total_contributions },
					].map((s) => (
						<div key={s.label}>
							<dt className="text-xs text-[var(--color-base-content)]/60 mb-1">{s.label}</dt>
							<dd className="text-2xl font-semibold tabular-nums">
								{s.value !== undefined ? s.value.toLocaleString() : "—"}
							</dd>
						</div>
					))}
				</dl>
				{covers.length > 0 ? (
					<div className="mt-6 pt-5 border-t border-[var(--color-base-300)]">
						<p className="text-xs text-[var(--color-base-content)]/60 mb-3">
							{t("dashboard.latestMetadata")}
						</p>
						<ul className="grid grid-cols-4 gap-2">
							{covers.map((m) => (
								<li key={m.id}>
									<Link
										to={
											m.game_id
												? `/app/metadata/${m.system_id}/game/${m.game_id}`
												: "/app/metadata"
										}
										title={`${m.game_name} · ${m.system_name}`}
										className="block aspect-[3/4] overflow-hidden rounded-md bg-[var(--color-base-100)] border border-[var(--color-base-300)] hover:border-[var(--color-primary)]"
									>
										<img
											src={mediaUrl(m.cover!, m.cover_updated)}
											alt={m.game_name}
											loading="lazy"
											className="w-full h-full object-cover"
										/>
									</Link>
								</li>
							))}
						</ul>
					</div>
				) : null}
				<Link to="/app/dashboard" className="link text-sm inline-block mt-5">
					{t("nav.dashboard")} →
				</Link>
			</aside>
		</div>
	);
}
