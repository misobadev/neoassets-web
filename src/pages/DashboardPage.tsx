import { useEffect, useState, type ReactNode } from "react";
import { useTranslation } from "react-i18next";
import { Link } from "react-router-dom";
import { Award, Check, Clock, Crown, Database, Download, Flame, Gamepad2, HardDrive, Layers, ListChecks, Package, ShieldCheck, Users, X } from "lucide-react";
import { api, cdnUrl, CDN_BASE, fetchDashboard, fetchStorageUsage, type DashboardData, type Pack, type StorageUsage } from "../lib/api";
import { formatDate } from "../lib/format";
import UserLink from "../components/UserLink";
import Avatar from "../components/Avatar";

export default function DashboardPage() {
	const { t } = useTranslation();
	const [data, setData] = useState<DashboardData | null>(null);
	const [error, setError] = useState<string | null>(null);
	const [storageUsage, setStorageUsage] = useState<StorageUsage | null>(null);
	const [packs, setPacks] = useState<Pack[] | null>(null);

	useEffect(() => {
		fetchDashboard()
			.then(setData)
			.catch((e: Error) => setError(e.message));
		fetchStorageUsage()
			.then(setStorageUsage)
			.catch(() => {});
		api<{ themes: Pack[] }>("/api/v1/packs")
			.then((d) => setPacks(d.themes || []))
			.catch(() => setPacks([]));
	}, []);

	if (error) return <p className="text-sm text-[var(--color-error)] text-center py-10">{error}</p>;
	if (!data) return <p className="text-sm text-[var(--color-base-content)]/50 text-center py-10">{t("dashboard.loading")}</p>;

		return (
		<div className="space-y-6">
			<div>
				<h1 className="text-2xl md:text-3xl font-bold tracking-tight">{t("nav.dashboard")}</h1>
				<p className="text-sm text-[var(--color-base-content)]/60">{t("dashboard.subtitle")}</p>
			</div>

			{/* Catalog & community totals */}
			<div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
				<div className="card p-4">
					<div className="flex items-center gap-2 mb-1">
						<Gamepad2 className="w-4 h-4 text-[var(--color-primary)]" />
						<span className="text-xs text-[var(--color-base-content)]/60 uppercase tracking-wide">{t("dashboard.totalGames")}</span>
					</div>
					<p className="text-2xl font-bold">{data.total_games.toLocaleString()}</p>
				</div>
				<div className="card p-4">
					<div className="flex items-center gap-2 mb-1">
						<Layers className="w-4 h-4 text-[var(--color-info)]" />
						<span className="text-xs text-[var(--color-base-content)]/60 uppercase tracking-wide">{t("dashboard.totalSystems")}</span>
					</div>
					<p className="text-2xl font-bold">{data.total_systems.toLocaleString()}</p>
				</div>
				<div className="card p-4">
					<div className="flex items-center gap-2 mb-1">
						<Package className="w-4 h-4 text-[var(--color-success)]" />
						<span className="text-xs text-[var(--color-base-content)]/60 uppercase tracking-wide">{t("dashboard.totalPacks")}</span>
					</div>
					<p className="text-2xl font-bold">{data.total_packs.toLocaleString()}</p>
				</div>
				<div className="card p-4">
					<div className="flex items-center gap-2 mb-1">
						<Users className="w-4 h-4 text-[var(--color-primary)]" />
						<span className="text-xs text-[var(--color-base-content)]/60 uppercase tracking-wide">{t("dashboard.totalUsers")}</span>
					</div>
					<p className="text-2xl font-bold">{data.total_users.toLocaleString()}</p>
				</div>
			</div>

			{/* Activity & storage totals */}
			<div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
				<div className="card p-4">
					<div className="flex items-center gap-2 mb-1">
						<ListChecks className="w-4 h-4 text-[var(--color-success)]" />
						<span className="text-xs text-[var(--color-base-content)]/60 uppercase tracking-wide">{t("dashboard.totalContributions")}</span>
					</div>
					<p className="text-2xl font-bold">{data.total_contributions.toLocaleString()}</p>
				</div>
				{storageUsage ? (
					<>
						<div className="card p-4">
							<div className="flex items-center gap-2 mb-1">
								<HardDrive className="w-4 h-4 text-[var(--color-primary)]" />
								<span className="text-xs text-[var(--color-base-content)]/60 uppercase tracking-wide">{t("dashboard.totalStorage")}</span>
							</div>
							<p className="text-2xl font-bold">{fmtBytes(storageUsage.total_bytes)}</p>
						</div>
						<div className="card p-4">
							<div className="flex items-center gap-2 mb-1">
								<Package className="w-4 h-4 text-[var(--color-warning)]" />
								<span className="text-xs text-[var(--color-base-content)]/60 uppercase tracking-wide">{t("dashboard.mediaStorage")}</span>
							</div>
							<p className="text-2xl font-bold">{fmtBytes(storageUsage.storage_bytes)}</p>
							<p className="text-xs text-[var(--color-base-content)]/50">{t("dashboard.objects", { count: storageUsage.storage_objects })}</p>
						</div>
						<div className="card p-4">
							<div className="flex items-center gap-2 mb-1">
								<Database className="w-4 h-4 text-[var(--color-info)]" />
								<span className="text-xs text-[var(--color-base-content)]/60 uppercase tracking-wide">{t("dashboard.metadataStorage")}</span>
							</div>
							<p className="text-2xl font-bold">{fmtBytes(storageUsage.db_bytes)}</p>
						</div>
					</>
				) : null}
			</div>

			<div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
				<LeaderCard title={t("dashboard.topReviewers")} icon={<ShieldCheck className="w-4 h-4" />} empty={t("dashboard.noReviews")}>
					{(data.top_reviewers || []).map((u) => (
						<div key={u.id} className="flex items-center justify-between gap-2">
							<span className="flex items-center gap-2 min-w-0">
								<Avatar name={u.username} avatarKey={u.avatar_key} size={28} />
								<UserLink>{u.username}</UserLink>
							</span>
							<span className="flex items-center gap-2 text-xs">
								<span className="inline-flex items-center gap-1 text-[var(--color-success)]"><Check className="w-3.5 h-3.5" />{u.approved}</span>
								<span className="inline-flex items-center gap-1 text-[var(--color-error)]"><X className="w-3.5 h-3.5" />{u.rejected}</span>
							</span>
						</div>
					))}
				</LeaderCard>

				<LeaderCard title={t("dashboard.topContributors")} icon={<ListChecks className="w-4 h-4" />} empty={t("dashboard.noSubmissions")}>
					{(data.top_contributions || []).map((u, i) => (
						<div key={u.id} className="flex items-center justify-between gap-2">
							<span className="flex items-center gap-2 truncate">
								<RankIcon i={i} />
								<Avatar name={u.username} avatarKey={u.avatar_key} size={28} />
								<UserLink>{u.username}</UserLink>
							</span>
							<span className="badge badge-primary badge-sm">{t("dashboard.contributions", { count: u.count })}</span>
						</div>
					))}
				</LeaderCard>

				<LeaderCard title={t("dashboard.topApprovedWeek")} icon={<Award className="w-4 h-4" />} empty={t("dashboard.noApprovedWeek")}>
					{(data.top_approved_week || []).map((u, i) => (
						<div key={u.id} className="flex items-center justify-between gap-2">
							<span className="flex items-center gap-2 truncate">
								<RankIcon i={i} />
								<Avatar name={u.username} avatarKey={u.avatar_key} size={28} />
								<UserLink>{u.username}</UserLink>
							</span>
							<span className="badge badge-success badge-sm">{t("dashboard.approvedCount", { count: u.count })}</span>
						</div>
					))}
				</LeaderCard>
			</div>

			<div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
				<LeaderCard title={t("dashboard.topLevels")} icon={<Crown className="w-4 h-4" />} empty={t("dashboard.noLevels")}>
					{(data.top_levels || []).map((u, i) => (
						<div key={u.id} className="flex items-center justify-between gap-2">
							<span className="flex items-center gap-2 truncate">
								<RankIcon i={i} />
								<Avatar name={u.username} avatarKey={u.avatar_key} size={28} />
								<UserLink>{u.username}</UserLink>
								<span className="badge badge-ghost badge-sm">{t("guide.ranks." + u.rank, { defaultValue: u.rank })}</span>
							</span>
							<span className="text-xs text-[var(--color-base-content)]/60 shrink-0">{t("dashboard.levelOnly", { level: u.level })}</span>
						</div>
					))}
				</LeaderCard>

				<LeaderCard title={t("dashboard.topGames")} icon={<Flame className="w-4 h-4" />} empty={t("dashboard.noGames")}>
					{(data.top_games || []).map((g, i) => (
						<Link key={g.id} to={`/app/metadata/${g.system_id}/game/${g.id}`} className="flex items-center justify-between gap-2 hover:bg-base-300 rounded-md -mx-2 px-2 py-0.5">
							<span className="flex items-center gap-2 truncate">
								<RankIcon i={i} />
								<span className="truncate">{g.name}</span>
								<span className="text-[11px] text-[var(--color-base-content)]/40 shrink-0 font-mono">{g.system_id}</span>
							</span>
							<span className="badge badge-primary badge-sm shrink-0">{t("dashboard.scrapes", { count: g.scrapes })}</span>
						</Link>
					))}
				</LeaderCard>
			</div>

			<div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
				<LeaderCard title={t("dashboard.latestSap")} icon={<Package className="w-4 h-4" />} empty={t("dashboard.noPublishedPacks")}>
					{(data.recent_packs || []).map((p) => (
						<div key={p.id} className="flex items-center gap-3">
							<img src={cdnUrl(`packs/${p.pack_id}/preview.webp`)} alt="" className="w-12 h-12 object-cover rounded-md border border-[var(--color-base-300)] bg-[var(--color-base-300)]" onError={(e) => (e.currentTarget.style.display = "none")} />
							<div className="min-w-0 flex-1">
								<p className="font-medium truncate">{p.name}</p>
								<p className="text-xs text-[var(--color-base-content)]/50 truncate">{t("dashboard.by", { author: p.author_name || p.author })} · v{p.version}</p>
							</div>
							<span className="text-[11px] text-[var(--color-base-content)]/40 shrink-0">{formatDate(p.created_at)}</span>
						</div>
					))}
				</LeaderCard>

				<LeaderCard title={t("dashboard.latestMetadata")} icon={<Clock className="w-4 h-4" />} empty={t("dashboard.noApprovedMetadata")}>
					{(data.recent_metadata || []).map((m) => (
						<Link key={m.id} to={m.game_id && m.system_id ? `/app/metadata/${m.system_id}/game/${m.game_id}` : "/app/metadata"} className="flex items-center gap-3 hover:bg-base-300 rounded-md -mx-2 px-2 py-1">
							<div className="min-w-0 flex-1">
								<p className="font-medium truncate">{m.game_name}</p>
								<p className="text-xs text-[var(--color-base-content)]/50 truncate">{m.system_name} {m.submitted_by ? `· ${m.submitted_by}` : ""}</p>
							</div>
							<span className="text-[11px] text-[var(--color-base-content)]/40 shrink-0">{formatDate(m.created_at)}</span>
						</Link>
					))}
				</LeaderCard>
			</div>

			{/* Approved System Art Packs (visible to everyone, guests included) */}
			<section className="space-y-3">
				<h2 className="font-semibold flex items-center gap-2 text-sm uppercase tracking-wide text-[var(--color-base-content)]/70">
					<span className="text-[var(--color-primary)]"><Package className="w-4 h-4" /></span>
					{t("dashboard.systemArtPacks", { count: packs?.length ?? 0 })}
				</h2>
				{packs === null ? (
					<p className="text-sm text-[var(--color-base-content)]/50">{t("dashboard.loadingPacks")}</p>
				) : packs.length === 0 ? (
					<p className="text-sm text-[var(--color-base-content)]/50">{t("dashboard.noApprovedPacks")}</p>
				) : (
					<div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
						{packs.map((p) => {
							const preview = p.preview ? `${CDN_BASE}/${p.preview}` : "";
							const icons = (p.backgrounds || []).map((k) => `${CDN_BASE}/${k}`);
							return (
								<div key={p.folder} className="card card-hover overflow-hidden">
									<div className="h-32 bg-[var(--color-base-300)] flex items-center justify-center overflow-hidden">
										{icons.length > 0 ? (
											<div className="flex flex-wrap items-center justify-center gap-1 p-2">
												{icons.slice(0, 4).map((src, i) => (
													<img key={i} src={src} alt="" className="w-16 h-16 object-cover rounded-md" onError={(e) => (e.currentTarget.style.display = "none")} />
												))}
											</div>
										) : preview ? (
											<img src={preview} alt={p.name} className="object-cover w-full h-full" onError={(e) => (e.currentTarget.style.display = "none")} />
										) : null}
									</div>
									<div className="p-4 space-y-1">
										<div className="flex items-center justify-between gap-2">
											<h3 className="font-semibold truncate">{p.name}</h3>
											<span className="badge badge-success shrink-0">v{p.version || "?"}</span>
										</div>
										<p className="text-sm text-[var(--color-base-content)]/60 line-clamp-2 min-h-[2.5rem]">{p.description}</p>
										<p className="text-xs text-[var(--color-base-content)]/50 flex items-center gap-1">
											{p.downloads ? (
												<>
													<Download className="w-3.5 h-3.5" />
													{p.downloads.toLocaleString()}
												</>
											) : null}
											{p.author}
										</p>
									</div>
								</div>
							);
						})}
					</div>
				)}
			</section>
		</div>
	);
}

