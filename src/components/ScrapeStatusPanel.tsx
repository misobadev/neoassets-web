import { useEffect, useState } from "react";
import { Activity, Gauge, Users } from "lucide-react";
import { useTranslation } from "react-i18next";
import { fetchScrapeStatus, type ScrapeStatus } from "../lib/api";

// How often the panel refreshes while the tab is visible. The endpoint is
// cached for 5 s on the server, so polling faster would show nothing new.
const REFRESH_MS = 10_000;

// useScrapeStatus polls the public scraping status while the page is visible
// and pauses while the tab is hidden.
function useScrapeStatus(): ScrapeStatus | null {
	const [status, setStatus] = useState<ScrapeStatus | null>(null);
	useEffect(() => {
		let ignore = false;
		let timer: ReturnType<typeof setInterval> | undefined;
		const load = () => {
			fetchScrapeStatus()
				.then((s) => {
					if (!ignore) setStatus(s);
				})
				.catch(() => {});
		};
		const start = () => {
			if (timer) return;
			load();
			timer = setInterval(load, REFRESH_MS);
		};
		const stop = () => {
			if (timer) clearInterval(timer);
			timer = undefined;
		};
		const onVisibility = () => (document.visibilityState === "visible" ? start() : stop());
		onVisibility();
		document.addEventListener("visibilitychange", onVisibility);
		return () => {
			ignore = true;
			stop();
			document.removeEventListener("visibilitychange", onVisibility);
		};
	}, []);
	return status;
}

function Capacity({ label, used, max }: { label: string; used?: number; max?: number }) {
	const pct = used !== undefined && max ? Math.min(100, (used / max) * 100) : 0;
	return (
		<div className="space-y-1">
			<div className="flex items-center justify-between gap-3 text-sm">
				<span className="text-[var(--color-base-content)]/70">{label}</span>
				<span className="font-display font-semibold tabular-nums">
					{used !== undefined ? used.toLocaleString() : "-"}
					<span className="text-[var(--color-base-content)]/50"> / {max ? max.toLocaleString() : "-"}</span>
				</span>
			</div>
			<div className="h-2 w-full overflow-hidden rounded-full bg-[var(--color-base-300)]">
				<div
					className="h-full rounded-full bg-[var(--tone)] transition-[width] duration-500"
					style={{ width: `${pct}%` }}
				/>
			</div>
		</div>
	);
}

function Figure({ label, value }: { label: string; value?: number }) {
	return (
		<div className="flex items-baseline justify-between gap-3 text-sm">
			<span className="text-[var(--color-base-content)]/70">{label}</span>
			<span className="font-display text-xl font-bold tabular-nums tone-text">
				{value !== undefined ? value.toLocaleString() : "-"}
			</span>
		</div>
	);
}

// ScrapeStatusPanel shows the live load of the scraping API: requests per
// minute, open threads of registered users and guests against their caps, and
// how many scrapers are active.
export default function ScrapeStatusPanel() {
	const { t } = useTranslation();
	const status = useScrapeStatus();
	return (
		<section aria-labelledby="home-api-status" className="card card-tone tone-primary p-5 space-y-4">
			<div className="flex items-center justify-between gap-3 flex-wrap">
				<h2 id="home-api-status" className="flex items-center gap-2.5 text-lg font-semibold">
					<span className="tone-chip !w-8 !h-8">
						<Activity className="w-4 h-4" aria-hidden="true" />
					</span>
					{t("home.status.title")}
				</h2>
				<span className="flex items-center gap-2 text-xs text-[var(--color-base-content)]/60">
					<span
						className={`h-2 w-2 rounded-full ${status ? "bg-[var(--color-success)] animate-pulse" : "bg-[var(--color-base-300)]"}`}
						aria-hidden="true"
					/>
					{status ? t("home.status.live") : t("common.loading")}
				</span>
			</div>
			<div className="grid gap-5 md:grid-cols-3">
				<div className="space-y-2">
					<p className="flex items-center gap-2 text-xs font-semibold uppercase tracking-wide text-[var(--color-base-content)]/50">
						<Gauge className="w-3.5 h-3.5" aria-hidden="true" />
						{t("home.status.rate")}
					</p>
					<Figure label={t("home.status.requestsPerMinute")} value={status?.requests_per_minute} />
				</div>
				<div className="space-y-2">
					<p className="flex items-center gap-2 text-xs font-semibold uppercase tracking-wide text-[var(--color-base-content)]/50">
						<Activity className="w-3.5 h-3.5" aria-hidden="true" />
						{t("home.status.openThreads")}
					</p>
					<Capacity
						label={t("home.status.registered")}
						used={status?.open_threads.users}
						max={status?.open_threads.users_max}
					/>
					<Capacity
						label={t("home.status.guests")}
						used={status?.open_threads.guests}
						max={status?.open_threads.guests_max}
					/>
				</div>
				<div className="space-y-2">
					<p className="flex items-center gap-2 text-xs font-semibold uppercase tracking-wide text-[var(--color-base-content)]/50">
						<Users className="w-3.5 h-3.5" aria-hidden="true" />
						{t("home.status.scrapers")}
					</p>
					<Figure label={t("home.status.registered")} value={status?.scrapers.users} />
					<Figure label={t("home.status.guests")} value={status?.scrapers.guests} />
				</div>
			</div>
			<p className="text-xs text-[var(--color-base-content)]/50">{t("home.status.note")}</p>
		</section>
	);
}
