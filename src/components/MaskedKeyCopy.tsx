import { useState } from "react";
import { Check, Copy } from "lucide-react";
import { useTranslation } from "react-i18next";

import { writeClipboard, type CopyValue } from "../lib/clipboard";

// MaskedKeyCopy shows a secret in masked form inside a button that copies the
// full value (loaded on click) to the clipboard, with a tooltip above it.
export default function MaskedKeyCopy({
	masked,
	value,
	disabled = false,
	tooltip,
	onError,
}: {
	masked: string;
	value: CopyValue;
	disabled?: boolean;
	tooltip: string;
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
	const label = copied ? t("common.copied") : tooltip;
	return (
		<span className="group relative inline-flex max-w-full">
			<button
				type="button"
				onClick={copy}
				disabled={disabled}
				aria-label={label}
				className="inline-flex max-w-full items-center gap-2 rounded-md border border-[var(--color-base-300)] bg-[var(--color-base-200)] px-4 py-2 font-mono text-sm transition-colors hover:border-[var(--color-primary)] focus-visible:border-[var(--color-primary)] focus-visible:outline-none disabled:cursor-not-allowed disabled:opacity-60 disabled:hover:border-[var(--color-base-300)]"
			>
				{copied ? (
					<Check className="h-4 w-4 shrink-0 text-[var(--color-success)]" />
				) : (
					<Copy className="h-4 w-4 shrink-0" />
				)}
				<span className="truncate">{masked}</span>
			</button>
			<span
				role="tooltip"
				className={`pointer-events-none absolute bottom-full left-1/2 z-10 mb-2 -translate-x-1/2 whitespace-nowrap rounded-md border border-[var(--color-base-300)] bg-[var(--color-base-100)] px-3 py-1.5 text-xs shadow-lg transition-opacity ${
					copied ? "opacity-100" : "opacity-0 group-hover:opacity-100 group-focus-within:opacity-100"
				}`}
			>
				{label}
			</span>
		</span>
	);
}
