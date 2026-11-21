import { Link } from "react-router-dom";
import PageTitle from "../components/ui/PageTitle";
import { useTranslation } from "react-i18next";
import { LayoutGrid, ShieldCheck, Tag, HeartHandshake, KeyRound } from "lucide-react";
import { useSession } from "../lib/session";

// AdminMenu is the /app/admin landing: cards that link to the review sections.
// Each admin area in the color of the part of the site it manages.
const TONES: Record<string, string> = {
	"/app/admin/users": "tone-community",
	"/app/admin/donations": "tone-reward",
	"/app/admin/developer": "tone-primary",
	"/app/admin/metadata": "tone-meta",
	"/app/admin/sap": "tone-sap",
};

export default function AdminMenu() {
	const { t } = useTranslation();
	const { isAdmin: admin } = useSession();
	const items = [
		...(admin
			? [
					{
						to: "/app/admin/users",
						icon: <Tag className="w-5 h-5" />,
						titleKey: "nav.users",
						bodyKey: "adminMenu.usersBody",
					},
				]
			: []),
		...(admin
			? [
					{
						to: "/app/admin/donations",
						icon: <HeartHandshake className="w-5 h-5" />,
						titleKey: "nav.donations",
						bodyKey: "adminMenu.donationsBody",
					},
				]
			: []),
		...(admin
			? [
					{
						to: "/app/admin/developer",
						icon: <KeyRound className="w-5 h-5" />,
						titleKey: "adminDeveloper.title",
						bodyKey: "adminMenu.developerBody",
					},
				]
			: []),
		{
			to: "/app/admin/metadata",
			icon: <ShieldCheck className="w-5 h-5" />,
			titleKey: "nav.metadataReview",
			bodyKey: "adminMenu.metadataBody",
		},
		{
			to: "/app/admin/sap",
			icon: <ShieldCheck className="w-5 h-5" />,
			titleKey: "nav.sapReview",
			bodyKey: "adminMenu.sapBody",
		},
	];

	return (
		<div className="space-y-6">
			<div>
				<PageTitle icon={LayoutGrid} tone="tone-primary">
					{t("nav.admin")}
				</PageTitle>
				<p className="text-sm text-[var(--color-base-content)]/60">{t("adminMenu.subtitle")}</p>
			</div>

			<div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
				{items.map((it) => (
					<Link
						key={it.to}
						to={it.to}
						className={`card card-hover card-tone ${TONES[it.to] || "tone-primary"} p-6 flex flex-col gap-3`}
					>
						<span className="tone-chip !w-10 !h-10">{it.icon}</span>
						<h2 className="font-display font-semibold text-lg">{t(it.titleKey)}</h2>
						<p className="text-sm text-[var(--color-base-content)]/60">{t(it.bodyKey)}</p>
					</Link>
				))}
			</div>
		</div>
	);
}
