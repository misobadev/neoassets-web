import { useState } from "react";
import { Check, Copy } from "lucide-react";
import { useTranslation } from "react-i18next";

import { writeClipboard, type CopyValue } from "../lib/clipboard";

// CopyButton copies a value to the clipboard and briefly shows a confirmation.
// The value may be a loader that fetches it on click (never rendered).
export default function CopyButton({
	value,
	className = "",
	disabled = false,
	title,
	onError,
}: {
	value: CopyValue;
	className?: string;
	disabled?: boolean;
	title?: string;
	onError?: (err: Error) => void;
}) {
	const { t } = useTranslation();
	const [copied, setCopied] = useState(false);
	const copy = async () => {
		try {
			await writeClipboard(value);
			setCopied(true);
			setTimeout(() => setCopied(false), 1500);
		} catch (e) {
			onError?.(e as Error);
		}
	};
	return (
		<button
			type="button"
			onClick={copy}
			disabled={disabled}
			className={`btn btn-ghost btn-sm gap-1 ${className}`}
			title={title ?? t("common.copy")}
		>
			{copied ? <Check className="w-3.5 h-3.5" /> : <Copy className="w-3.5 h-3.5" />}
			{copied ? t("common.copied") : t("common.copy")}
		</button>
	);
}
