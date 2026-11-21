import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import {
	ArrowRight,
	Check,
	Gamepad2,
	Heart,
	Layers,
	Palette,
	Search,
	Send,
	ShieldCheck,
	Sparkles,
	Users,
	type LucideIcon,
} from "lucide-react";
import { useTranslation } from "react-i18next";
import Avatar from "../components/Avatar";
import {
	cdnUrl,
	fetchDashboard,
	mediaUrl,
	searchMetadataGames,
	type DashboardData,
	type GameSummary,
} from "../lib/api";
import { useSession } from "../lib/session";
import { DEFAULT_TITLE, usePageMeta } from "../lib/seo";

// The same request as in the API docs: developer app credentials are required.
const API_EXAMPLE = `curl -G https://api.neoassets.dev/api/v1/scrape/games \\
  --data-urlencode "system_id=snes" \\
  --data-urlencode "name=chrono trigger" \\
  -H "X-Client-Id: <client_id>" \\
  -H "X-Client-Secret: <client_secret>"`;

// HomeView is the in-app landing, shown to everyone (guests included) inside
// the app shell: what NeoAssets is, what the catalog holds today, how
// contributing works, the scraping API, and who builds the catalog. All the
// numbers, covers, packs and people come from the public dashboard endpoint.
export default function HomeView() {
	const { authed: signedIn } = useSession();
	const { t } = useTranslation();
	usePageMeta({ title: DEFAULT_TITLE });
	const [stats, setStats] = useState<DashboardData | null>(null);
	const [wall, setWall] = useState<GameSummary[]>([]);

	useEffect(() => {
		let ignore = false;
		fetchDashboard()
			.then((d) => {
				if (!ignore) setStats(d);
			})
			.catch(() => {});
		// The most scraped games give the hero its box art wall.
		searchMetadataGames("", "", 24, 0, "", "scrapes")
			.then((d) => {
				if (!ignore) setWall(d.games.filter((g) => g.cover).slice(0, 9));
			})
			.catch(() => {});
		return () => {
			ignore = true;
		};
	}, []);

	const highlights = [t("home.free"), t("home.noSubmissionsLimit"), t("home.fasterScraper")];
	// One cover per game: several approved changes to the same game would
	// otherwise repeat its cover.
	const covers = (stats?.recent_metadata || [])
		.filter((m) => m.cover)
		.filter((m, i, list) => list.findIndex((x) => (x.game_id || x.id) === (m.game_id || m.id)) === i)
		.slice(0, 6);
	const topGames = (stats?.top_games || []).slice(0, 5);
	// One entry per pack: a new version would otherwise list the pack twice.
	const packs = (stats?.recent_packs || [])
		.filter((p, i, list) => list.findIndex((x) => x.pack_id === p.pack_id) === i)
		.slice(0, 5);
	const contributors = (stats?.top_contributions || []).slice(0, 6);
	const steps: { key: "find" | "submit" | "review" | "earn"; icon: LucideIcon; tone: string }[] = [
		{ key: "find", icon: Search, tone: "tone-meta" },
		{ key: "submit", icon: Send, tone: "tone-sap" },
		{ key: "review", icon: ShieldCheck, tone: "tone-community" },
		{ key: "earn", icon: Sparkles, tone: "tone-reward" },
	];
	const numbers: { label: string; value?: number; icon: LucideIcon; tone: string }[] = [
		{ label: t("dashboard.totalGames"), value: stats?.total_games, icon: Gamepad2, tone: "tone-meta" },
		{ label: t("dashboard.totalSystems"), value: stats?.total_systems, icon: Layers, tone: "tone-primary" },
		{ label: t("dashboard.totalPacks"), value: stats?.total_packs, icon: Palette, tone: "tone-sap" },
		{
			label: t("dashboard.totalContributions"),
			value: stats?.total_contributions,
			icon: Users,
			tone: "tone-community",
		},
	];
	// Three staggered columns of box art.
	const wallColumns = [0, 1, 2].map((c) => wall.filter((_, i) => i % 3 === c));

	return (
		<div className="space-y-16 md:space-y-20 pb-8">
			{/* Hero: what NeoAssets is and the way in, with the catalog numbers. */}
			<div className="grid gap-10 lg:grid-cols-[minmax(0,1fr)_24rem] lg:items-center pt-4 md:pt-8">
				<section className="max-w-2xl">
					<h1 className="text-3xl md:text-[2.5rem] md:leading-[2.75rem] font-semibold mb-5">
						{t("home.title")}{" "}
						<span className="text-[var(--color-primary-soft)]">{t("home.titleHighlight")}</span>
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

				{wall.length >= 6 ? (
					<div className="hidden lg:grid grid-cols-3 gap-3 -my-2" aria-hidden="true">
						{wallColumns.map((col, c) => (
							<div key={c} className={`space-y-3 ${c === 1 ? "pt-10" : c === 2 ? "pt-4" : ""}`}>
								{col.map((g) => (
									<Link
										key={g.id}
										to={`/app/metadata/${g.system_id}/game/${g.id}`}
										tabIndex={-1}
										className="block aspect-[3/4] overflow-hidden rounded-[var(--radius-card)] border border-[var(--color-base-300)] bg-[var(--color-base-200)] hover:border-[var(--color-primary)]"
									>
										<img
											src={mediaUrl(g.cover!, g.cover_updated)}
											alt=""
											className="w-full h-full object-cover"
											onError={(e) => (e.currentTarget.style.visibility = "hidden")}
										/>
									</Link>
								))}
							</div>
						))}
					</div>
				) : null}
			</div>

			{/* The catalog in numbers, each in the color of its area. */}
			<dl className="grid grid-cols-2 lg:grid-cols-4 gap-3">
				{numbers.map((n) => (
					<div key={n.label} className={`card p-4 flex items-center gap-3 ${n.tone}`}>
						<span className="tone-chip">
							<n.icon className="w-5 h-5" aria-hidden="true" />
						</span>
						<div className="min-w-0">
							<dt className="text-xs text-[var(--color-base-content)]/60 truncate">{n.label}</dt>
							<dd className="font-display text-2xl font-semibold tabular-nums tone-text">
								{n.value !== undefined ? n.value.toLocaleString() : "—"}
							</dd>
						</div>
					</div>
				))}
			</dl>

			{/* The two catalogs, each shown with what it actually holds. */}
			<section aria-labelledby="home-catalog">
				<h2 id="home-catalog" className="text-xl font-semibold mb-6">
					{t("home.catalog.title")}
				</h2>
				<div className="grid gap-6 lg:grid-cols-5">
					<article className="card p-5 lg:col-span-3 flex flex-col tone-meta">
						<h3 className="text-lg font-semibold mb-1 flex items-center gap-3">
							<span className="tone-chip">
								<Gamepad2 className="w-5 h-5" aria-hidden="true" />
							</span>
							{t("home.catalog.metadataTitle")}
						</h3>
						<p className="text-sm text-[var(--color-base-content)]/65 mb-5 max-w-prose">
							{t("home.catalog.metadataBody")}
						</p>
						{covers.length > 0 ? (
							<>
								<p className="text-xs text-[var(--color-base-content)]/60 mb-2">
									{t("dashboard.latestMetadata")}
								</p>
								<ul className="flex flex-wrap gap-2 mb-6">
									{covers.map((m) => (
										<li key={m.id} className="w-[calc((100%-1rem)/3)] sm:w-24">
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
							</>
						) : null}
						{topGames.length > 0 ? (
							<>
								<p className="text-xs text-[var(--color-base-content)]/60 mb-2">
									{t("dashboard.topGames")}
								</p>
								<ol className="divide-y divide-[var(--color-base-300)] border-y border-[var(--color-base-300)] mb-5">
									{topGames.map((g, i) => (
										<li key={g.id} className="flex items-center gap-3 py-2 text-sm">
											<span className="w-5 text-[var(--color-base-content)]/50 tabular-nums">
												{i + 1}
											</span>
											<Link
												to={`/app/metadata/${g.system_id}/game/${g.id}`}
												className="flex-1 min-w-0 truncate hover:underline"
											>
												{g.name}
											</Link>
											<span className="text-xs text-[var(--color-base-content)]/50 uppercase">
												{g.system_id}
											</span>
											<span className="w-12 text-right font-mono text-xs text-[var(--color-base-content)]/60 tabular-nums">
												{g.scrapes.toLocaleString()}
											</span>
										</li>
									))}
								</ol>
							</>
						) : null}
						<Link to="/app/metadata" className="link text-sm inline-flex items-center gap-1 mt-auto">
							{t("home.catalog.browseGames")}
							<ArrowRight className="w-3.5 h-3.5" aria-hidden="true" />
						</Link>
					</article>

					<article className="card p-5 lg:col-span-2 flex flex-col tone-sap">
						<h3 className="text-lg font-semibold mb-1 flex items-center gap-3">
							<span className="tone-chip">
								<Palette className="w-5 h-5" aria-hidden="true" />
							</span>
							{t("home.catalog.packsTitle")}
						</h3>
						<p className="text-sm text-[var(--color-base-content)]/65 mb-5">
							{t("home.catalog.packsBody")}
						</p>
						<ul className="space-y-3 mb-5">
							{packs.map((p) => (
								<li key={p.id}>
									<Link
										to={`/app/sap/${encodeURIComponent(p.pack_id)}`}
										className="flex items-center gap-3 rounded-md p-2 -mx-2 hover:bg-[var(--color-base-300)]/50"
									>
										<span className="block w-24 aspect-video shrink-0 overflow-hidden rounded-md bg-[var(--color-base-100)] border border-[var(--color-base-300)]">
											{p.image ? (
												<img
													src={cdnUrl(p.image)}
													alt=""
													loading="lazy"
													className="w-full h-full object-cover"
												/>
											) : null}
										</span>
										<span className="min-w-0">
											<span className="block text-sm font-medium truncate">{p.name}</span>
											<span className="block text-xs text-[var(--color-base-content)]/60 truncate">
												{p.author} · v{p.version}
											</span>
										</span>
									</Link>
								</li>
							))}
						</ul>
						<Link to="/app/sap" className="link text-sm inline-flex items-center gap-1 mt-auto">
							{t("home.catalog.browsePacks")}
							<ArrowRight className="w-3.5 h-3.5" aria-hidden="true" />
						</Link>
					</article>
				</div>
			</section>

			{/* How a contribution goes from an edit to the catalog. */}
			<section aria-labelledby="home-steps">
				<h2 id="home-steps" className="text-xl font-semibold mb-6">
					{t("home.steps.title")}
				</h2>
				<ol className="grid gap-x-8 gap-y-6 sm:grid-cols-2 lg:grid-cols-4">
					{steps.map((s, i) => (
						<li key={s.key} className={`border-t-2 border-[var(--tone)] pt-4 ${s.tone}`}>
							<div className="flex items-center gap-3 mb-3">
								<span className="tone-chip">
									<s.icon className="w-5 h-5" aria-hidden="true" />
								</span>
								<span className="font-mono text-xs tone-text">{String(i + 1).padStart(2, "0")}</span>
							</div>
							<h3 className="font-semibold mb-1">{t(`home.steps.${s.key}.title`)}</h3>
							<p className="text-sm leading-6 text-[var(--color-base-content)]/65">
								{t(`home.steps.${s.key}.body`)}
							</p>
						</li>
					))}
				</ol>
				<Link to="/app/guide" className="link text-sm inline-flex items-center gap-1 mt-6">
					{t("home.steps.guide")}
					<ArrowRight className="w-3.5 h-3.5" aria-hidden="true" />
				</Link>
			</section>

			{/* The scraping API, for frontend developers. */}
			<section
				aria-labelledby="home-api"
				className="grid gap-8 lg:grid-cols-2 lg:items-center border-y border-[var(--color-base-300)] py-10"
			>
				<div>
					<h2 id="home-api" className="text-xl font-semibold mb-2">
						{t("home.api.title")}
					</h2>
					<p className="text-[var(--color-base-content)]/70 mb-5 max-w-prose">{t("home.api.body")}</p>
					<ul className="space-y-2 mb-6 text-sm">
						{(["point1", "point2", "point3"] as const).map((k) => (
							<li key={k} className="flex items-start gap-2">
								<Check
									className="w-4 h-4 mt-0.5 shrink-0 text-[var(--color-success)]"
									aria-hidden="true"
								/>
								{t(`home.api.${k}`)}
							</li>
						))}
					</ul>
					<Link to="/app/docs" className="btn btn-outline">
						{t("home.api.docs")}
					</Link>
				</div>
				<pre className="overflow-x-auto rounded-[var(--radius-card)] border border-[var(--color-base-300)] bg-[var(--color-base-200)] p-4 font-mono text-xs leading-5 text-[var(--color-base-content)]/85">
					<code>{API_EXAMPLE}</code>
				</pre>
			</section>

			{/* The people building the catalog. */}
			{contributors.length > 0 ? (
				<section aria-labelledby="home-community">
					<div className="flex flex-wrap items-end justify-between gap-2 mb-6">
						<div>
							<h2 id="home-community" className="text-xl font-semibold mb-1">
								{t("home.community.title")}
							</h2>
							<p className="text-sm text-[var(--color-base-content)]/65">{t("home.community.body")}</p>
						</div>
						<Link to="/app/dashboard" className="link text-sm inline-flex items-center gap-1">
							{t("home.community.seeAll")}
							<ArrowRight className="w-3.5 h-3.5" aria-hidden="true" />
						</Link>
					</div>
					<ul className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
						{contributors.map((u, i) => (
							<li key={u.id} className={i < 3 ? `rank-${i + 1}` : "tone-community"}>
								<Link
									to={`/app/u/${encodeURIComponent(u.username)}`}
									className="card card-hover relative flex flex-col items-center text-center gap-2 px-3 pt-5 pb-4 overflow-hidden bg-[color-mix(in_oklab,var(--tone)_6%,var(--color-base-200))]"
								>
									<span
										className="absolute inset-x-0 top-0 h-1 bg-[var(--tone)]"
										aria-hidden="true"
									/>
									<span className="absolute top-2.5 left-2.5 grid place-items-center w-6 h-6 rounded-full bg-[color-mix(in_oklab,var(--tone)_18%,transparent)] font-display text-xs font-bold text-[var(--tone)]">
										{i + 1}
									</span>
									<Avatar
										name={u.username}
										avatarKey={u.avatar_key}
										size={56}
										className="!rounded-full ring-2 ring-[var(--tone)] ring-offset-2 ring-offset-[var(--color-base-200)]"
									/>
									<span className="block w-full text-sm font-semibold truncate mt-1">
										{u.username}
									</span>
									<span className="block font-display text-xl font-bold tabular-nums tone-text leading-none">
										{u.count.toLocaleString()}
									</span>
									<span className="block text-[11px] text-[var(--color-base-content)]/55">
										{t("dashboard.totalContributions")}
									</span>
								</Link>
							</li>
						))}
					</ul>
				</section>
			) : null}
		</div>
	);
}
