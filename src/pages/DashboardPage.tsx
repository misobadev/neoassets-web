import { useEffect, useState, type ReactNode } from "react";
import { useTranslation } from "react-i18next";
import { Link } from "react-router-dom";
import {
	Award,
	Clock,
	Crown,
	Flame,
	Gamepad2,
	HardDrive,
	Layers,
	ListChecks,
	Package,
	Server,
	Users,
} from "lucide-react";
import { cdnUrl, fetchDashboard, type DashboardData, mediaUrl } from "../lib/api";
import UserLink from "../components/UserLink";
import Avatar from "../components/Avatar";
import { formatBytes, formatDate } from "../lib/format";
import { usePageMeta } from "../lib/seo";

export default function DashboardPage() {
	usePageMeta({
		title: "Dashboard - NeoAssets",
		description:
			"NeoAssets community dashboard: top contributors, recent art packs and metadata, popular games and systems.",
	});
	const { t } = useTranslation();
	const [data, setData] = useState<DashboardData | null>(null);
	const [error, setError] = useState<string | null>(null);

	useEffect(() => {
		fetchDashboard()
			.then(setData)
			.catch((e: Error) => setError(e.message));
	}, []);

	if (error) return <p className="text-sm text-[var(--color-error)] text-center py-10">{error}</p>;
	if (!data)
		return (
			<p className="text-sm text-[var(--color-base-content)]/50 text-center py-10">{t("dashboard.loading")}</p>
		);

	return (
		<div className="space-y-6">
			<div>
				<h1 className="text-2xl md:text-3xl font-bold tracking-tight">{t("nav.dashboard")}</h1>
				<p className="text-sm text-[var(--color-base-content)]/60">{t("dashboard.subtitle")}</p>
			</div>

			{/* Catalog, community and storage totals */}
			<div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
				<StatCard
					tone="tone-meta"
					icon={<Gamepad2 className="w-5 h-5" />}
					label={t("dashboard.totalGames")}
					value={data.total_games.toLocaleString()}
				/>
				<StatCard
					tone="tone-primary"
					icon={<Layers className="w-5 h-5" />}
					label={t("dashboard.totalSystems")}
					value={data.total_systems.toLocaleString()}
				/>
				<StatCard
					tone="tone-sap"
					icon={<Package className="w-5 h-5" />}
					label={t("dashboard.totalPacks")}
					value={data.total_packs.toLocaleString()}
				/>
				<StatCard
					tone="tone-community"
					icon={<Users className="w-5 h-5" />}
					label={t("dashboard.totalUsers")}
					value={data.total_users.toLocaleString()}
				/>
				<StatCard
					tone="tone-reward"
					icon={<ListChecks className="w-5 h-5" />}
					label={t("dashboard.totalContributions")}
					value={data.total_contributions.toLocaleString()}
				/>
				{data.storage ? (
					<StatCard
						tone="tone-primary"
						icon={<HardDrive className="w-5 h-5" />}
						label={t("dashboard.usedSpace")}
						value={formatBytes(data.storage.total_bytes)}
					/>
				) : null}
			</div>

			<div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
				<LeaderCard
					title={t("dashboard.topLevels")}
					tone="tone-reward"
					icon={<Crown className="w-4 h-4" />}
					empty={t("dashboard.noLevels")}
				>
					{(data.top_levels || []).map((u, i) => (
						<div key={u.id} className="grid grid-cols-[1.75rem_auto_1fr_auto] items-center gap-3">
							<RankIcon i={i} />
							<Avatar name={u.username} avatarKey={u.avatar_key} size={36} />
							<div className="min-w-0 flex items-center gap-2">
								<span className="min-w-0 truncate">
									<UserLink>{u.username}</UserLink>
								</span>
								<span className="badge badge-ghost badge-sm shrink-0">
									{t("guide.ranks." + u.rank, { defaultValue: u.rank })}
								</span>
							</div>
							<span className="text-xs font-medium text-[var(--color-base-content)]/60 shrink-0">
								{t("dashboard.levelOnly", { level: u.level })}
							</span>
						</div>
					))}
				</LeaderCard>

				<LeaderCard
					title={t("dashboard.topContributors")}
					tone="tone-community"
					icon={<ListChecks className="w-4 h-4" />}
					empty={t("dashboard.noSubmissions")}
				>
					{(data.top_contributions || []).map((u, i) => (
						<div key={u.id} className="grid grid-cols-[1.75rem_auto_1fr_auto] items-center gap-3">
							<RankIcon i={i} />
							<Avatar name={u.username} avatarKey={u.avatar_key} size={36} />
							<span className="min-w-0 truncate">
								<UserLink>{u.username}</UserLink>
							</span>
							<span className="badge badge-primary badge-sm shrink-0">{u.count}</span>
						</div>
					))}
				</LeaderCard>

				<LeaderCard
					title={t("dashboard.topApprovedWeek")}
					tone="tone-community"
					icon={<Award className="w-4 h-4" />}
					empty={t("dashboard.noApprovedWeek")}
				>
					{(data.top_approved_week || []).map((u, i) => (
						<div key={u.id} className="grid grid-cols-[1.75rem_auto_1fr_auto] items-center gap-3">
							<RankIcon i={i} />
							<Avatar name={u.username} avatarKey={u.avatar_key} size={36} />
							<span className="min-w-0 truncate">
								<UserLink>{u.username}</UserLink>
							</span>
							<span className="badge badge-success badge-sm shrink-0">{u.count}</span>
						</div>
					))}
				</LeaderCard>
			</div>

			<div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
				<LeaderCard
					title={t("dashboard.topGames")}
					tone="tone-meta"
					icon={<Flame className="w-4 h-4" />}
					empty={t("dashboard.noGames")}
				>
					{(data.top_games || []).map((g, i) => (
						<Link
							key={g.id}
							to={`/app/metadata/${g.system_id}/game/${g.id}`}
							className="flex items-center justify-between gap-2 hover:bg-base-300 rounded-md -mx-2 px-2 py-0.5"
						>
							<span className="flex items-center gap-2 truncate">
								<RankIcon i={i} />
								<span className="truncate">{g.name}</span>
								<span className="text-[11px] text-[var(--color-base-content)]/40 shrink-0 font-mono">
									{g.system_id}
								</span>
							</span>
							<span className="badge badge-primary badge-sm shrink-0">
								{t("dashboard.scrapes", { count: g.scrapes })}
							</span>
						</Link>
					))}
				</LeaderCard>

				<LeaderCard
					title={t("dashboard.topSystems")}
					tone="tone-meta"
					icon={<Server className="w-4 h-4" />}
					empty={t("dashboard.noSystems")}
				>
					{(data.top_systems || []).map((s, i) => (
						<Link
							key={s.system_id}
							to={`/app/metadata/${s.system_id}`}
							className="flex items-center justify-between gap-2 hover:bg-base-300 rounded-md -mx-2 px-2 py-0.5"
						>
							<span className="flex items-center gap-2 truncate">
								<RankIcon i={i} />
								<span className="truncate">{s.name}</span>
								<span className="text-[11px] text-[var(--color-base-content)]/40 shrink-0 font-mono">
									{s.system_id}
								</span>
							</span>
							<span className="badge badge-primary badge-sm shrink-0">
								{t("dashboard.scrapes", { count: s.scrapes })}
							</span>
						</Link>
					))}
				</LeaderCard>
			</div>

			<div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
				<LeaderCard
					title={t("dashboard.latestSap")}
					tone="tone-sap"
					icon={<Package className="w-4 h-4" />}
					empty={t("dashboard.noPublishedPacks")}
				>
					{(data.recent_packs || []).map((p) => (
						<Link
							key={p.id}
							to={`/app/sap/${p.pack_id}`}
							className="flex items-center gap-3 hover:bg-base-300 rounded-md -mx-2 px-2 py-1"
						>
							{p.image ? (
								<img
									src={cdnUrl(p.image)}
									alt=""
									className="w-12 h-12 object-cover rounded-md border border-[var(--color-base-300)] bg-[var(--color-base-300)] shrink-0"
									onError={(e) => (e.currentTarget.style.display = "none")}
								/>
							) : (
								<div className="w-12 h-12 rounded-md border border-[var(--color-base-300)] bg-[var(--color-base-300)] shrink-0" />
							)}
							<div className="min-w-0 flex-1">
								<p className="font-medium truncate">{p.name}</p>
								<div className="flex items-center justify-between gap-2">
									<p className="text-xs text-[var(--color-base-content)]/50 truncate">
										{t("dashboard.by", { author: p.author_name || p.author })} · v{p.version}
									</p>
									<span className="text-[11px] text-[var(--color-base-content)]/40 shrink-0">
										{formatDate(p.created_at)}
									</span>
								</div>
							</div>
						</Link>
					))}
				</LeaderCard>

				<LeaderCard
					title={t("dashboard.latestMetadata")}
					tone="tone-meta"
					icon={<Clock className="w-4 h-4" />}
					empty={t("dashboard.noApprovedMetadata")}
				>
					{(data.recent_metadata || []).map((m) => (
						<Link
							key={m.id}
							to={
								m.game_id && m.system_id
									? `/app/metadata/${m.system_id}/game/${m.game_id}`
									: "/app/metadata"
							}
							className="flex items-center gap-3 hover:bg-base-300 rounded-md -mx-2 px-2 py-1"
						>
							{m.cover ? (
								<img
									src={mediaUrl(m.cover, m.cover_updated)}
									alt=""
									className="w-12 h-12 object-cover rounded-md border border-[var(--color-base-300)] bg-[var(--color-base-300)] shrink-0"
									onError={(e) => (e.currentTarget.style.display = "none")}
								/>
							) : (
								<div className="w-12 h-12 rounded-md border border-[var(--color-base-300)] bg-[var(--color-base-300)] shrink-0" />
							)}
							<div className="min-w-0 flex-1">
								<p className="font-medium truncate">{m.game_name}</p>
								<div className="flex items-center justify-between gap-2">
									<p className="text-xs text-[var(--color-base-content)]/50 truncate">
										{m.system_name} {m.submitted_by ? `· ${m.submitted_by}` : ""}
									</p>
									<span className="text-[11px] text-[var(--color-base-content)]/40 shrink-0">
										{formatDate(m.created_at)}
									</span>
								</div>
							</div>
						</Link>
					))}
				</LeaderCard>
			</div>
		</div>
	);
}

