import { Info } from "lucide-react";
import { useTranslation } from "react-i18next";

// SpeedDisclaimer reminds that scraping times are estimates: the real speed
// depends on the device and on which media are downloaded.
export default function SpeedDisclaimer() {
	const { t } = useTranslation();
	return (
		<div
			role="note"
			className="flex items-start gap-2.5 rounded-lg border border-[var(--color-warning)]/40 bg-[var(--color-warning)]/10 p-3"
		>
			<Info className="mt-0.5 h-4 w-4 shrink-0 text-[var(--color-warning)]" aria-hidden="true" />
			<p className="text-xs text-[var(--color-base-content)]/80">{t("guide.speedDisclaimer")}</p>
		</div>
	);
}
