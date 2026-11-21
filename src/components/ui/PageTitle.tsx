import type { ReactNode } from "react";
import type { LucideIcon } from "lucide-react";

// PageTitle is the h1 of an app page: the area's icon in a tinted chip next to
// the title, so every page carries the color of the part of the site it
// belongs to (see the tone-* classes in index.css).
export default function PageTitle({
	icon: Icon,
	tone,
	children,
}: {
	icon: LucideIcon;
	tone: string;
	children: ReactNode;
}) {
	return (
		<h1 className={`flex items-center gap-3 text-2xl md:text-3xl font-bold tracking-tight ${tone}`}>
			<span className="tone-chip !w-10 !h-10 md:!w-11 md:!h-11">
				<Icon className="w-5 h-5 md:w-6 md:h-6" aria-hidden="true" />
			</span>
			<span className="min-w-0">{children}</span>
		</h1>
	);
}
