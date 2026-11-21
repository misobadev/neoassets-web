import { useEffect, useState, type ReactNode } from "react";
import PageTitle from "../components/ui/PageTitle";
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
	LayoutDashboard,
} from "lucide-react";
import { cdnUrl, fetchDashboard, type DashboardData, mediaUrl } from "../lib/api";
import UserLink from "../components/UserLink";
import Avatar from "../components/Avatar";
import StatTile from "../components/ui/StatTile";
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
				<PageTitle icon={LayoutDashboard} tone="tone-community">
					{t("nav.dashboard")}
				</PageTitle>
				<p className="text-sm text-[var(--color-base-content)]/60">{t("dashboard.subtitle")}</p>
			</div>

			{/* Catalog, community and storage totals */}
			<div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
				<StatTile
					tone="tone-meta"
					icon={Gamepad2}
					label={t("dashboard.totalGames")}
					value={data.total_games.toLocaleString()}
					to="/app/metadata"
				/>
				<StatTile
					tone="tone-system"
					icon={Layers}
					label={t("dashboard.totalSystems")}
					value={data.total_systems.toLocaleString()}
					to="/app/metadata"
				/>
				<StatTile
					tone="tone-sap"
					icon={Package}
					label={t("dashboard.totalPacks")}
					value={data.total_packs.toLocaleString()}
					to="/app/sap"
				/>
				<StatTile
					tone="tone-community"
					icon={Users}
					label={t("dashboard.totalUsers")}
					value={data.total_users.toLocaleString()}
				/>
				<StatTile
					tone="tone-reward"
					icon={ListChecks}
					label={t("dashboard.totalContributions")}
					value={data.total_contributions.toLocaleString()}
				/>
				{data.storage ? (
					<StatTile
						tone="tone-storage"
						icon={HardDrive}
						label={t("dashboard.usedSpace")}
						value={formatBytes(data.storage.total_bytes)}
					/>
				) : null}
			</div>

			{/* Top levels: a podium for the first three, the rest with XP bars. */}
			{(data.top_levels || []).length > 0 ? (
				<section className="space-y-4 tone-reward" aria-labelledby="dash-levels">
					<h2 id="dash-levels" className="font-semibold flex items-center gap-2.5 text-lg">
						<span className="tone-chip !w-7 !h-7">
							<Crown className="w-4 h-4" />
						</span>
						{t("dashboard.topLevels")}
					</h2>
					<Podium users={data.top_levels.slice(0, 3)} />
					{data.top_levels.length > 3 ? (
						<div className="card p-5 grid gap-x-8 gap-y-3 md:grid-cols-2">
							{data.top_levels.slice(3).map((u, i) => (
								<UserRow
									key={u.id}
									i={i + 3}
									name={u.username}
									avatarKey={u.avatar_key}
									badge={t("guide.ranks." + u.rank, { defaultValue: u.rank })}
									value={t("dashboard.levelOnly", { level: u.level })}
									ratio={u.xp / (data.top_levels[0].xp || 1)}
								/>
							))}
						</div>
					) : null}
				</section>
			) : null}

			<div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
				<LeaderCard
					title={t("dashboard.topContributors")}
					tone="tone-community"
					icon={<ListChecks className="w-4 h-4" />}
					empty={t("dashboard.noSubmissions")}
				>
					{(data.top_contributions || []).map((u, i, list) => (
						<UserRow
							key={u.id}
							i={i}
							name={u.username}
							avatarKey={u.avatar_key}
							value={u.count.toLocaleString()}
							ratio={u.count / (list[0].count || 1)}
						/>
					))}
				</LeaderCard>

				<LeaderCard
					title={t("dashboard.topApprovedWeek")}
					tone="tone-community"
					icon={<Award className="w-4 h-4" />}
					empty={t("dashboard.noApprovedWeek")}
				>
					{(data.top_approved_week || []).map((u, i, list) => (
						<UserRow
							key={u.id}
							i={i}
							name={u.username}
							avatarKey={u.avatar_key}
							value={u.count.toLocaleString()}
							ratio={u.count / (list[0].count || 1)}
						/>
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

// Podium shows the first three users by level: second, first and third side
// by side (first raised), each with a ring and number in its podium color.
function Podium({ users }: { users: DashboardData["top_levels"] }) {
	const { t } = useTranslation();
	// Natural order on phones; sm:order-* shows 2nd, 1st, 3rd on wide screens.
	const order = [0, 1, 2].filter((i) => users[i]);
	return (
		<ol className="grid gap-4 sm:grid-cols-3 sm:items-end">
			{order.map((i) => {
				const u = users[i];
				return (
					<li
						key={u.id}
						className={`rank-${i + 1} card relative overflow-hidden text-center px-4 pb-5 ${
							i === 0 ? "pt-8 sm:order-2" : i === 1 ? "pt-6 sm:order-1" : "pt-6 sm:order-3"
						} bg-[color-mix(in_oklab,var(--tone)_7%,var(--color-base-200))] !border-[color-mix(in_oklab,var(--tone)_35%,var(--color-base-300))]`}
					>
						<span className="absolute inset-x-0 top-0 h-1 bg-[var(--tone)]" aria-hidden="true" />
						<div className="relative mx-auto w-fit">
							<Avatar
								name={u.username}
								avatarKey={u.avatar_key}
								size={i === 0 ? 84 : 68}
								className="!rounded-full ring-[3px] ring-[var(--tone)] ring-offset-4 ring-offset-[var(--color-base-200)]"
							/>
							<span className="absolute -bottom-2 -right-2 grid place-items-center w-8 h-8 rounded-full bg-[var(--tone)] text-[#0b1016] font-display font-bold text-sm border-[3px] border-[var(--color-base-200)]">
								{i + 1}
							</span>
						</div>
						<p className="mt-5 font-display font-semibold text-lg truncate">
							<UserLink>{u.username}</UserLink>
						</p>
						<span className="badge badge-ghost badge-sm mt-1">
							{t("guide.ranks." + u.rank, { defaultValue: u.rank })}
						</span>
						<p className="mt-3 font-display text-3xl font-bold tone-text leading-none">
							{t("dashboard.levelOnly", { level: u.level })}
						</p>
						<p className="mt-1 text-xs text-[var(--color-base-content)]/60 tabular-nums">
							{u.xp.toLocaleString()} XP
						</p>
					</li>
				);
			})}
		</ol>
	);
}

// UserRow is one ranking row: position, avatar, name (with an optional rank
// badge), the value, and a bar showing it against the leader's. The bar uses a
// square-root scale so the rest stay readable when the leader is far ahead.
function UserRow({
	i,
	name,
	avatarKey,
	badge,
	value,
	ratio,
}: {
	i: number;
	name: string;
	avatarKey?: string;
	badge?: string;
	value: string;
	ratio: number;
}) {
	return (
		<div className="grid grid-cols-[1.75rem_auto_minmax(0,1fr)_auto] items-center gap-3">
			<RankIcon i={i} />
			<Avatar
				name={name}
				avatarKey={avatarKey}
				size={36}
				className={i < 3 ? `rank-${i + 1} ring-2 ring-[var(--tone)]` : ""}
			/>
			<div className="min-w-0">
				<div className="flex items-center gap-2 min-w-0">
					<span className="min-w-0 truncate font-medium">
						<UserLink>{name}</UserLink>
					</span>
					{badge ? <span className="badge badge-ghost badge-sm shrink-0">{badge}</span> : null}
				</div>
				<div
					className="mt-1.5 h-1.5 rounded-full bg-[var(--color-base-300)] overflow-hidden"
					aria-hidden="true"
				>
					<div
						className="h-full rounded-full bg-[var(--tone)]"
						style={{ width: `${Math.max(4, Math.min(100, Math.sqrt(ratio) * 100))}%` }}
					/>
				</div>
			</div>
			<span className="font-display text-sm font-semibold tabular-nums tone-text shrink-0">{value}</span>
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
