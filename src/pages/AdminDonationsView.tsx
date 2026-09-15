import { useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { useTranslation } from "react-i18next";
import { ChevronLeft, HeartHandshake, Upload } from "lucide-react";
import { importDonations, type DonationImportItem } from "../lib/api";

// parseExport turns a Ko-fi "supporters" export (tab or comma separated) into
// normalized import items. Columns: Name, Email, OneOff, Monthly, Commission,
// Shop, LastSupportedDateUTC, Total, LastestTransactionId, DiscordUsername.
function parseExport(text: string): DonationImportItem[] {
	const items: DonationImportItem[] = [];
	for (const raw of text.split(/\r?\n/)) {
		const line = raw.trim();
		if (!line) continue;
		const cols = line.includes("\t") ? line.split("\t") : line.split(",");
		if (cols.length < 3) continue;
		const email = (cols[1] || "").trim();
		if (!email.includes("@")) continue; // header or malformed row
		const monthly = (cols[3] || "").trim().toUpperCase() === "TRUE";
		const oneOff = (cols[2] || "").trim().toUpperCase() === "TRUE";
		const date = (cols[6] || "").trim();
		const total = parseFloat((cols[7] || "0").trim()) || 0;
		const externalId = (cols[8] || "").trim();
		items.push({
			email,
			from_name: (cols[0] || "").trim(),
			kind: monthly ? "subscription" : oneOff ? "one_time" : "one_time",
			amount_cents: Math.round(total * 100),
			currency: "USD",
			occurred_at: date ? `${date.replace(" ", "T")}:00Z` : undefined,
			external_id: externalId || undefined,
		});
	}
	return items;
}

export default function AdminDonationsView() {
	const { t } = useTranslation();
	const [text, setText] = useState("");
	const [busy, setBusy] = useState(false);
	const [result, setResult] = useState<{ imported: number; linked: number; skipped: number } | null>(null);
	const [error, setError] = useState<string | null>(null);

	const items = useMemo(() => parseExport(text), [text]);

	async function runImport() {
		if (items.length === 0) return;
		setBusy(true);
		setError(null);
		setResult(null);
		try {
			setResult(await importDonations(items));
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
				<textarea
					className="input w-full min-h-48 font-mono text-xs"
					placeholder={t("adminDonations.placeholder")}
					value={text}
					onChange={(e) => { setText(e.target.value); setResult(null); }}
					disabled={busy}
				/>
				<div className="flex flex-wrap items-center justify-between gap-3">
					<p className="text-sm text-[var(--color-base-content)]/60">{t("adminDonations.parsed", { count: items.length })}</p>
					<button className="btn btn-primary" type="button" onClick={runImport} disabled={busy || items.length === 0}>
						<Upload className="w-4 h-4" />
						{busy ? t("adminDonations.importing") : t("adminDonations.import")}
					</button>
				</div>
			</section>

			{items.length > 0 ? (
				<section className="card p-6">
					<h2 className="font-semibold mb-3 flex items-center gap-2"><HeartHandshake className="w-4 h-4 text-[var(--color-primary)]" /> {t("adminDonations.preview")}</h2>
					<div className="overflow-x-auto">
						<table className="w-full text-sm">
							<thead>
								<tr className="text-left text-xs uppercase tracking-wide text-[var(--color-base-content)]/50">
									<th className="py-2 pr-4">{t("common.author")}</th>
									<th className="py-2 pr-4">{t("common.email")}</th>
									<th className="py-2 pr-4">{t("adminDonations.kind")}</th>
									<th className="py-2 pr-4">{t("adminDonations.date")}</th>
									<th className="py-2">{t("adminDonations.amount")}</th>
								</tr>
							</thead>
							<tbody className="divide-y divide-[var(--color-base-300)]">
								{items.map((it) => (
									<tr key={`${it.email}-${it.external_id || it.occurred_at || ""}`}>
										<td className="py-2 pr-4">{it.from_name || "—"}</td>
										<td className="py-2 pr-4 font-mono text-xs">{it.email}</td>
										<td className="py-2 pr-4">
											<span className={`badge badge-sm ${it.kind === "subscription" ? "badge-primary" : "badge-ghost"}`}>
												{t(it.kind === "subscription" ? "adminDonations.monthly" : "adminDonations.oneTime")}
											</span>
										</td>
										<td className="py-2 pr-4 text-xs text-[var(--color-base-content)]/60">{it.occurred_at || "—"}</td>
										<td className="py-2">{(it.amount_cents / 100).toFixed(2)} {it.currency}</td>
									</tr>
								))}
							</tbody>
						</table>
					</div>
				</section>
			) : null}

			{result ? (
				<div className="card p-4 text-sm text-[var(--color-success)]">
					{t("adminDonations.result", { imported: result.imported, linked: result.linked, skipped: result.skipped })}
				</div>
			) : null}
			{error ? <div className="card p-4 text-sm text-[var(--color-error)]">{error}</div> : null}
		</div>
	);
}
