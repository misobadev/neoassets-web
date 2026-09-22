import { type ReactNode } from "react";
import { Link } from "react-router-dom";
import { Terminal } from "lucide-react";
import { useTranslation } from "react-i18next";
import CopyButton from "../components/CopyButton";
import { usePageTitle } from "../lib/seo";

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
				<span className="text-[10px] font-semibold uppercase tracking-wider text-slate-400">{lang}</span>
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

export default function ApiDocsPage() {
	const { t } = useTranslation();
	usePageTitle("NeoAssets - API Docs");

	const gameParams: Param[] = [
		{ name: "system_id", type: "string", required: false, description: t("apiDocs.pSystemId") },
		{ name: "family", type: "string", required: false, description: t("apiDocs.pFamily") },
		{ name: "group", type: "string", required: false, description: t("apiDocs.pGroup") },
		{ name: "crc | md5 | sha1 | sha256", type: "string", required: false, description: t("apiDocs.pHashes") },
		{ name: "name", type: "string", required: false, description: t("apiDocs.pName") },
		{ name: "type", type: "base | hack | homebrew", required: false, description: t("apiDocs.pType") },
		{ name: "media", type: "string", required: false, description: t("apiDocs.pMedia") },
		{ name: "roms", type: "boolean", required: false, description: t("apiDocs.pRoms") },
		{ name: "softname", type: "string", required: false, description: t("apiDocs.pSoftname") },
		{ name: "X-Debug-Password", type: "header", required: false, description: t("apiDocs.pDebug") },
		{ name: "forcerequestok", type: "integer", required: false, description: t("apiDocs.pForceUsed") },
		{ name: "forcethreads", type: "integer", required: false, description: t("apiDocs.pForceThreads") },
		{ name: "forceratelimit", type: "string", required: false, description: t("apiDocs.pForceRate") },
	];

	return (
		<div className="space-y-6">
			<div>
				<h1 className="text-2xl md:text-3xl font-bold tracking-tight flex items-center gap-2">
					<Terminal className="w-6 h-6 text-[var(--color-primary)]" /> {t("apiDocs.title")}
				</h1>
				<p className="text-sm text-[var(--color-base-content)]/60">{t("apiDocs.subtitle")}</p>
			</div>

			<section className="card p-6 space-y-3">
				<h2 className="font-semibold">{t("apiDocs.authTitle")}</h2>
				<p className="text-sm text-[var(--color-base-content)]/70">{t("apiDocs.authIntro")}</p>
				<div className="overflow-x-auto">
					<table className="w-full text-sm">
						<thead>
							<tr className="text-left text-xs uppercase tracking-wide text-[var(--color-base-content)]/50">
								<th className="py-2 pr-4">{t("apiDocs.header")}</th>
								<th className="py-2 pr-4">{t("apiDocs.value")}</th>
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
				<Code lang="bash">{`curl "${BASE_URL}/api/v1/scrape/games?system_id=snes&name=chrono%20trigger" \\
  -H "X-Client-Id: <client_id>" \\
  -H "X-Client-Secret: <client_secret>" \\
  -H "Authorization: Bearer <personal_api_key>"`}</Code>
				<p className="text-xs text-[var(--color-base-content)]/60">
					<Link to="/app/developer" className="link link-primary">
						{t("nav.developer")}
					</Link>{" "}
					— {t("apiDocs.credentialsHint")}
				</p>
			</section>

			<section className="card p-6 space-y-3">
				<h2 className="font-semibold">{t("apiDocs.quotaTitle")}</h2>
				<p className="text-sm text-[var(--color-base-content)]/70">{t("apiDocs.quotaBody")}</p>
				<Code lang="text">{`X-Quota-Limit: 4000
X-Quota-Remaining: 3877
X-Quota-Reset: 2026-09-12T00:00:00Z`}</Code>
			</section>

			<section className="card p-6 space-y-4">
				<h2 className="font-semibold">{t("apiDocs.conceptsTitle")}</h2>
				<p className="text-sm text-[var(--color-base-content)]/70">{t("apiDocs.conceptsIntro")}</p>

				<div className="grid gap-3 sm:grid-cols-3">
					<div className="rounded-lg border border-[var(--color-base-300)] p-3">
						<p className="text-xs font-semibold uppercase tracking-wide text-[var(--color-primary)]">{t("apiDocs.conceptsFamilyTitle")}</p>
						<p className="mt-1 text-xs text-[var(--color-base-content)]/70">{t("apiDocs.conceptsFamilyDesc")}</p>
					</div>
					<div className="rounded-lg border border-[var(--color-base-300)] p-3">
						<p className="text-xs font-semibold uppercase tracking-wide text-[var(--color-primary)]">{t("apiDocs.conceptsGroupTitle")}</p>
						<p className="mt-1 text-xs text-[var(--color-base-content)]/70">{t("apiDocs.conceptsGroupDesc")}</p>
					</div>
					<div className="rounded-lg border border-[var(--color-base-300)] p-3">
						<p className="text-xs font-semibold uppercase tracking-wide text-[var(--color-primary)]">{t("apiDocs.conceptsSystemTitle")}</p>
						<p className="mt-1 text-xs text-[var(--color-base-content)]/70">{t("apiDocs.conceptsSystemDesc")}</p>
					</div>
				</div>

				<Code lang="text">{`family: arcade
  |-- group: mame-fbneo   -> cps1, cps2, cps3, neogeo
  |-- group: flycast      -> aw, naomi, naomi2, naomigd
  |-- group: supermodel   -> model3
  |-- group: dolphin      -> triforce
  '-- virtual system: arc -> every board above (no duplicates)`}</Code>

				<div className="rounded-lg border border-[var(--color-primary)]/30 bg-[var(--color-primary)]/5 p-3">
					<p className="text-xs font-semibold uppercase tracking-wide text-[var(--color-primary)]">{t("apiDocs.conceptsVirtualTitle")}</p>
					<p className="mt-1 text-xs text-[var(--color-base-content)]/70">{t("apiDocs.conceptsVirtualDesc")}</p>
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
curl "${BASE_URL}/api/v1/scrape/games?system_id=arc&name=sfa3.zip"

# 3) whole arcade family
curl "${BASE_URL}/api/v1/scrape/games?family=arcade&name=sfa3.zip"

# 4) only the MAME/FBNeo boards
curl "${BASE_URL}/api/v1/scrape/games?group=mame-fbneo&name=sfa3.zip"`}</Code>
				<p className="text-xs text-[var(--color-base-content)]/60">{t("apiDocs.conceptsExampleNote")}</p>
			</section>

			<section className="card p-6 space-y-4">
				<h2 className="font-semibold">{t("apiDocs.endpointsTitle")}</h2>

				<div className="space-y-2">
					<p className="font-mono text-sm">
						<span className="badge badge-success badge-sm mr-2">GET</span>/api/v1/scrape/systems
					</p>
					<p className="text-sm text-[var(--color-base-content)]/70">{t("apiDocs.systemsDesc")}</p>
					<Code>{`{
  "systems": [
    { "id": "snes", "name": "Super Nintendo", "short_name": "SNES",
      "external_id": "snes", "family": "console", "group": "",
      "total_games": 1933, "base": 1700, "hack": 200, "homebrew": 33,
      "metadata_pct": 42.5 },
    { "id": "cps1", "name": "CP System I", "short_name": "CPSI",
      "external_id": "cps1", "family": "arcade", "group": "mame-fbneo",
      "total_games": 34, "base": 34, "hack": 0, "homebrew": 0,
      "metadata_pct": 96.9 }
  ]
}`}</Code>
				</div>

				<div className="space-y-2 pt-2 border-t border-[var(--color-base-300)]">
					<p className="font-mono text-sm">
						<span className="badge badge-success badge-sm mr-2">GET</span>/api/v1/scrape/families
					</p>
					<p className="text-sm text-[var(--color-base-content)]/70">{t("apiDocs.familiesDesc")}</p>
					<Code>{`{
  "families": [
    { "family": "arcade", "systems": 13, "total_games": 469 },
    { "family": "console", "systems": 53, "total_games": 12000 }
  ]
}`}</Code>
				</div>

				<div className="space-y-2 pt-2 border-t border-[var(--color-base-300)]">
					<p className="font-mono text-sm">
						<span className="badge badge-success badge-sm mr-2">GET</span>/api/v1/scrape/groups
					</p>
					<p className="text-sm text-[var(--color-base-content)]/70">{t("apiDocs.groupsDesc")}</p>
					<Code>{`{
  "groups": [
    { "group": "mame-fbneo", "family": "arcade", "systems": 7, "total_games": 469 },
    { "group": "flycast", "family": "arcade", "systems": 4, "total_games": 220 }
  ]
}`}</Code>
				</div>

				<div className="space-y-2 pt-2 border-t border-[var(--color-base-300)]">
					<p className="font-mono text-sm">
						<span className="badge badge-success badge-sm mr-2">GET</span>/api/v1/scrape/games
					</p>
					<p className="text-sm text-[var(--color-base-content)]/70">{t("apiDocs.gamesDesc")}</p>
					<h3 className="text-sm font-semibold pt-1">{t("apiDocs.paramsTitle")}</h3>
					<ParamTable params={gameParams} />
					<Code>{`{
  "system_id": "snes",
  "matched_by": "hash",
  "game": {
    "id": "8f1b...", "system_id": "snes", "system_name": "Super Nintendo",
      "name": "Chrono Trigger", "region": "us",
      "description_en": "English description",
    "description_es": "Descripcion en espanol",
    "description_de": "",
    "release_year": 1995, "release_month": 8, "publisher": "Square",
    "developer": "Square", "genre": "RPG", "rating": 9, "type": "base",
    "scrapes": 42,
    "rom_count": 7, "rom_name": "Chrono Trigger (USA).sfc",
    "media": [ { "kind": "cover", "url": "https://cdn.neoassets.dev/...", "mime": "image/webp", "size": 12345 } ]
  }
}`}</Code>
				</div>

				<div className="space-y-2 pt-2 border-t border-[var(--color-base-300)]">
					<p className="font-mono text-sm">
						<span className="badge badge-success badge-sm mr-2">GET</span>/api/v1/scrape/popular
					</p>
					<p className="text-sm text-[var(--color-base-content)]/70">{t("apiDocs.popularDesc")}</p>
					<Code>{`{
  "games": [
    { "id": "8f1b...", "system_id": "snes", "name": "Chrono Trigger",
      "scrapes": 1240, "last_scraped_at": "2026-09-11T20:15:00Z" }
  ]
}`}</Code>
				</div>

				<div className="space-y-2 pt-2 border-t border-[var(--color-base-300)]">
					<p className="font-mono text-sm">
						<span className="badge badge-success badge-sm mr-2">GET</span>/api/v1/packs
						<span className="badge badge-ghost badge-sm ml-2">{t("apiDocs.publicBadge")}</span>
					</p>
					<p className="text-sm text-[var(--color-base-content)]/70">{t("apiDocs.packsDesc")}</p>
					<Code>{`{
  "themes": [
    {
      "folder": "neostation",
      "name": "NeoStation",
      "author": "NeoStation Team",
      "description": "First and Official System Art Pack for NeoStation Frontend.",
      "version": "1.0",
      "preview": "packs/neostation/backgrounds/gog.webp",
      "backgrounds": [
        "packs/neostation/backgrounds/gog.webp",
        "packs/neostation/backgrounds/bbcmicro.webp",
        "packs/neostation/backgrounds/amazon.webp",
        "packs/neostation/backgrounds/zxspectrum.webp"
      ],
      "downloads": 16,
      "systems_covered": 96
    }
  ],
  "total": 11
}`}</Code>
					<p className="text-xs text-[var(--color-base-content)]/60">{t("apiDocs.packsUrlHint")}</p>
				</div>

				<div className="space-y-2 pt-2 border-t border-[var(--color-base-300)]">
					<p className="font-mono text-sm">
						<span className="badge badge-success badge-sm mr-2">GET</span>/api/v1/packs/{"{folder}"}
						<span className="badge badge-ghost badge-sm ml-2">{t("apiDocs.publicBadge")}</span>
					</p>
					<p className="text-sm text-[var(--color-base-content)]/70">{t("apiDocs.packsDetailDesc")}</p>
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
						<span className="badge badge-success badge-sm mr-2">GET</span>/api/v1/packs/{"{folder}"}/download
						<span className="badge badge-ghost badge-sm ml-2">{t("apiDocs.publicBadge")}</span>
					</p>
					<p className="text-sm text-[var(--color-base-content)]/70">{t("apiDocs.packDownloadDesc")}</p>
					<Code>{`{
  "folder": "neostation",
  "name": "NeoStation",
  "downloads": 17,
  "systems_covered": 96,
  "files": [
    { "kind": "background", "system_id": "2600",
      "url": "https://cdn.neoassets.dev/packs/neostation/backgrounds/2600.webp",
      "size": 82176, "mime": "image/webp" }
  ]
}`}</Code>
					<p className="text-xs text-[var(--color-base-content)]/60">{t("apiDocs.packRateHint")}</p>
				</div>

				<div className="space-y-2 pt-2 border-t border-[var(--color-base-300)]">
					<p className="font-mono text-sm">
						<span className="badge badge-success badge-sm mr-2">GET</span>/api/v1/scrape/account
					</p>
					<p className="text-sm text-[var(--color-base-content)]/70">{t("apiDocs.accountDesc")}</p>
					<Code>{`{
  "subject": "user",
  "client": { "id": "nsapp_...", "name": "My Scraper" },
  "user": { "username": "miguel", "threads": 4 },
  "quota": { "daily_limit": 1000, "used": 123, "remaining": 877,
             "resets_at": "2026-09-12T00:00:00Z" }
}`}</Code>
				</div>
			</section>

			<section className="card p-6 space-y-3">
				<h2 className="font-semibold">{t("apiDocs.errorsTitle")}</h2>
				<div className="overflow-x-auto">
					<table className="w-full text-sm">
						<thead>
							<tr className="text-left text-xs uppercase tracking-wide text-[var(--color-base-content)]/50">
								<th className="py-2 pr-4">{t("apiDocs.statusHeader")}</th>
								<th className="py-2">{t("apiDocs.meaning")}</th>
							</tr>
						</thead>
						<tbody className="divide-y divide-[var(--color-base-300)]">
							<tr>
								<td className="py-2 pr-4 font-mono text-xs">400</td>
								<td className="py-2 text-xs">{t("apiDocs.err400")}</td>
							</tr>
							<tr>
								<td className="py-2 pr-4 font-mono text-xs">401</td>
								<td className="py-2 text-xs">{t("apiDocs.err401")}</td>
							</tr>
							<tr>
								<td className="py-2 pr-4 font-mono text-xs">403</td>
								<td className="py-2 text-xs">{t("apiDocs.err403")}</td>
							</tr>
							<tr>
								<td className="py-2 pr-4 font-mono text-xs">429</td>
								<td className="py-2 text-xs">{t("apiDocs.err429")}</td>
							</tr>
						</tbody>
					</table>
				</div>
				<Code>{`{ "error": "daily scrape quota exceeded" }`}</Code>
			</section>
		</div>
	);
}
