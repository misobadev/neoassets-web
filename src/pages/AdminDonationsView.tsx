import { useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { useTranslation } from "react-i18next";
import { ChevronLeft, Upload } from "lucide-react";
import { importDonations, type DonationImportItem } from "../lib/api";

// parseEmails reads a plain list of emails (one per line, or comma/space
// separated), lowercases and de-duplicates them.
function parseEmails(text: string): string[] {
	const seen = new Set<string>();
	for (const part of text.split(/[\s,;]+/)) {
		const email = part.trim().toLowerCase();
		if (email.includes("@")) seen.add(email);
	}
	return [...seen];
}

export default function AdminDonationsView() {
	const { t } = useTranslation();
	const [platform, setPlatform] = useState<"kofi" | "patreon">("kofi");
	const [kind, setKind] = useState<"subscription" | "one_time">("subscription");
	const [text, setText] = useState("");
	const [busy, setBusy] = useState(false);
	const [result, setResult] = useState<{ imported: number; linked: number; skipped: number } | null>(null);
	const [error, setError] = useState<string | null>(null);

	const emails = useMemo(() => parseEmails(text), [text]);

	async function runImport() {
		if (emails.length === 0) return;
		setBusy(true);
		setError(null);
		setResult(null);
		try {
			const now = new Date().toISOString();
			const donations: DonationImportItem[] = emails.map((email) => ({
				platform,
				email,
				kind,
				amount_cents: 0,
				currency: "USD",
				occurred_at: now,
				external_id: `import-${platform}-${email}`,
			}));
			setResult(await importDonations(donations));
		} catch (e) {
			setError((e as Error).message);
		} finally {
			setBusy(false);
		}
	}

	return (
		<div className="space-y-6">
			<div className="flex items-center gap-3">
				<Link to="/app/admin" className="btn btn-ghost !p-2" aria-label={t("common.back")}>
					<ChevronLeft className="w-5 h-5" />
				</Link>
				<div>
					<h1 className="text-2xl md:text-3xl font-bold tracking-tight">{t("adminDonations.title")}</h1>
					<p className="text-sm text-[var(--color-base-content)]/60 pt-1">{t("adminDonations.subtitle")}</p>
				</div>
			</div>

			<section className="card p-6 space-y-4">
				<p className="text-sm text-[var(--color-base-content)]/70">{t("adminDonations.hint")}</p>

				<div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
					<div>
						<label className="label-text" htmlFor="don-platform">{t("adminDonations.platform")}</label>
						<select id="don-platform" className="select w-full" value={platform} onChange={(e) => { setPlatform(e.target.value as "kofi" | "patreon"); setResult(null); }} disabled={busy}>
							<option value="kofi">Ko-fi</option>
							<option value="patreon">Patreon</option>
						</select>
					</div>
					<div>
						<label className="label-text" htmlFor="don-kind">{t("adminDonations.kind")}</label>
						<select id="don-kind" className="select w-full" value={kind} onChange={(e) => { setKind(e.target.value as "subscription" | "one_time"); setResult(null); }} disabled={busy}>
							<option value="subscription">{t("adminDonations.monthly")}</option>
							<option value="one_time">{t("adminDonations.oneTime")}</option>
						</select>
					</div>
				</div>

				<textarea
					className="input w-full min-h-48 font-mono text-xs"
					placeholder={t("adminDonations.placeholder")}
					value={text}
					onChange={(e) => { setText(e.target.value); setResult(null); }}
					disabled={busy}
				/>

				<div className="flex flex-wrap items-center justify-between gap-3">
					<p className="text-sm text-[var(--color-base-content)]/60">{t("adminDonations.parsed", { count: emails.length })}</p>
					<button className="btn btn-primary" type="button" onClick={runImport} disabled={busy || emails.length === 0}>
						<Upload className="w-4 h-4" />
						{busy ? t("adminDonations.importing") : t("adminDonations.import")}
					</button>
				</div>
			</section>

			{result ? (
				<div className="card p-4 text-sm text-[var(--color-success)]">
					{t("adminDonations.result", { imported: result.imported, linked: result.linked, skipped: result.skipped })}
				</div>
			) : null}
			{error ? <div className="card p-4 text-sm text-[var(--color-error)]">{error}</div> : null}
		</div>
	);
}
