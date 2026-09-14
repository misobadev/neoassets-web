import { useEffect, useState } from "react";
import { BookOpen, Gauge, HeartHandshake, HelpCircle, Star } from "lucide-react";
import { useTranslation } from "react-i18next";
import { fetchConfig, type PublicConfig } from "../lib/api";
import DonorBadge from "../components/DonorBadge";

export default function GuidePage() {
	const { t } = useTranslation();
	const [cfg, setCfg] = useState<PublicConfig | null>(null);

	useEffect(() => {
		fetchConfig()
			.then(setCfg)
			.catch(() => {});
	}, []);

	if (!cfg) {
		return <p className="text-sm text-[var(--color-base-content)]/50 py-10 text-center">{t("common.loading")}</p>;
	}

	const daily = (threads: number) => threads * cfg.daily_games_per_thread;
	const topRank = cfg.ranks[cfg.ranks.length - 1];
	const maxThreads = topRank?.threads ?? cfg.admin_threads;

	const earn = [
		{ value: cfg.points.text_metadata, labelKey: "guide.earn.textMetadata.label", noteKey: "guide.earn.textMetadata.note" },
		{ value: cfg.points.image_metadata, labelKey: "guide.earn.imageMetadata.label", noteKey: "guide.earn.imageMetadata.note" },
		{ value: cfg.points.video_metadata, labelKey: "guide.earn.videoMetadata.label", noteKey: "guide.earn.videoMetadata.note" },
		{ value: cfg.points.sap_image, labelKey: "guide.earn.sapImage.label", noteKey: "guide.earn.sapImage.note" },
	];

	return (
		<div className="space-y-6">
			<div>
				<h1 className="text-2xl md:text-3xl font-bold tracking-tight">{t("guide.title")}</h1>
				<p className="text-sm text-[var(--color-base-content)]/60">{t("guide.subtitle")}</p>
			</div>

			<section className="card p-6 space-y-3">
				<h2 className="font-semibold flex items-center gap-2"><Star className="w-4 h-4 text-[var(--color-primary)]" /> {t("guide.earn.title")}</h2>
				<p className="text-sm text-[var(--color-base-content)]/70">{t("guide.earn.introPrefix")} <strong>{t("guide.earn.introApproved")}</strong>{t("guide.earn.introSuffix")}</p>
				<div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
					{earn.map((e) => (
						<div key={e.labelKey} className="rounded-lg border border-[var(--color-base-300)] p-3 flex items-start gap-3">
							<span className="text-2xl font-bold text-[var(--color-primary-soft)] shrink-0">{e.value}</span>
							<div className="min-w-0">
								<p className="font-medium text-sm">{t(e.labelKey)}</p>
								<p className="text-xs text-[var(--color-base-content)]/50">{t(e.noteKey)}</p>
							</div>
						</div>
					))}
				</div>
			</section>

			<section className="card p-6 space-y-3">
				<h2 className="font-semibold flex items-center gap-2"><Gauge className="w-4 h-4 text-[var(--color-primary)]" /> {t("guide.progression.title")}</h2>
				<p className="text-sm text-[var(--color-base-content)]/70">
					{t("guide.progression.intro", { per: cfg.daily_games_per_thread.toLocaleString() })}
				</p>
				<div className="overflow-x-auto">
					<table className="w-full text-sm">
						<thead>
							<tr className="text-left text-xs uppercase tracking-wide text-[var(--color-base-content)]/50">
								<th className="py-2 pr-4">{t("guide.progression.colLevels")}</th>
								<th className="py-2 pr-4">{t("guide.progression.colRank")}</th>
								<th className="py-2 pr-4">{t("guide.progression.colThreads")}</th>
								<th className="py-2">{t("guide.progression.colDaily")}</th>
							</tr>
						</thead>
						<tbody className="divide-y divide-[var(--color-base-300)]">
							<tr>
								<td className="py-2 pr-4 text-[var(--color-base-content)]/60">—</td>
								<td className="py-2 pr-4">{t("guide.tiers.guest.name")}</td>
								<td className="py-2 pr-4">{cfg.guest_threads}</td>
								<td className="py-2">{daily(cfg.guest_threads).toLocaleString()}</td>
							</tr>
							{cfg.ranks.map((r) => (
								<tr key={r.rank}>
									<td className="py-2 pr-4 font-mono text-xs">{r.min_level}–{r.max_level}</td>
									<td className="py-2 pr-4 font-medium">{t("guide.ranks." + r.rank, { defaultValue: r.rank })}</td>
									<td className="py-2 pr-4">{r.threads}</td>
									<td className="py-2">{daily(r.threads).toLocaleString()}</td>
								</tr>
							))}
						</tbody>
					</table>
				</div>
				<p className="text-xs text-[var(--color-base-content)]/50">{t("guide.progression.xpCurve")}</p>
				<p className="text-xs text-[var(--color-base-content)]/50">
					{t("guide.progression.adminNote", { threads: cfg.admin_threads })}
				</p>
			</section>

			<section className="card p-6 space-y-3">
				<h2 className="font-semibold flex items-center gap-2"><HeartHandshake className="w-4 h-4 text-[var(--color-primary)]" /> {t("guide.donations.title")}</h2>
				<p className="text-sm text-[var(--color-base-content)]/70">{t("guide.donations.intro")}</p>
				<div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
					{cfg.donor_tiers.map((tier) => (
						<div key={tier.status} className="rounded-lg border border-[var(--color-base-300)] p-4 space-y-2">
							<DonorBadge status={tier.status} />
							<p className="text-sm text-[var(--color-base-content)]/70">
								{t("guide.donations." + tier.status + ".perk", { threads: tier.bonus_threads, xp: tier.xp_bonus_pct })}
							</p>
							<p className="text-xs text-[var(--color-base-content)]/50">{t("guide.donations." + tier.status + ".bonus")}</p>
							<p className="text-xs text-[var(--color-base-content)]/50">{t("guide.donations." + tier.status + ".note")}</p>
						</div>
					))}
				</div>
				<p className="text-xs text-[var(--color-base-content)]/50">{t("guide.donations.fairPlay", { max: maxThreads })}</p>
			</section>

			<section className="card p-6 space-y-3">
				<h2 className="font-semibold flex items-center gap-2"><HelpCircle className="w-4 h-4 text-[var(--color-primary)]" /> {t("guide.contribute.title")}</h2>
				<ol className="list-decimal list-inside text-sm text-[var(--color-base-content)]/70 space-y-1">
					<li>{t("guide.contribute.step1Before")} <strong>{t("nav.gameMetadata")}</strong> {t("guide.contribute.step1Or")} <strong>{t("nav.systemArtPack")}</strong> {t("guide.contribute.step1After")}</li>
					<li>{t("guide.contribute.step2")}</li>
					<li>{t("guide.contribute.step3")}</li>
					<li>{t("guide.contribute.step4")}</li>
				</ol>
				<p className="text-xs text-[var(--color-base-content)]/50 flex items-center gap-1">
					<BookOpen className="w-3.5 h-3.5" />
					{t("guide.contribute.note")}
				</p>
			</section>
		</div>
	);
}