import { useState } from "react";
import { Check, Copy } from "lucide-react";
import { useTranslation } from "react-i18next";

// CopyButton copies a value to the clipboard and briefly shows a confirmation.
export default function CopyButton({ value, className = "" }: { value: string; className?: string }) {
	const { t } = useTranslation();
	const [copied, setCopied] = useState(false);
	const copy = async () => {
		try {
			await navigator.clipboard.writeText(value);
			setCopied(true);
			setTimeout(() => setCopied(false), 1500);
		} catch {
			/* clipboard unavailable */
		}
	};
	return (
		<button type="button" onClick={copy} className={`btn btn-ghost btn-sm gap-1 ${className}`} title={t("common.copy")}>
			{copied ? <Check className="w-3.5 h-3.5" /> : <Copy className="w-3.5 h-3.5" />}
			{copied ? t("common.copied") : t("common.copy")}
		</button>
	);
}
