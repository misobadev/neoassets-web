import { Link } from "react-router-dom";
import { useTranslation } from "react-i18next";
import { LayoutGrid, ShieldCheck, Tag, HeartHandshake } from "lucide-react";
import { isAdmin } from "../lib/api";

// AdminMenu is the /app/admin landing: cards that link to the review sections.
export default function AdminMenu() {
	const { t } = useTranslation();
	const admin = isAdmin();
	const items = [
		...(admin ? [{ to: "/app/admin/users", icon: <Tag className="w-5 h-5" />, titleKey: "nav.users", bodyKey: "adminMenu.usersBody" }] : []),
		...(admin ? [{ to: "/app/admin/donations", icon: <HeartHandshake className="w-5 h-5" />, titleKey: "nav.donations", bodyKey: "adminMenu.donationsBody" }] : []),
		{ to: "/app/admin/metadata", icon: <ShieldCheck className="w-5 h-5" />, titleKey: "nav.metadataReview", bodyKey: "adminMenu.metadataBody" },
		{ to: "/app/admin/sap", icon: <ShieldCheck className="w-5 h-5" />, titleKey: "nav.sapReview", bodyKey: "adminMenu.sapBody" },
	];

	return (
		<div className="space-y-6">
			<div>
				<h1 className="text-2xl md:text-3xl font-bold tracking-tight flex items-center gap-2">
					<LayoutGrid className="w-6 h-6" /> {t("nav.admin")}
				</h1>
				<p className="text-sm text-[var(--color-base-content)]/60">{t("adminMenu.subtitle")}</p>
			</div>

			<div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
				{items.map((it) => (
					<Link key={it.to} to={it.to} className="card card-hover p-6 flex flex-col gap-2">
						<span className="text-[var(--color-primary)]">{it.icon}</span>
						<h2 className="font-semibold">{t(it.titleKey)}</h2>
						<p className="text-sm text-[var(--color-base-content)]/60">{t(it.bodyKey)}</p>
					</Link>
				))}
			</div>
		</div>
	);
}