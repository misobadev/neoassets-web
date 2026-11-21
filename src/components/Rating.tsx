import { Star } from "lucide-react";
import { useTranslation } from "react-i18next";

// ratingColor is the color of a rating: the accent for a rated game, muted
// when there is no rating yet.
export function ratingColor(rating: number): string {
	return rating > 0 ? "var(--color-accent)" : "color-mix(in oklab, var(--color-base-content) 40%, transparent)";
}

export function RatingBadge({ rating }: { rating?: number | null }) {
	const { t } = useTranslation();
	const r = rating || 0;
	if (r <= 0) {
		return (
			<span
				className="inline-flex items-center gap-1 text-[var(--color-base-content)]/40"
				title={t("rating.noRating")}
			>
				<Star className="w-4 h-4" fill="currentColor" />
			</span>
		);
	}
	return (
		<span className="inline-flex items-baseline gap-1" title={t("rating.rated", { rating: r })}>
			<Star className="w-4 h-4 self-center" fill={ratingColor(r)} stroke="none" />
			<span className="font-display text-lg font-bold leading-none tabular-nums">{r}</span>
			<span className="text-xs text-[var(--color-base-content)]/50">/10</span>
		</span>
	);
}
