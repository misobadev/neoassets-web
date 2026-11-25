import { type ReactNode, useEffect, useState } from "react";
import SectionTitle from "../components/ui/SectionTitle";
import PageTitle from "../components/ui/PageTitle";
import { Link } from "react-router-dom";
import { Terminal, KeyRound, Gauge, BookOpen, Braces, TriangleAlert, Rocket, ListChecks, Activity } from "lucide-react";
import { useTranslation } from "react-i18next";
import CopyButton from "../components/CopyButton";
import { usePageMeta } from "../lib/seo";
import { fetchConfig, type PublicConfig } from "../lib/api";
import { EXAMPLE_GAMES, exampleTime } from "../lib/scrapeEstimate";

const BASE_URL = "https://api.neoassets.dev";

// prettyJson re-indents a JSON string; returns it unchanged when invalid.
function prettyJson(code: string): string {
	try {
		return JSON.stringify(JSON.parse(code), null, 2);
	} catch {
		return code;
	}
}

// highlightJson tokenizes a JSON string into colored spans (keys, strings,
// numbers, booleans/null) so the examples read like a real editor.
function highlightJson(code: string): ReactNode[] {
	const nodes: ReactNode[] = [];
	const re = /("(?:\\.|[^"\\])*")(\s*:)?|\b(true|false|null)\b|(-?\d+(?:\.\d+)?(?:[eE][+-]?\d+)?)/g;
	let last = 0;
	let key = 0;
	let m: RegExpExecArray | null;
	while ((m = re.exec(code)) !== null) {
		if (m.index > last) nodes.push(code.slice(last, m.index));
		if (m[1] !== undefined) {
			if (m[2] !== undefined) {
				nodes.push(
					<span key={key++} className="text-sky-300">
						{m[1]}
					</span>,
				);
				nodes.push(m[2]);
			} else {
				nodes.push(
					<span key={key++} className="text-emerald-300">
						{m[1]}
					</span>,
				);
			}
		} else if (m[3] !== undefined) {
			nodes.push(
				<span key={key++} className="text-violet-300">
					{m[3]}
				</span>,
			);
		} else if (m[4] !== undefined) {
			nodes.push(
				<span key={key++} className="text-amber-300">
					{m[4]}
				</span>,
			);
		}
		last = re.lastIndex;
	}
	if (last < code.length) nodes.push(code.slice(last));
	return nodes;
}

function Code({ children, lang = "json" }: { children: string; lang?: "json" | "bash" | "text" }) {
	const body = lang === "json" ? prettyJson(children) : children;
	return (
		<div className="overflow-hidden rounded-lg border border-[var(--color-base-300)] bg-[#0d1117]">
			<div className="flex items-center justify-between border-b border-white/10 px-3 py-1">
				<span className="text-xs font-semiboldr text-slate-400">{lang}</span>
				<CopyButton value={body} className="text-slate-300 hover:text-white" />
			</div>
			<pre className="overflow-x-auto p-3 text-xs leading-relaxed text-slate-100">
				<code className="font-mono">{lang === "json" ? highlightJson(body) : body}</code>
			</pre>
		</div>
	);
}

interface Param {
	name: string;
	type: string;
	required: boolean;
	description: string;
}

function ParamTable({ params }: { params: Param[] }) {
	const { t } = useTranslation();
	return (
		<div className="overflow-x-auto">
			<table className="w-full text-sm">
				<thead>
					<tr className="text-left text-xs uppercase tracking-wide text-[var(--color-base-content)]/50">
						<th className="py-2 pr-4">{t("apiDocs.param")}</th>
						<th className="py-2 pr-4">{t("apiDocs.type")}</th>
						<th className="py-2 pr-4">{t("apiDocs.required")}</th>
						<th className="py-2">{t("apiDocs.descriptionCol")}</th>
					</tr>
				</thead>
				<tbody className="divide-y divide-[var(--color-base-300)]">
					{params.map((p) => (
						<tr key={p.name}>
							<td className="py-2 pr-4 font-mono text-xs whitespace-nowrap">{p.name}</td>
							<td className="py-2 pr-4 text-xs text-[var(--color-base-content)]/60">{p.type}</td>
							<td className="py-2 pr-4 text-xs">{p.required ? t("apiDocs.yes") : t("apiDocs.no")}</td>
							<td className="py-2 text-xs text-[var(--color-base-content)]/70">{p.description}</td>
						</tr>
					))}
				</tbody>
			</table>
		</div>
	);
}

