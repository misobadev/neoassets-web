import { Star } from "lucide-react";
import { useTranslation } from "react-i18next";

// ratingColor maps a 0-10 rating to an hsl color interpolating red (low) to
// green (high). A rating of 0 (no rating) returns a muted tone.
export function ratingColor(rating: number): string {
	if (rating <= 0) return "hsl(0, 0%, 60%)";
	const t = Math.min(1, rating / 10);
	const hue = Math.round(t * 120);
	return `hsl(${hue}, 75%, 45%)`;
}

export function RatingBadge({ rating }: { rating?: number | null }) {
	const { t } = useTranslation();
	const r = rating || 0;
	if (r <= 0) {
		return (
			<span className="inline-flex items-center gap-1 text-[var(--color-base-content)]/40" title={t("rating.noRating")}>
				<Star className="w-6 h-6" fill="currentColor" />
			</span>
		);
	}
	return (
		<span
			className="inline-flex items-baseline gap-1 font-bold"
			style={{ color: ratingColor(r) }}
			title={t("rating.rated", { rating: r })}
		>
			<Star className="w-6 h-6 self-center" fill="currentColor" stroke="none" />
			<span className="text-2xl leading-none">{r}</span>
			<span className="text-xs font-semibold opacity-70">/10</span>
		</span>
	);
}
