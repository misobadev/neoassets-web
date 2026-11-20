import { HandCoins } from "lucide-react";
import { useTranslation } from "react-i18next";
import { safeHttpUrl } from "../lib/url";

// DonateButton renders a generic donation link (Patreon or any other donation
// URL) for a pack. It renders nothing when the pack has no valid http(s) link.
export default function DonateButton({ url, author }: { url?: string; author?: string }) {
	const { t } = useTranslation();
	const href = safeHttpUrl(url);
	if (!href) return null;
	const label = author ? t("common.supportAuthor", { author }) : t("common.donate");
	return (
		<a
			href={href}
			target="_blank"
			rel="noopener noreferrer"
			className="btn btn-ghost btn-sm gap-1"
			title={label}
			aria-label={label}
		>
			<HandCoins className="w-4 h-4" />
			{t("common.donate")}
		</a>
	);
}