// StatCard is one of the dashboard's headline metric tiles. Its tone-* class
// gives the icon and the number the color of the area it counts.
function StatCard({ tone, icon, label, value }: { tone: string; icon: ReactNode; label: string; value: string }) {
	return (
		<div className={`card p-4 flex items-center gap-4 ${tone}`}>
			<span className="tone-chip !w-10 !h-10">{icon}</span>
			<div className="min-w-0">
				<p className="text-xs text-[var(--color-base-content)]/60 truncate">{label}</p>
				<p className="font-display text-2xl font-semibold leading-tight tabular-nums truncate tone-text">
					{value}
				</p>
			</div>
		</div>
	);
}

// RankIcon is the position of a ranking row; the first three get the podium
// colors (gold, silver, bronze).
function RankIcon({ i }: { i: number }) {
	return (
		<span
			className={`w-7 h-7 rounded-full grid place-items-center font-mono text-sm font-bold shrink-0 ${
				i < 3
					? `rank-${i + 1} bg-[color-mix(in_oklab,var(--tone)_18%,transparent)] text-[var(--tone)]`
					: "bg-[var(--color-base-300)] text-[var(--color-base-content)]/50"
			}`}
		>
			{i + 1}
		</span>
	);
}

function LeaderCard({
	title,
	icon,
	empty,
	tone = "tone-primary",
	children,
}: {
	title: string;
	icon: ReactNode;
	empty: string;
	tone?: string;
	children: ReactNode;
}) {
	const items = Array.isArray(children) ? children : null;
	return (
		<section className={`card p-5 space-y-3 ${tone}`}>
			<h2 className="font-semibold flex items-center gap-2.5 text-base">
				<span className="tone-chip !w-7 !h-7">{icon}</span>
				{title}
			</h2>
			{items && items.length === 0 ? (
				<p className="text-sm text-[var(--color-base-content)]/50">{empty}</p>
			) : (
				<div className="space-y-2">{children}</div>
			)}
		</section>
	);
}
