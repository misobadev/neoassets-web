import type { LucideIcon } from "lucide-react";
import { Link } from "react-router-dom";

// StatTile is a headline number of the catalog or the community. Its tone-*
// class gives it the color of its area: a tinted surface with a top bar, the
// icon in a chip, a large faded icon in the corner and the number in the
// display face. With `to` the whole tile links to that area.
export default function StatTile({
	tone,
	icon: Icon,
	label,
	value,
	to,
}: {
	tone: string;
	icon: LucideIcon;
	label: string;
	value: string;
	to?: string;
}) {
	const body = (
		<>
			<span className="absolute inset-x-0 top-0 h-1 bg-[var(--tone)]" aria-hidden="true" />
			<Icon
				className="absolute -right-5 -bottom-6 w-28 h-28 -rotate-12 text-[var(--tone)] opacity-[0.09]"
				strokeWidth={1.5}
				aria-hidden="true"
			/>
			<span className="relative flex items-center gap-2.5">
				<span className="tone-chip !w-8 !h-8">
					<Icon className="w-4 h-4" aria-hidden="true" />
				</span>
				<span className="text-sm font-medium text-[var(--color-base-content)]/75 truncate">{label}</span>
			</span>
			<span className="relative block mt-4 font-display text-3xl md:text-4xl font-bold leading-none tabular-nums tone-text truncate">
				{value}
			</span>
		</>
	);
	const className = `card relative block overflow-hidden p-5 ${tone} bg-[color-mix(in_oklab,var(--tone)_7%,var(--color-base-200))] !border-[color-mix(in_oklab,var(--tone)_28%,var(--color-base-300))]`;
	return to ? (
		<Link to={to} className={`${className} card-hover`}>
			{body}
		</Link>
	) : (
		<div className={className}>{body}</div>
	);
}
