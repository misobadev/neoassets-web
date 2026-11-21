import { HandCoins } from "lucide-react";
import { useTranslation } from "react-i18next";
import { safeHttpUrl } from "../lib/url";

// DonateButton renders a generic donation link (Patreon or any other donation
// URL) for a pack. It renders nothing when the pack has no valid http(s) link.
// `compact` shows only the icon (the label stays in the tooltip), for lists.
export default function DonateButton({
	url,
	author,
	compact = false,
}: {
	url?: string;
	author?: string;
	compact?: boolean;
}) {
	const { t } = useTranslation();
	const href = safeHttpUrl(url);
	if (!href) return null;
	const label = author ? t("common.supportAuthor", { author }) : t("common.donate");
	return (
		<a
			href={href}
			target="_blank"
			rel="noopener noreferrer"
			className={`btn btn-ghost btn-sm gap-1 ${compact ? "!px-2 text-[var(--color-sap)]" : ""}`}
			title={label}
			aria-label={label}
		>
			<HandCoins className="w-4 h-4" />
			{compact ? null : t("common.donate")}
		</a>
	);
}