// The backend defaults, shown until /api/v1/config answers (or if it fails),
// so the limits table is never empty. The live config replaces them.
const DEFAULT_RPM_PER_THREAD = 100;
const DEFAULT_RANKS: PublicConfig["ranks"] = [
	["novice", 1, 2],
	["amateur", 11, 4],
	["explorer", 21, 6],
	["collector", 31, 8],
	["curator", 41, 10],
	["conservator", 51, 12],
	["archivist", 61, 14],
	["scholar", 71, 16],
	["master", 81, 18],
	["legend", 91, 20],
].map(([rank, min, threads]) => ({
	rank: rank as string,
	min_level: min as number,
	max_level: (min as number) + 9,
	threads: threads as number,
}));

function Th({ children }: { children: ReactNode }) {
	return <th className="py-2 pr-4">{children}</th>;
}

export default function ApiDocsPage() {
	const { t } = useTranslation();
	usePageMeta({
		title: "Scraping API Docs - NeoAssets",
		description:
			"NeoAssets scraping API for emulation frontends: look up games by ROM hash or name and get metadata, covers, screenshots, logos and videos.",
	});
	const [cfg, setCfg] = useState<PublicConfig | null>(null);
	useEffect(() => {
		fetchConfig()
			.then(setCfg)
			.catch(() => {});
	}, []);

	const perThread = cfg?.daily_games_per_thread ?? 1000;
	const rpmPerThread = cfg?.rpm_per_thread ?? DEFAULT_RPM_PER_THREAD;
	const guestThreads = cfg?.guest_threads ?? 1;
	const ranks = cfg?.ranks.length ? cfg.ranks : DEFAULT_RANKS;
	const maxThreads = ranks[ranks.length - 1].threads;
	const supporter = cfg?.donor_tiers.find((d) => d.status === "supporter")?.bonus_threads ?? 2;
	const monthly = cfg?.donor_tiers.find((d) => d.status === "monthly_supporter")?.bonus_threads ?? 4;

	// Typical accounts rather than every rank (the rewards guide lists them
	// all): a guest, the first rank, the first rank as a monthly supporter, and
	// the top rank. Threads come from the live config.
	const first = ranks[0];
	const top = ranks[ranks.length - 1];
	const rankLabel = (rank: string) => t("guide.ranks." + rank, { defaultValue: rank });
	const limitRows: { key: string; label: string; threads: number }[] = [
		{ key: "guest", label: t("guide.tiers.guest.name"), threads: guestThreads },
		{ key: first.rank, label: rankLabel(first.rank), threads: first.threads },
		{
			key: first.rank + "-monthly",
			label: `${rankLabel(first.rank)} + ${t("donor.monthly_supporter")}`,
			threads: Math.min(first.threads + monthly, maxThreads),
		},
		{ key: top.rank, label: rankLabel(top.rank), threads: top.threads },
	];

	const gameParams: Param[] = [
		{ name: "system_id", type: "string", required: false, description: t("apiDocs.pSystemId") },
		{ name: "family", type: "string", required: false, description: t("apiDocs.pFamily") },
		{ name: "group", type: "string", required: false, description: t("apiDocs.pGroup") },
		{ name: "crc | md5 | sha1 | sha256", type: "string", required: false, description: t("apiDocs.pHashes") },
		{ name: "name", type: "string", required: false, description: t("apiDocs.pName") },
		{ name: "type", type: "string", required: false, description: t("apiDocs.pType") },
		{ name: "media", type: "string", required: false, description: t("apiDocs.pMedia") },
		{ name: "roms", type: "boolean", required: false, description: t("apiDocs.pRoms") },
		{ name: "softname", type: "string", required: false, description: t("apiDocs.pSoftname") },
		{ name: "X-Debug-Password", type: "header", required: false, description: t("apiDocs.pDebug") },
		{ name: "forcerequestok", type: "integer", required: false, description: t("apiDocs.pForceUsed") },
		{ name: "forcethreads", type: "integer", required: false, description: t("apiDocs.pForceThreads") },
		{ name: "forceratelimit", type: "1", required: false, description: t("apiDocs.pForceRate") },
	];

	const responseHeaders: { name: string; desc: string }[] = [
		{ name: "X-Quota-Limit", desc: t("apiDocs.hQuotaLimit") },
		{ name: "X-Quota-Remaining", desc: t("apiDocs.hQuotaRemaining") },
		{ name: "X-Quota-Reset", desc: t("apiDocs.hQuotaReset") },
		{ name: "X-RateLimit-Limit", desc: t("apiDocs.hRateLimit") },
		{ name: "X-RateLimit-Remaining", desc: t("apiDocs.hRateRemaining") },
		{ name: "X-Concurrency-Limit", desc: t("apiDocs.hConcurrency") },
		{ name: "Retry-After", desc: t("apiDocs.hRetryAfter") },
	];

	const errors: { status: string; desc: string }[] = [
		{ status: "400", desc: t("apiDocs.err400") },
		{ status: "401", desc: t("apiDocs.err401") },
		{ status: "403", desc: t("apiDocs.err403") },
		{ status: "429", desc: t("apiDocs.err429") },
		{ status: "500", desc: t("apiDocs.err500") },
		{ status: "503", desc: t("apiDocs.err503") },
	];

	const muted = "text-sm text-[var(--color-base-content)]/70";
	const small = "text-xs text-[var(--color-base-content)]/60";
	const theadRow = "text-left text-xs uppercase tracking-wide text-[var(--color-base-content)]/50";

	return (
		<div className="space-y-6">
			<div>
				<PageTitle icon={Terminal} tone="tone-primary">
					{t("apiDocs.title")}
				</PageTitle>
				<p className="text-sm text-[var(--color-base-content)]/60">{t("apiDocs.subtitle")}</p>
			</div>

			<section className="card p-6 space-y-3 tone-primary">
				<SectionTitle icon={Rocket} className="">
					{t("apiDocs.quickTitle")}
				</SectionTitle>
				<ol className="list-decimal space-y-2 pl-5 text-sm text-[var(--color-base-content)]/70">
					<li>
						{t("apiDocs.quickStep1")}{" "}
						<Link to="/app/developer" className="link link-primary">
							{t("nav.developer")}
						</Link>
					</li>
					<li>
						{t("apiDocs.quickStep2")}{" "}
						<Link to="/app/profile" className="link link-primary">
							{t("nav.profile")}
						</Link>
					</li>
					<li>{t("apiDocs.quickStep3")}</li>
				</ol>
				<Code lang="bash">{`curl "${BASE_URL}/api/v1/scrape/games?system_id=snes&crc=2d206bf7&name=Chrono%20Trigger%20(USA).sfc" \\
  -H "X-Client-Id: <client_id>" \\
  -H "X-Client-Secret: <client_secret>" \\
  -H "Authorization: Bearer <personal_api_key>"`}</Code>
			</section>

			<section className="card p-6 space-y-3 tone-primary">
				<SectionTitle icon={KeyRound} className="">
					{t("apiDocs.authTitle")}
				</SectionTitle>
				<p className={muted}>{t("apiDocs.authIntro")}</p>
				<div className="overflow-x-auto">
					<table className="w-full text-sm">
						<thead>
							<tr className={theadRow}>
								<Th>{t("apiDocs.header")}</Th>
								<Th>{t("apiDocs.value")}</Th>
								<th className="py-2">{t("apiDocs.required")}</th>
							</tr>
						</thead>
						<tbody className="divide-y divide-[var(--color-base-300)]">
							<tr>
								<td className="py-2 pr-4 font-mono text-xs">X-Client-Id</td>
								<td className="py-2 pr-4 text-xs">{t("apiDocs.authClientIdDesc")}</td>
								<td className="py-2 text-xs">{t("apiDocs.yes")}</td>
							</tr>
							<tr>
								<td className="py-2 pr-4 font-mono text-xs">X-Client-Secret</td>
								<td className="py-2 pr-4 text-xs">{t("apiDocs.authClientSecretDesc")}</td>
								<td className="py-2 text-xs">{t("apiDocs.yes")}</td>
							</tr>
							<tr>
								<td className="py-2 pr-4 font-mono text-xs">Authorization</td>
								<td className="py-2 pr-4 text-xs">{t("apiDocs.authUserKeyDesc")}</td>
								<td className="py-2 text-xs">{t("apiDocs.no")}</td>
							</tr>
						</tbody>
					</table>
				</div>
				<div className="rounded-lg border border-[var(--color-primary)]/30 bg-[var(--color-primary)]/5 p-3 space-y-1">
					<p className="text-xs font-semibold uppercase tracking-wide text-[var(--color-primary)]">
						{t("apiDocs.guestTitle")}
					</p>
					<p className="text-xs text-[var(--color-base-content)]/70">
						{t("apiDocs.guestDesc", { threads: guestThreads })}
					</p>
				</div>
				<p className={small}>
					<Link to="/app/developer" className="link link-primary">
						{t("nav.developer")}
					</Link>
					: {t("apiDocs.credentialsHint")}{" "}
					<Link to="/app/profile" className="link link-primary">
						{t("nav.profile")}
					</Link>
					: {t("apiDocs.keysHint")}
				</p>
			</section>

			<section className="card p-6 space-y-4 tone-reward">
				<SectionTitle icon={Gauge} className="">
					{t("apiDocs.quotaTitle")}
				</SectionTitle>
				<p className={muted}>{t("apiDocs.limitsIntro")}</p>
				<div className="grid gap-3 sm:grid-cols-2">
					{[
						["limitThreadsTitle", t("apiDocs.limitThreadsDesc")],
						["limitRateTitle", t("apiDocs.limitRateDesc", { rpm: rpmPerThread })],
						["limitDailyTitle", t("apiDocs.limitDailyDesc", { per: perThread.toLocaleString() })],
						["limitGlobalTitle", t("apiDocs.limitGlobalDesc")],
					].map(([title, desc]) => (
						<div key={title} className="rounded-lg border border-[var(--color-base-300)] p-3">
							<p className="text-xs font-semibold uppercase tracking-wide text-[var(--color-primary)]">
								{t("apiDocs." + title)}
							</p>
							<p className="mt-1 text-xs text-[var(--color-base-content)]/70">{desc}</p>
						</div>
					))}
				</div>
				<div className="overflow-x-auto">
					<table className="w-full text-sm">
						<thead>
							<tr className={theadRow}>
								<Th>{t("apiDocs.colAccount")}</Th>
								<Th>{t("apiDocs.colThreads")}</Th>
								<Th>{t("apiDocs.colRate")}</Th>
								<Th>{t("apiDocs.colDaily")}</Th>
								<th className="py-2">{t("apiDocs.colGames", { n: EXAMPLE_GAMES.toLocaleString() })}</th>
							</tr>
						</thead>
						<tbody className="divide-y divide-[var(--color-base-300)]">
							{limitRows.map((r) => (
								<tr key={r.key}>
									<td className="py-2 pr-4">{r.label}</td>
									<td className="py-2 pr-4 tabular-nums">{r.threads}</td>
									<td className="py-2 pr-4 tabular-nums">
										{(r.threads * rpmPerThread).toLocaleString()}
									</td>
									<td className="py-2 pr-4 tabular-nums">
										{(r.threads * perThread).toLocaleString()}
									</td>
									<td className="py-2 tabular-nums">
										{exampleTime(r.threads, rpmPerThread, perThread) ??
											t("guide.progression.overQuota", {
												daily: (r.threads * perThread).toLocaleString(),
											})}
									</td>
								</tr>
							))}
						</tbody>
					</table>
				</div>
				<p className={small}>{t("apiDocs.limitsDonorNote", { supporter, monthly, max: maxThreads })}</p>
				<p className={small}>{t("apiDocs.limitsTimeNote", { n: EXAMPLE_GAMES.toLocaleString() })}</p>
				<p className={small}>
					<Link to="/app/guide" className="link link-primary">
						{t("nav.rewardsGuide")}
					</Link>
					: {t("apiDocs.limitsGuideHint")}
				</p>
			</section>

			<section className="card p-6 space-y-3 tone-meta">
				<SectionTitle icon={Activity} className="">
					{t("apiDocs.headersTitle")}
				</SectionTitle>
				<p className={muted}>{t("apiDocs.headersIntro")}</p>
				<div className="overflow-x-auto">
					<table className="w-full text-sm">
						<thead>
							<tr className={theadRow}>
								<Th>{t("apiDocs.header")}</Th>
								<th className="py-2">{t("apiDocs.meaning")}</th>
							</tr>
						</thead>
						<tbody className="divide-y divide-[var(--color-base-300)]">
							{responseHeaders.map((h) => (
								<tr key={h.name}>
									<td className="py-2 pr-4 font-mono text-xs whitespace-nowrap">{h.name}</td>
									<td className="py-2 text-xs text-[var(--color-base-content)]/70">{h.desc}</td>
								</tr>
							))}
						</tbody>
					</table>
				</div>
				<Code lang="text">{`X-Quota-Limit: 4000
X-Quota-Remaining: 3877
X-Quota-Reset: 2026-11-25T00:00:00Z
X-RateLimit-Limit: 400
X-RateLimit-Remaining: 31
X-Concurrency-Limit: 4`}</Code>
			</section>

			<section className="card p-6 space-y-3 tone-community">
				<SectionTitle icon={ListChecks} className="">
					{t("apiDocs.practicesTitle")}
				</SectionTitle>
				<ul className="list-disc space-y-1.5 pl-5 text-sm text-[var(--color-base-content)]/70">
					{[1, 2, 3, 4, 5, 6, 7].map((n) => (
						<li key={n}>{t("apiDocs.practice" + n)}</li>
					))}
				</ul>
				<Code lang="text">{`for each ROM (with N workers, N = X-Concurrency-Limit):
  GET /api/v1/scrape/games?system_id=...&crc=...&name=<file name>
  200 -> use "game" (null = not in the catalog)
  429 / 503 -> sleep Retry-After seconds, then retry the same ROM
  429 "daily scrape quota exceeded" -> stop until X-Quota-Reset`}</Code>
			</section>

			<section className="card p-6 space-y-4 tone-meta">
				<SectionTitle icon={BookOpen} className="">
					{t("apiDocs.conceptsTitle")}
				</SectionTitle>
				<p className={muted}>{t("apiDocs.conceptsIntro")}</p>

				<div className="grid gap-3 sm:grid-cols-3">
					{(["Family", "Group", "System"] as const).map((k) => (
						<div key={k} className="rounded-lg border border-[var(--color-base-300)] p-3">
							<p className="text-xs font-semibold uppercase tracking-wide text-[var(--color-primary)]">
								{t("apiDocs.concepts" + k + "Title")}
							</p>
							<p className="mt-1 text-xs text-[var(--color-base-content)]/70">
								{t("apiDocs.concepts" + k + "Desc")}
							</p>
						</div>
					))}
				</div>

				<Code lang="text">{`family: arcade
  |-- group: mame-fbneo     -> arcadeclassics, cps1, cps2, cps3, neogeo
  |-- group: flycast        -> aw, naomi, naomi2, naomigd
  |-- group: supermodel     -> model3
  |-- group: dolphin        -> triforce
  '-- virtual system: arcade -> every board above (no duplicates)`}</Code>

				<div className="rounded-lg border border-[var(--color-primary)]/30 bg-[var(--color-primary)]/5 p-3">
					<p className="text-xs font-semibold uppercase tracking-wide text-[var(--color-primary)]">
						{t("apiDocs.conceptsVirtualTitle")}
					</p>
					<p className="mt-1 text-xs text-[var(--color-base-content)]/70">
						{t("apiDocs.conceptsVirtualDesc")}
					</p>
				</div>

				<h3 className="text-sm font-semibold pt-1">{t("apiDocs.conceptsPickTitle")}</h3>
				<p className="text-xs text-[var(--color-base-content)]/70">{t("apiDocs.conceptsPickIntro")}</p>
				<ul className="list-disc space-y-1 pl-5 text-xs text-[var(--color-base-content)]/70">
					<li>{t("apiDocs.conceptsPickSystem")}</li>
					<li>{t("apiDocs.conceptsPickFamily")}</li>
					<li>{t("apiDocs.conceptsPickVirtual")}</li>
					<li>{t("apiDocs.conceptsPickGroup")}</li>
					<li>{t("apiDocs.conceptsPickName")}</li>
				</ul>

				<h3 className="text-sm font-semibold pt-1">{t("apiDocs.conceptsExampleTitle")}</h3>
				<Code lang="bash">{`# 1) exact board
curl "${BASE_URL}/api/v1/scrape/games?system_id=cps2&name=sfa3.zip"

# 2) virtual arcade system (whole arcade family)
curl "${BASE_URL}/api/v1/scrape/games?system_id=arcade&name=sfa3.zip"

# 3) whole arcade family
curl "${BASE_URL}/api/v1/scrape/games?family=arcade&name=sfa3.zip"

# 4) only the MAME/FBNeo boards
curl "${BASE_URL}/api/v1/scrape/games?group=mame-fbneo&name=sfa3.zip"`}</Code>
				<p className={small}>{t("apiDocs.conceptsExampleNote")}</p>
			</section>

			<section className="card p-6 space-y-4 tone-primary">
				<SectionTitle icon={Braces} className="">
					{t("apiDocs.endpointsTitle")}
				</SectionTitle>
				<p className={small}>{t("apiDocs.endpointsIntro")}</p>

				<div className="space-y-2">
					<p className="font-mono text-sm">
						<span className="badge badge-success badge-sm mr-2">GET</span>/api/v1/scrape/games
					</p>
					<p className={muted}>{t("apiDocs.gamesDesc")}</p>
					<h3 className="text-sm font-semibold pt-1">{t("apiDocs.paramsTitle")}</h3>
					<ParamTable params={gameParams} />
					<Code>{`{
  "system_id": "snes",
  "matched_by": "hash",
  "game": {
    "id": "a2e4dc77-ddf8-4a65-9956-9099a2e182eb",
    "system_id": "snes", "system_name": "Super Nintendo Entertainment System",
    "name": "Chrono Trigger", "region": "USA", "type": "base",
    "description_en": "The millennium. A portal is opened...",
    "description_es": "El milenio. Se abre un portal...",
    "release_year": 1995, "release_month": 3,
    "publisher": "Squaresoft", "developer": "Squaresoft",
    "genre": "Role-Playing (RPG)", "rating": 0, "scrapes": 42,
    "rom_count": 2, "rom_name": "Chrono Trigger (USA).sfc",
    "media": [
      { "kind": "cover", "url": "https://cdn.neoassets.dev/media/games/snes/bca76561-....webp", "mime": "image/webp", "size": 610990 },
      { "kind": "video", "url": "https://cdn.neoassets.dev/media/games/snes/b17d34f0-....mp4", "mime": "video/mp4", "size": 5614912 }
    ]
  }
}`}</Code>
					<p className={small}>{t("apiDocs.gamesNote")}</p>
				</div>

				<div className="space-y-2 pt-2 border-t border-[var(--color-base-300)]">
					<p className="font-mono text-sm">
						<span className="badge badge-success badge-sm mr-2">GET</span>/api/v1/scrape/account
					</p>
					<p className={muted}>{t("apiDocs.accountDesc")}</p>
					<Code>{`{
  "subject": "user",
  "client": { "id": "nsapp_...", "name": "My Scraper" },
  "user": { "username": "miguel", "threads": 4 },
  "threads": 4,
  "quota": { "daily_limit": 4000, "used": 123, "remaining": 3877,
             "resets_at": "2026-11-25T00:00:00Z" }
}`}</Code>
				</div>

				<div className="space-y-2 pt-2 border-t border-[var(--color-base-300)]">
					<p className="font-mono text-sm">
						<span className="badge badge-success badge-sm mr-2">GET</span>/api/v1/scrape/systems
					</p>
					<p className={muted}>{t("apiDocs.systemsDesc")}</p>
					<Code>{`{
  "systems": [
    { "id": "snes", "name": "Super Nintendo Entertainment System",
      "family": "console", "group": "", "virtual": false,
      "total_games": 1845, "base": 1836, "hack": 9, "homebrew": 0,
      "bootleg": 0, "aftermarket": 0,
      "metadata_pct": 88.4, "text_pct": 92.1, "media_pct": 84.7 },
    { "id": "arcade", "name": "Arcade", "family": "arcade", "group": "",
      "virtual": true, "total_games": 2825 }
  ]
}`}</Code>
				</div>

				<div className="space-y-2 pt-2 border-t border-[var(--color-base-300)]">
					<p className="font-mono text-sm">
						<span className="badge badge-success badge-sm mr-2">GET</span>/api/v1/scrape/families
					</p>
					<p className={muted}>{t("apiDocs.familiesDesc")}</p>
					<Code>{`{
  "families": [
    { "family": "arcade", "systems": 11, "total_games": 2825 },
    { "family": "console", "systems": 39, "total_games": 17136 }
  ]
}`}</Code>
				</div>

				<div className="space-y-2 pt-2 border-t border-[var(--color-base-300)]">
					<p className="font-mono text-sm">
						<span className="badge badge-success badge-sm mr-2">GET</span>/api/v1/scrape/groups
					</p>
					<p className={muted}>{t("apiDocs.groupsDesc")}</p>
					<Code>{`{
  "groups": [
    { "group": "mame-fbneo", "family": "arcade", "systems": 5, "total_games": 2582 },
    { "group": "flycast", "family": "arcade", "systems": 4, "total_games": 219 }
  ]
}`}</Code>
				</div>

				<div className="space-y-2 pt-2 border-t border-[var(--color-base-300)]">
					<p className="font-mono text-sm">
						<span className="badge badge-success badge-sm mr-2">GET</span>/api/v1/scrape/popular
					</p>
					<p className={muted}>{t("apiDocs.popularDesc")}</p>
					<Code>{`{
  "games": [
    { "id": "a2e4dc77-...", "system_id": "snes", "name": "Chrono Trigger",
      "scrapes": 1240, "last_scraped_at": "2026-11-24T20:15:00Z" }
  ]
}`}</Code>
				</div>

				<div className="space-y-2 pt-2 border-t border-[var(--color-base-300)]">
					<p className="font-mono text-sm">
						<span className="badge badge-success badge-sm mr-2">GET</span>/api/v1/packs
						<span className="badge badge-ghost badge-sm ml-2">{t("apiDocs.publicBadge")}</span>
					</p>
					<p className={muted}>{t("apiDocs.packsDesc")}</p>
					<Code>{`{
  "themes": [
    {
      "folder": "neostation",
      "name": "NeoStation",
      "author": "NeoStation Team",
      "description": "First and Official System Art Pack for NeoStation Frontend.",
      "donation_url": "",
      "ai": false,
      "version": "1.0",
      "backgrounds": [
        "packs/neostation/backgrounds/snes.webp",
        "packs/neostation/backgrounds/ps1.webp"
      ],
      "downloads": 16,
      "systems_covered": 96,
      "submitted_by": "Misoba",
      "contributors": ["Misoba"]
    }
  ],
  "total": 11
}`}</Code>
					<p className={small}>{t("apiDocs.packsUrlHint")}</p>
				</div>

				<div className="space-y-2 pt-2 border-t border-[var(--color-base-300)]">
					<p className="font-mono text-sm">
						<span className="badge badge-success badge-sm mr-2">GET</span>/api/v1/packs/{"{folder}"}
						<span className="badge badge-ghost badge-sm ml-2">{t("apiDocs.publicBadge")}</span>
					</p>
					<p className={muted}>{t("apiDocs.packsDetailDesc")}</p>
					<Code>{`{
  "folder": "neostation",
  "name": "NeoStation",
  "downloads": 16,
  "systems_covered": 96,
  "files": [
    { "kind": "background", "system_id": "2600", "file_name": "2600.webp",
      "object_key": "packs/neostation/backgrounds/2600.webp",
      "url": "https://cdn.neoassets.dev/packs/neostation/backgrounds/2600.webp",
      "size": 82176, "mime": "image/webp" }
  ]
}`}</Code>
				</div>

				<div className="space-y-2 pt-2 border-t border-[var(--color-base-300)]">
					<p className="font-mono text-sm">
						<span className="badge badge-success badge-sm mr-2">GET</span>/api/v1/packs/{"{folder}"}
						/download
						<span className="badge badge-ghost badge-sm ml-2">{t("apiDocs.publicBadge")}</span>
					</p>
					<p className={muted}>{t("apiDocs.packDownloadDesc")}</p>
					<p className={small}>{t("apiDocs.packRateHint")}</p>
				</div>
			</section>

			<section className="card p-6 space-y-3 tone-sap">
				<SectionTitle icon={TriangleAlert} className="">
					{t("apiDocs.errorsTitle")}
				</SectionTitle>
				<p className={muted}>{t("apiDocs.errorsIntro")}</p>
				<div className="overflow-x-auto">
					<table className="w-full text-sm">
						<thead>
							<tr className={theadRow}>
								<Th>{t("apiDocs.statusHeader")}</Th>
								<th className="py-2">{t("apiDocs.meaning")}</th>
							</tr>
						</thead>
						<tbody className="divide-y divide-[var(--color-base-300)]">
							{errors.map((e) => (
								<tr key={e.status}>
									<td className="py-2 pr-4 font-mono text-xs">{e.status}</td>
									<td className="py-2 text-xs">{e.desc}</td>
								</tr>
							))}
						</tbody>
					</table>
				</div>
				<Code lang="text">{`429  { "error": "rate limit exceeded: this account allows 400 requests per minute" }   Retry-After: 1
429  { "error": "too many concurrent requests: this account allows 4 at once" }       Retry-After: 1
429  { "error": "daily scrape quota exceeded" }
503  { "error": "server busy, retry shortly" }                                        Retry-After: 2`}</Code>
			</section>
		</div>
	);
}
