import { useEffect, useMemo, useState } from "react";
import { useTranslation } from "react-i18next";
import { Activity, AppWindow, CalendarDays, Gauge, KeyRound, Search, Zap } from "lucide-react";
import { fetchDeveloperOverview, type DeveloperOverview } from "../lib/api";
import { formatDate } from "../lib/format";
import { usePageMeta, useNoIndex } from "../lib/seo";
import BackLink from "../components/ui/BackLink";
import PageTitle from "../components/ui/PageTitle";
import SectionTitle from "../components/ui/SectionTitle";
import StatTile from "../components/ui/StatTile";
import UserLink from "../components/UserLink";

// AdminDeveloperView lists every developer app and personal API key with its
// usage (admin only). Scrape usage is counted per user, so each key shows its
// owner's usage.
export default function AdminDeveloperView() {
	const { t } = useTranslation();
	usePageMeta({ title: `${t("adminDeveloper.title")} - NeoAssets` });
	useNoIndex();
	const [data, setData] = useState<DeveloperOverview | null>(null);
	const [error, setError] = useState<string | null>(null);
	const [query, setQuery] = useState("");

	useEffect(() => {
		fetchDeveloperOverview()
			.then(setData)
			.catch((e: Error) => setError(e.message));
	}, []);

	const q = query.trim().toLowerCase();
	const apps = useMemo(
		() =>
			(data?.apps || []).filter(
				(a) =>
					!q ||
					a.name.toLowerCase().includes(q) ||
					a.owner.toLowerCase().includes(q) ||
					a.client_id.toLowerCase().includes(q) ||
					(a.software || []).some((s) => s.name.toLowerCase().includes(q)),
			),
		[data, q],
	);
	const keys = useMemo(
		() =>
			(data?.keys || []).filter(
				(k) =>
					!q ||
					k.name.toLowerCase().includes(q) ||
					k.owner.toLowerCase().includes(q) ||
					k.prefix.toLowerCase().includes(q),
			),
		[data, q],
	);
	const n = (v: number) => v.toLocaleString();
	const when = (v?: string | null) => (v ? formatDate(v) : t("adminDeveloper.never"));

	return (
		<div className="space-y-6">
			<div>
				<BackLink to="/app/admin" label={t("nav.admin")} />
				<PageTitle icon={KeyRound} tone="tone-primary">
					{t("adminDeveloper.title")}
				</PageTitle>
				<p className="text-sm text-[var(--color-base-content)]/60 pt-1">{t("adminDeveloper.subtitle")}</p>
			</div>

			{error ? <p className="text-sm text-[var(--color-error)]">{error}</p> : null}
			{!data && !error ? (
				<p className="text-sm text-[var(--color-base-content)]/50 py-6 text-center">{t("common.loading")}</p>
			) : null}

			{data ? (
				<>
					<div className="grid grid-cols-2 lg:grid-cols-3 gap-3">
						<StatTile
							tone="tone-primary"
							icon={AppWindow}
							label={t("adminDeveloper.activeApps")}
							value={n(data.totals.active_apps)}
						/>
						<StatTile
							tone="tone-system"
							icon={KeyRound}
							label={t("adminDeveloper.activeKeys")}
							value={n(data.totals.active_keys)}
						/>
						<StatTile
							tone="tone-meta"
							icon={Activity}
							label={t("adminDeveloper.apiCalls")}
							value={n(data.totals.api_calls)}
						/>
						<StatTile
							tone="tone-community"
							icon={Zap}
							label={t("adminDeveloper.scrapesToday")}
							value={n(data.totals.scrapes_today)}
						/>
						<StatTile
							tone="tone-sap"
							icon={CalendarDays}
							label={t("adminDeveloper.scrapes30d")}
							value={n(data.totals.scrapes_30d)}
						/>
						<StatTile
							tone="tone-reward"
							icon={Gauge}
							label={t("adminDeveloper.overQuota")}
							value={n(data.totals.quota_exceeded)}
						/>
					</div>

					<div className="relative">
						<Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-[var(--color-base-content)]/40" />
						<input
							className="input pl-9 w-full"
							placeholder={t("adminDeveloper.search")}
							value={query}
							onChange={(e) => setQuery(e.target.value)}
						/>
					</div>

					<section className="card p-4 sm:p-6 tone-primary">
						<SectionTitle icon={AppWindow}>
							{t("adminDeveloper.apps")}{" "}
							<span className="font-normal text-sm text-[var(--color-base-content)]/50">
								({apps.length})
							</span>
						</SectionTitle>
						{apps.length === 0 ? (
							<p className="text-sm text-[var(--color-base-content)]/50">{t("adminDeveloper.empty")}</p>
						) : (
							<div className="overflow-x-auto -mx-4 sm:mx-0">
								<table className="w-full text-sm min-w-[52rem]">
									<thead>
										<tr className="text-left fact-label border-b border-[var(--color-base-300)]">
											<th className="py-2 px-3">{t("adminDeveloper.app")}</th>
											<th className="py-2 px-3">{t("adminDeveloper.owner")}</th>
											<th className="py-2 px-3 text-right">{t("adminDeveloper.apiCalls")}</th>
											<th className="py-2 px-3 text-right">{t("adminDeveloper.notFound")}</th>
											<th className="py-2 px-3 text-right">{t("adminDeveloper.rateLimited")}</th>
											<th className="py-2 px-3 text-right">{t("adminDeveloper.overQuota")}</th>
											<th className="py-2 px-3">{t("adminDeveloper.lastUsed")}</th>
											<th className="py-2 px-3">{t("adminDeveloper.status")}</th>
										</tr>
									</thead>
									<tbody className="divide-y divide-[var(--color-base-300)]">
										{apps.map((a) => (
											<tr key={a.id} className="align-top hover:bg-[var(--color-base-300)]/30">
												<td className="py-2.5 px-3 min-w-0">
													<p className="font-medium">{a.name}</p>
													<p className="font-mono text-[11px] text-[var(--color-base-content)]/50">
														{a.client_id}
													</p>
													{(a.software || []).length > 0 ? (
														<div className="flex flex-wrap gap-1 mt-1.5">
															{(a.software || []).map((s) => (
																<span
																	key={s.name}
																	className="badge badge-xs badge-solid-neutral"
																	title={`${s.name}: ${n(s.api_calls)} ${t("adminDeveloper.apiCalls")}`}
																>
																	{s.name} · {n(s.api_calls)}
																</span>
															))}
														</div>
													) : null}
												</td>
												<td className="py-2.5 px-3">
													{a.owner ? <UserLink>{a.owner}</UserLink> : "-"}
												</td>
												<td className="py-2.5 px-3 text-right font-display font-semibold text-[var(--color-meta)] tabular-nums">
													{n(a.api_calls)}
												</td>
												<td className="py-2.5 px-3 text-right tabular-nums">
													{n(a.ko_scraps)}
												</td>
												<td className="py-2.5 px-3 text-right tabular-nums">
													{n(a.rate_limited)}
												</td>
												<td className="py-2.5 px-3 text-right tabular-nums">
													{n(a.quota_exceeded)}
												</td>
												<td className="py-2.5 px-3 whitespace-nowrap text-[var(--color-base-content)]/70">
													{when(a.last_scrape_at || a.last_used_at)}
													<p className="text-[11px] text-[var(--color-base-content)]/45">
														{t("adminDeveloper.created", {
															date: formatDate(a.created_at),
														})}
													</p>
												</td>
												<td className="py-2.5 px-3">
													<StatusPill revoked={!!a.revoked_at} />
												</td>
											</tr>
										))}
									</tbody>
								</table>
							</div>
						)}
					</section>

					<section className="card p-4 sm:p-6 tone-system">
						<SectionTitle icon={KeyRound} className="mb-1">
							{t("adminDeveloper.keys")}{" "}
							<span className="font-normal text-sm text-[var(--color-base-content)]/50">
								({keys.length})
							</span>
						</SectionTitle>
						<p className="text-xs text-[var(--color-base-content)]/50 mb-4">
							{t("adminDeveloper.usageNote")}
						</p>
						{keys.length === 0 ? (
							<p className="text-sm text-[var(--color-base-content)]/50">{t("adminDeveloper.empty")}</p>
						) : (
							<div className="overflow-x-auto -mx-4 sm:mx-0">
								<table className="w-full text-sm min-w-[44rem]">
									<thead>
										<tr className="text-left fact-label border-b border-[var(--color-base-300)]">
											<th className="py-2 px-3">{t("adminDeveloper.key")}</th>
											<th className="py-2 px-3">{t("adminDeveloper.owner")}</th>
											<th className="py-2 px-3 text-right">{t("adminDeveloper.ownerToday")}</th>
											<th className="py-2 px-3 text-right">{t("adminDeveloper.owner30d")}</th>
											<th className="py-2 px-3">{t("adminDeveloper.lastUsed")}</th>
											<th className="py-2 px-3">{t("adminDeveloper.status")}</th>
										</tr>
									</thead>
									<tbody className="divide-y divide-[var(--color-base-300)]">
										{keys.map((k) => (
											<tr key={k.id} className="hover:bg-[var(--color-base-300)]/30">
												<td className="py-2.5 px-3">
													<p className="font-medium">{k.name}</p>
													<p className="font-mono text-[11px] text-[var(--color-base-content)]/50">
														{k.prefix}…
													</p>
												</td>
												<td className="py-2.5 px-3">
													{k.owner ? <UserLink>{k.owner}</UserLink> : "-"}
												</td>
												<td className="py-2.5 px-3 text-right font-display font-semibold text-[var(--color-community)] tabular-nums">
													{n(k.owner_scrapes_today)}
												</td>
												<td className="py-2.5 px-3 text-right tabular-nums">
													{n(k.owner_scrapes_30d)}
												</td>
												<td className="py-2.5 px-3 whitespace-nowrap text-[var(--color-base-content)]/70">
													{when(k.last_used_at)}
													<p className="text-[11px] text-[var(--color-base-content)]/45">
														{t("adminDeveloper.created", {
															date: formatDate(k.created_at),
														})}
													</p>
												</td>
												<td className="py-2.5 px-3">
													<StatusPill revoked={!!k.revoked_at} />
												</td>
											</tr>
										))}
									</tbody>
								</table>
							</div>
						)}
					</section>
				</>
			) : null}
		</div>
	);
}

function StatusPill({ revoked }: { revoked: boolean }) {
	const { t } = useTranslation();
	return revoked ? (
		<span className="badge badge-sm badge-error">{t("adminDeveloper.revoked")}</span>
	) : (
		<span className="badge badge-sm badge-success">{t("adminDeveloper.active")}</span>
	);
}
