import { useCallback, useEffect, useState } from "react";
import { Gauge, KeyRound, Plus, RotateCw, Trash2 } from "lucide-react";
import { useTranslation } from "react-i18next";
import CopyButton from "../components/CopyButton";
import {
	createDeveloperApp,
	deleteDeveloperApp,
	fetchDeveloperApps,
	rotateDeveloperApp,
	type DeveloperApp,
} from "../lib/api";

interface Revealed {
	title: string;
	value: string;
	extra?: string;
}

function formatDate(value?: string | null, fallback?: string): string {
	if (!value) return fallback || "";
	return new Date(value).toLocaleString();
}

export default function DeveloperPage() {
	const { t } = useTranslation();
	const [apps, setApps] = useState<DeveloperApp[]>([]);
	const [loading, setLoading] = useState(true);
	const [error, setError] = useState("");
	const [revealed, setRevealed] = useState<Revealed | null>(null);

	const [appName, setAppName] = useState("");
	const [appDesc, setAppDesc] = useState("");
	const [appHome, setAppHome] = useState("");

	const load = useCallback(async () => {
		setLoading(true);
		setError("");
		try {
			setApps(await fetchDeveloperApps());
		} catch (e) {
			setError(e instanceof Error ? e.message : String(e));
		} finally {
			setLoading(false);
		}
	}, []);

	useEffect(() => {
		void load();
	}, [load]);

	const handleCreateApp = async () => {
		if (!appName.trim()) return;
		setError("");
		try {
			const app = await createDeveloperApp({ name: appName.trim(), description: appDesc.trim(), homepage_url: appHome.trim() });
			setAppName("");
			setAppDesc("");
			setAppHome("");
			setRevealed({
				title: `${app.name} — ${t("developer.clientSecret")}`,
				value: app.client_secret,
				extra: app.debug_password ? `${t("developer.debugPassword")}: ${app.debug_password}` : undefined,
			});
			await load();
		} catch (e) {
			setError(e instanceof Error ? e.message : String(e));
		}
	};

	const handleDeleteApp = async (app: DeveloperApp) => {
		if (!window.confirm(t("developer.confirmRevoke", { name: app.name }))) return;
		try {
			await deleteDeveloperApp(app.id);
			await load();
		} catch (e) {
			setError(e instanceof Error ? e.message : String(e));
		}
	};

	const handleRotateApp = async (app: DeveloperApp) => {
		if (!window.confirm(t("developer.confirmRotate", { name: app.name }))) return;
		try {
			const rotated = await rotateDeveloperApp(app.id);
			setRevealed({
				title: `${rotated.name} — ${t("developer.clientSecret")}`,
				value: rotated.client_secret,
				extra: rotated.debug_password ? `${t("developer.debugPassword")}: ${rotated.debug_password}` : undefined,
			});
			await load();
		} catch (e) {
			setError(e instanceof Error ? e.message : String(e));
		}
	};

	// Revoked apps are hidden from the dashboard.
	const activeApps = apps.filter((a) => !a.revoked_at);

	const softwareRows = activeApps.flatMap((a) =>
		a.software && a.software.length > 0
			? a.software.map((s) => ({ appName: a.name, ...s }))
			: [
					{
						app_id: a.id,
						name: a.name,
						appName: a.name,
						api_calls: 0,
						ko_scraps: 0,
						rate_limited: 0,
						quota_exceeded: 0,
						debug_calls: 0,
						last_scrape_at: null as string | null,
					},
				],
	);
	const totals = softwareRows.reduce(
		(acc, s) => ({
			api_calls: acc.api_calls + (s.api_calls || 0),
			ko_scraps: acc.ko_scraps + (s.ko_scraps || 0),
			rate_limited: acc.rate_limited + (s.rate_limited || 0),
			quota_exceeded: acc.quota_exceeded + (s.quota_exceeded || 0),
			debug_calls: acc.debug_calls + (s.debug_calls || 0),
		}),
		{ api_calls: 0, ko_scraps: 0, rate_limited: 0, quota_exceeded: 0, debug_calls: 0 },
	);
	const pct = (ko: number, calls: number) => (calls > 0 ? `${((ko / calls) * 100).toFixed(1)}%` : "0%");

	return (
		<div className="space-y-6">
			<div>
				<h1 className="text-2xl md:text-3xl font-bold tracking-tight">{t("developer.title")}</h1>
				<p className="text-sm text-[var(--color-base-content)]/60">{t("developer.subtitle")}</p>
			</div>

			{error ? <div className="card p-4 text-sm text-red-500">{error}</div> : null}

			<section className="card p-6 space-y-4">
				<h2 className="font-semibold flex items-center gap-2">
					<KeyRound className="w-4 h-4 text-[var(--color-primary)]" /> {t("developer.appsTitle")}
				</h2>

				<div className="grid grid-cols-1 md:grid-cols-3 gap-2">
					<input className="input input-bordered" placeholder={t("developer.appName")} value={appName} onChange={(e) => setAppName(e.target.value)} />
					<input className="input input-bordered" placeholder={t("developer.appDescription")} value={appDesc} onChange={(e) => setAppDesc(e.target.value)} />
					<input className="input input-bordered" placeholder={t("developer.appHomepage")} value={appHome} onChange={(e) => setAppHome(e.target.value)} />
				</div>
				<button type="button" className="btn btn-primary btn-sm gap-1" onClick={handleCreateApp} disabled={!appName.trim()}>
					<Plus className="w-4 h-4" /> {t("developer.createApp")}
				</button>
				<p className="text-xs text-[var(--color-base-content)]/60">{t("developer.debugHint")}</p>

				{loading ? (
					<p className="text-sm text-[var(--color-base-content)]/60">{t("common.loading")}</p>
				) : activeApps.length === 0 ? (
					<p className="text-sm text-[var(--color-base-content)]/60">{t("developer.appsEmpty")}</p>
				) : (
					<ul className="divide-y divide-[var(--color-base-300)]">
						{activeApps.map((app) => (
							<li key={app.id} className="py-3 flex flex-wrap items-center gap-3">
								<div className="min-w-0 flex-1">
									<p className="font-medium truncate">{app.name}</p>
									<p className="text-xs text-[var(--color-base-content)]/60 break-all">
										{t("developer.clientId")}: <code>{app.client_id}</code>
									</p>
									<p className="text-xs text-[var(--color-base-content)]/50">
										{t("developer.lastUsed")}: {formatDate(app.last_used_at, t("developer.never"))}
									</p>
								</div>
								<div className="flex items-center gap-1">
									<button type="button" className="btn btn-ghost btn-sm gap-1" onClick={() => handleRotateApp(app)}>
										<RotateCw className="w-3.5 h-3.5" /> {t("developer.rotate")}
									</button>
									<button type="button" className="btn btn-ghost btn-sm gap-1 text-red-500" onClick={() => handleDeleteApp(app)}>
										<Trash2 className="w-3.5 h-3.5" /> {t("developer.revoke")}
									</button>
								</div>
							</li>
						))}
					</ul>
				)}
			</section>

			<section className="card p-6 space-y-3">
				<h2 className="font-semibold flex items-center gap-2">
					<Gauge className="w-4 h-4 text-[var(--color-primary)]" /> {t("developer.statsTitle")}
				</h2>
				<p className="text-xs text-[var(--color-base-content)]/60">{t("developer.softnameHint")}</p>
				{loading ? (
					<p className="text-sm text-[var(--color-base-content)]/60">{t("common.loading")}</p>
				) : (
					<div className="overflow-x-auto">
						<table className="w-full text-sm">
							<thead>
								<tr className="text-left text-xs uppercase tracking-wide text-[var(--color-base-content)]/50">
									<th className="py-2 pr-4">{t("developer.colApp")}</th>
									<th className="py-2 pr-4">{t("developer.colSoftware")}</th>
									<th className="py-2 pr-4">{t("developer.colCalls")}</th>
									<th className="py-2 pr-4">{t("developer.colKO")}</th>
									<th className="py-2 pr-4">{t("developer.colPct")}</th>
									<th className="py-2 pr-4">{t("developer.colRateLimited")}</th>
									<th className="py-2 pr-4">{t("developer.colQuota")}</th>
									<th className="py-2 pr-4">{t("developer.colDebug")}</th>
									<th className="py-2">{t("developer.colLastScrape")}</th>
								</tr>
							</thead>
							<tbody className="divide-y divide-[var(--color-base-300)]">
								{softwareRows.map((s) => (
									<tr key={`${s.app_id}:${s.name}`}>
										<td className="py-2 pr-4">{s.appName}</td>
										<td className="py-2 pr-4 font-medium">{s.name}</td>
										<td className="py-2 pr-4">{(s.api_calls || 0).toLocaleString()}</td>
										<td className="py-2 pr-4">{(s.ko_scraps || 0).toLocaleString()}</td>
										<td className="py-2 pr-4">{pct(s.ko_scraps || 0, s.api_calls || 0)}</td>
										<td className="py-2 pr-4">{(s.rate_limited || 0).toLocaleString()}</td>
										<td className="py-2 pr-4">{(s.quota_exceeded || 0).toLocaleString()}</td>
										<td className="py-2 pr-4">{(s.debug_calls || 0).toLocaleString()}</td>
										<td className="py-2">{formatDate(s.last_scrape_at, t("developer.never"))}</td>
									</tr>
								))}
								<tr className="font-semibold">
									<td className="py-2 pr-4" />
									<td className="py-2 pr-4">{t("developer.totals")}</td>
									<td className="py-2 pr-4">{totals.api_calls.toLocaleString()}</td>
									<td className="py-2 pr-4">{totals.ko_scraps.toLocaleString()}</td>
									<td className="py-2 pr-4">{pct(totals.ko_scraps, totals.api_calls)}</td>
									<td className="py-2 pr-4">{totals.rate_limited.toLocaleString()}</td>
									<td className="py-2 pr-4">{totals.quota_exceeded.toLocaleString()}</td>
									<td className="py-2 pr-4">{totals.debug_calls.toLocaleString()}</td>
									<td className="py-2" />
								</tr>
							</tbody>
						</table>
					</div>
				)}
			</section>

			{revealed ? (
				<div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4" role="dialog" aria-modal="true">
					<div className="card w-full max-w-lg p-6 space-y-3">
						<p className="font-semibold">{revealed.title}</p>
						<p className="text-xs text-red-500">{t("developer.secretOnce")}</p>
						<code className="block break-all rounded bg-[var(--color-base-200)] px-3 py-2 text-xs">{revealed.value}</code>
						{revealed.extra ? (
							<code className="block break-all rounded bg-[var(--color-base-200)] px-3 py-2 text-xs">{revealed.extra}</code>
						) : null}
						<div className="flex items-center justify-end gap-2">
							<CopyButton value={revealed.value} />
							<button type="button" className="btn btn-primary btn-sm" onClick={() => setRevealed(null)}>
								{t("developer.savedIt")}
							</button>
						</div>
					</div>
				</div>
			) : null}
		</div>
	);
}