function RankIcon({ i }: { i: number }) {
	const medal = ["text-[var(--color-warning)]", "text-[var(--color-base-content)]/60", "text-[var(--color-error)]"][i] || "text-[var(--color-base-content)]/40";
	return <span className={`font-mono text-xs font-bold ${medal}`}>#{i + 1}</span>;
}

function fmtBytes(bytes: number): string {
	if (bytes >= 1024 * 1024 * 1024) return `${(bytes / (1024 * 1024 * 1024)).toFixed(1)} GB`;
	if (bytes >= 1024 * 1024) return `${(bytes / (1024 * 1024)).toFixed(0)} MB`;
	return `${(bytes / 1024).toFixed(0)} KB`;
}

function LeaderCard({ title, icon, empty, children }: { title: string; icon: ReactNode; empty: string; children: ReactNode }) {
	const items = Array.isArray(children) ? children : null;
	return (
		<section className="card p-5 space-y-3">
			<h2 className="font-semibold flex items-center gap-2 text-sm uppercase tracking-wide text-[var(--color-base-content)]/70">
				<span className="text-[var(--color-primary)]">{icon}</span>
				{title}
			</h2>
			{items && items.length === 0 ? <p className="text-sm text-[var(--color-base-content)]/50">{empty}</p> : <div className="space-y-2">{children}</div>}
		</section>
	);
}
