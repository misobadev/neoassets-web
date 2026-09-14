import { HeartHandshake, Sparkles } from "lucide-react";
import { useTranslation } from "react-i18next";

// DonorBadge shows a Supporter / Monthly Supporter badge (nothing for none).
export default function DonorBadge({ status, className = "" }: { status?: string; className?: string }) {
	const { t } = useTranslation();
	if (status !== "supporter" && status !== "monthly_supporter") return null;
	const monthly = status === "monthly_supporter";
	return (
		<span className={`badge ${monthly ? "badge-warning" : "badge-info"} gap-1 ${className}`} title={t("donor." + status)}>
			{monthly ? <Sparkles className="w-3.5 h-3.5" /> : <HeartHandshake className="w-3.5 h-3.5" />}
			{t("donor." + status)}
		</span>
	);
}