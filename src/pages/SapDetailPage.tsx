import { useEffect, useState } from "react";
import { Link, useParams } from "react-router-dom";
import { ChevronLeft, Download, Layers, Plus } from "lucide-react";
import { useTranslation } from "react-i18next";
import { fetchPackDetail, userToken, type PackDetail } from "../lib/api";
import UserLink from "../components/UserLink";
import DonateButton from "../components/DonateButton";
import { usePageTitle } from "../lib/seo";

// SapDetailPage shows a published System Art Pack: its metadata, every image and
// a Contribute button, mirroring the game metadata detail page. Browsing is
// public; contributing requires an account.
export default function SapDetailPage() {
	const { packID } = useParams<{ packID: string }>();
	const { t } = useTranslation();
	const [pack, setPack] = useState<PackDetail | null>(null);
	const [error, setError] = useState<string | null>(null);
	const signedIn = !!userToken();
	usePageTitle(pack ? pack.name : t("nav.systemArtPack"));

	useEffect(() => {
		if (!packID) return;
		fetchPackDetail(packID)
			.then(setPack)
			.catch((e: Error) => setError(e.message));
	}, [packID]);

	if (error) {
		return (
			<div className="space-y-4">
				<Link to="/app/sap" className="link text-sm inline-flex items-center gap-1">
					<ChevronLeft className="w-4 h-4" />
					{t("common.back")}
				</Link>
				<p className="text-sm text-[var(--color-error)]">{error}</p>
			</div>
		);
	}
	if (!pack) return <p className="text-sm text-[var(--color-base-content)]/50 py-6 text-center">{t("common.loading")}</p>;

	const images = (pack.files || []).filter((f) => f.kind === "background" || f.kind === "preview");

	return (
		<div className="space-y-6">
			<div className="flex items-center gap-3">
				<Link to="/app/sap" className="btn btn-ghost !p-2 shrink-0" aria-label={t("common.back")}>
					<ChevronLeft className="w-5 h-5" />
				</Link>
				<div className="min-w-0 flex-1">
					<div className="flex items-center gap-2 flex-wrap">
						<h1 className="text-2xl md:text-3xl font-bold tracking-tight truncate">{pack.name}</h1>
						<span className="badge badge-success shrink-0">v{pack.version || "?"}</span>
					</div>
					<p className="text-sm text-[var(--color-base-content)]/60 pt-1">{t("submissions.byAuthor", { author: pack.author })}</p>
				</div>
				{signedIn ? (
					<Link to={`/app/sap/${pack.folder}/contribute`} className="btn btn-primary btn-sm shrink-0">
						<Plus className="w-4 h-4" />
						{t("submissions.contribute")}
					</Link>
				) : (
					<Link to="/app/login" state={{ from: `/app/sap/${pack.folder}` }} className="btn btn-primary btn-sm shrink-0">
						<Plus className="w-4 h-4" />
						{t("submissions.contribute")}
					</Link>
				)}
			</div>

			<section className="card p-6 space-y-4">
				<div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-sm text-[var(--color-base-content)]/60">
					<span className="flex items-center gap-1">
						<Download className="w-4 h-4" />
						{(pack.downloads || 0).toLocaleString()} {t("submissions.downloadsShort")}
					</span>
					<span className="flex items-center gap-1">
						<Layers className="w-4 h-4" />
						{pack.systems_covered || 0} {t("submissions.systemsShort")}
					</span>
					{pack.submitted_by ? (
						<span>
							{t("submissions.submittedBy")} <UserLink>{pack.submitted_by}</UserLink>
						</span>
					) : null}
				</div>
				{pack.description ? <p className="text-sm text-[var(--color-base-content)]/70 whitespace-pre-wrap">{pack.description}</p> : null}
				<div className="pt-2 border-t border-[var(--color-base-300)]">
					<DonateButton url={pack.donation_url} author={pack.author} />
				</div>
			</section>

			<section className="card p-6">
				<h2 className="font-semibold mb-3">{t("submissions.gallery")}</h2>
				{images.length === 0 ? (
					<p className="text-sm text-[var(--color-base-content)]/50">{t("submissions.noImages")}</p>
				) : (
					<div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-3">
						{images.map((f) => (
							<img
								key={f.object_key}
								src={f.url}
								alt=""
								loading="lazy"
								className="w-full aspect-square object-cover rounded-lg border border-[var(--color-base-300)] bg-[var(--color-base-300)]/30"
								onError={(e) => (e.currentTarget.style.display = "none")}
							/>
						))}
					</div>
				)}
			</section>
		</div>
	);
}
