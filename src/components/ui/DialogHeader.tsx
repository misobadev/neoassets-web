import type { ReactNode } from "react";
import type { LucideIcon } from "lucide-react";

export type DialogTone = "primary" | "success" | "warning" | "error";

const TONE: Record<DialogTone, { bg: string; fg: string }> = {
	primary: { bg: "bg-[var(--color-primary)]/15", fg: "text-[var(--color-primary)]" },
	success: { bg: "bg-[var(--color-success)]/15", fg: "text-[var(--color-success)]" },
	warning: { bg: "bg-[var(--color-warning)]/15", fg: "text-[var(--color-warning)]" },
	error: { bg: "bg-[var(--color-error)]/15", fg: "text-[var(--color-error)]" },
};

interface DialogHeaderProps {
	tone: DialogTone;
	icon: LucideIcon;
	title: ReactNode;
	children?: ReactNode;
}

// DialogHeader is the icon + title + description row at the top of a dialog.
export default function DialogHeader({ tone, icon: Icon, title, children }: DialogHeaderProps) {
	const c = TONE[tone];
	return (
		<div className="flex items-start gap-3">
			<div className={`grid size-9 place-items-center rounded-full ${c.bg} shrink-0`}>
				<Icon className={`w-5 h-5 ${c.fg}`} />
			</div>
			<div className="min-w-0">
				<h2 className="text-lg font-bold">{title}</h2>
				{children !== undefined ? (
					<p className="text-sm text-[var(--color-base-content)]/70 mt-1">{children}</p>
				) : null}
			</div>
		</div>
	);
}
