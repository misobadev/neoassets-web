import { useEffect, useState } from "react";
import SectionTitle from "../components/ui/SectionTitle";
import PageTitle from "../components/ui/PageTitle";
import { BookOpen, Gauge, HeartHandshake, HelpCircle, Star, Sparkles } from "lucide-react";
import { useTranslation } from "react-i18next";
import { fetchConfig, type PublicConfig } from "../lib/api";
import DonorBadge from "../components/DonorBadge";
import { usePageMeta } from "../lib/seo";
import { EXAMPLE_GAMES, exampleTime, ratePerMinute } from "../lib/scrapeEstimate";

export default function GuidePage() {
	const { t } = useTranslation();
	usePageMeta({
		title: "Rewards Guide - NeoAssets",
		description:
			"How NeoAssets rewards contributors: XP for approved metadata, media and system art packs, levels, ranks and scraping threads.",
	});
	const [cfg, setCfg] = useState<PublicConfig | null>(null);

	useEffect(() => {
		fetchConfig()
			.then(setCfg)
			.catch(() => {});
	}, []);

	if (!cfg) {
		return <p className="text-sm text-[var(--color-base-content)]/50 py-10 text-center">{t("common.loading")}</p>;
	}

	// Requests per minute: threads times the per-thread rate (lower for guests).
	const rate = (threads: number, guest = false) => ratePerMinute(threads, guest, cfg);
	const time = (threads: number, guest = false) => exampleTime(threads, rate(threads, guest));
	const examples = { n: EXAMPLE_GAMES.toLocaleString() };
	const topRank = cfg.ranks[cfg.ranks.length - 1];
	const maxThreads = topRank?.threads ?? cfg.admin_threads;

	// What a donation changes for the same first-rank account.
	const first = cfg.ranks[0];
	const firstLabel = first ? t("guide.ranks." + first.rank, { defaultValue: first.rank }) : "";
	const compareRows = first
		? [
				{ key: "guest", label: t("guide.tiers.guest.name"), threads: cfg.guest_threads },
				{ key: "base", label: firstLabel, threads: first.threads },
				...cfg.donor_tiers.map((d) => ({
					key: d.status,
					label: `${firstLabel} + ${t("donor." + d.status)}`,
					threads: Math.min(first.threads + d.bonus_threads, maxThreads),
				})),
			]
		: [];

	const earn = [
		{
			value: cfg.points.text_metadata,
			labelKey: "guide.earn.textMetadata.label",
			noteKey: "guide.earn.textMetadata.note",
		},
		{
			value: cfg.points.image_metadata,
			labelKey: "guide.earn.imageMetadata.label",
			noteKey: "guide.earn.imageMetadata.note",
		},
		{
			value: cfg.points.video_metadata,
			labelKey: "guide.earn.videoMetadata.label",
			noteKey: "guide.earn.videoMetadata.note",
		},
		{ value: cfg.points.sap_image, labelKey: "guide.earn.sapImage.label", noteKey: "guide.earn.sapImage.note" },
		{ value: cfg.points.new_game, labelKey: "guide.earn.newGame.label", noteKey: "guide.earn.newGame.note" },
	];

	return (
		<div className="space-y-6">
			<div>
				<PageTitle icon={Sparkles} tone="tone-reward">
					{t("guide.title")}
				</PageTitle>
				<p className="text-sm text-[var(--color-base-content)]/60">{t("guide.subtitle")}</p>
			</div>

			<section className="card p-6 space-y-3 tone-reward">
				<SectionTitle icon={Star} className="">
					{t("guide.earn.title")}
				</SectionTitle>
				<p className="text-sm text-[var(--color-base-content)]/70">
					{t("guide.earn.introPrefix")} <strong>{t("guide.earn.introApproved")}</strong>
					{t("guide.earn.introSuffix")}
				</p>
				<div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
					{earn.map((e) => (
						<div key={e.labelKey} className="card card-tone p-4 flex items-center gap-4">
							<span className="font-display text-3xl font-bold tone-text shrink-0 tabular-nums">
								{e.value}
							</span>
							<div className="min-w-0">
								<p className="font-medium text-sm">{t(e.labelKey)}</p>
								<p className="text-xs text-[var(--color-base-content)]/50">{t(e.noteKey)}</p>
							</div>
						</div>
					))}
				</div>
			</section>

			<section className="card p-6 space-y-3 tone-primary">
				<SectionTitle icon={Gauge} className="">
					{t("guide.progression.title")}
				</SectionTitle>
				<p className="text-sm text-[var(--color-base-content)]/70">
					{t("guide.progression.intro", {
						rpm: ratePerMinute(1, false, cfg),
						guestRpm: ratePerMinute(1, true, cfg),
					})}
				</p>
				<div className="overflow-x-auto">
					<table className="w-full text-sm">
						<thead>
							<tr className="text-left text-xs uppercase tracking-wide text-[var(--color-base-content)]/50">
								<th className="py-2 pr-4">{t("guide.progression.colLevels")}</th>
								<th className="py-2 pr-4">{t("guide.progression.colRank")}</th>
								<th className="py-2 pr-4">{t("guide.progression.colThreads")}</th>
								<th className="py-2 pr-4">{t("guide.progression.colRate")}</th>
								<th className="py-2">{t("guide.progression.colTime", examples)}</th>
							</tr>
						</thead>
						<tbody className="divide-y divide-[var(--color-base-300)]">
							<tr>
								<td className="py-2 pr-4 text-[var(--color-base-content)]/60">-</td>
								<td className="py-2 pr-4">{t("guide.tiers.guest.name")}</td>
								<td className="py-2 pr-4">{cfg.guest_threads}</td>
								<td className="py-2 pr-4">{rate(cfg.guest_threads, true).toLocaleString()}</td>
								<td className="py-2 tabular-nums">{time(cfg.guest_threads, true)}</td>
							</tr>
							{cfg.ranks.map((r) => (
								<tr key={r.rank}>
									<td className="py-2 pr-4 font-mono text-xs">
										{r.min_level}-{r.max_level}
									</td>
									<td className="py-2 pr-4 font-display font-semibold text-[var(--color-primary-soft)]">
										{t("guide.ranks." + r.rank, { defaultValue: r.rank })}
									</td>
									<td className="py-2 pr-4">{r.threads}</td>
									<td className="py-2 pr-4">{rate(r.threads).toLocaleString()}</td>
									<td className="py-2 tabular-nums">{time(r.threads)}</td>
								</tr>
							))}
						</tbody>
					</table>
				</div>
				<p className="text-xs text-[var(--color-base-content)]/50">
					{t("guide.progression.timeNote", examples)}
				</p>
				<p className="text-xs text-[var(--color-base-content)]/50">{t("guide.progression.xpCurve")}</p>
				<p className="text-xs text-[var(--color-base-content)]/50">
					{t("guide.progression.adminNote", { threads: cfg.admin_threads })}
				</p>
			</section>

			<section className="card p-6 space-y-3 tone-sap">
				<SectionTitle icon={HeartHandshake} className="">
					{t("guide.donations.title")}
				</SectionTitle>
				<p className="text-sm text-[var(--color-base-content)]/70">{t("guide.donations.intro")}</p>
				{compareRows.length > 0 ? (
					<div className="space-y-2">
						<p className="text-sm font-semibold">
							{t("guide.donations.compareTitle", { rank: firstLabel, ...examples })}
						</p>
						<div className="overflow-x-auto">
							<table className="w-full text-sm">
								<thead>
									<tr className="text-left text-xs uppercase tracking-wide text-[var(--color-base-content)]/50">
										<th className="py-2 pr-4">{t("apiDocs.colAccount")}</th>
										<th className="py-2 pr-4">{t("guide.progression.colThreads")}</th>
										<th className="py-2 pr-4">{t("guide.progression.colRate")}</th>
										<th className="py-2">{t("guide.progression.colTime", examples)}</th>
									</tr>
								</thead>
								<tbody className="divide-y divide-[var(--color-base-300)]">
									{compareRows.map((r) => (
										<tr key={r.key}>
											<td className="py-2 pr-4 font-medium">{r.label}</td>
											<td className="py-2 pr-4 tabular-nums">{r.threads}</td>
											<td className="py-2 pr-4 tabular-nums">
												{rate(r.threads, r.key === "guest").toLocaleString()}
											</td>
											<td className="py-2 tabular-nums">{time(r.threads, r.key === "guest")}</td>
										</tr>
									))}
								</tbody>
							</table>
						</div>
						<p className="text-xs text-[var(--color-base-content)]/50">
							{t("guide.donations.compareNote")}
						</p>
					</div>
				) : null}
				<div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
					{cfg.donor_tiers.map((tier) => (
						<div key={tier.status} className="card card-tone p-4 space-y-2">
							<DonorBadge status={tier.status} />
							<p className="text-sm text-[var(--color-base-content)]/70">
								{t("guide.donations." + tier.status + ".perk", {
									threads: tier.bonus_threads,
									xp: tier.xp_bonus_pct,
								})}
							</p>
							<p className="text-xs text-[var(--color-base-content)]/50">
								{t("guide.donations." + tier.status + ".bonus")}
							</p>
							<p className="text-xs text-[var(--color-base-content)]/50">
								{t("guide.donations." + tier.status + ".note")}
							</p>
						</div>
					))}
				</div>
				<p className="text-xs text-[var(--color-base-content)]/50">
					{t("guide.donations.fairPlay", { max: maxThreads })}
				</p>
			</section>

			<section className="card p-6 space-y-3 tone-community">
				<SectionTitle icon={HelpCircle} className="">
					{t("guide.contribute.title")}
				</SectionTitle>
				<ol className="list-decimal list-inside text-sm text-[var(--color-base-content)]/70 space-y-1">
					<li>
						{t("guide.contribute.step1Before")} <strong>{t("nav.gameMetadata")}</strong>{" "}
						{t("guide.contribute.step1Or")} <strong>{t("nav.systemArtPack")}</strong>{" "}
						{t("guide.contribute.step1After")}
					</li>
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
