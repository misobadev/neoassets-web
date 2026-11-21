import type { ReactNode } from "react";
import type { LucideIcon } from "lucide-react";

// SectionTitle is the h2 of a card or section: a small tinted icon chip and the
// title. The chip takes the tone of the nearest tone-* class.
export default function SectionTitle({
	icon: Icon,
	children,
	className = "mb-4",
}: {
	icon: LucideIcon;
	children: ReactNode;
	className?: string;
}) {
	return (
		<h2 className={`flex items-center gap-2.5 font-semibold text-lg ${className}`}>
			<span className="tone-chip !w-7 !h-7">
				<Icon className="w-4 h-4" aria-hidden="true" />
			</span>
			<span className="min-w-0">{children}</span>
		</h2>
	);
}
