import { cdnUrl } from "../lib/api";

// Avatar renders a user's profile image (or their initial) as a square with
// rounded corners.
export default function Avatar({
	name,
	avatarKey,
	size = 40,
	className = "",
}: {
	name?: string;
	avatarKey?: string;
	size?: number;
	className?: string;
}) {
	return (
		<div
			className={`rounded-lg overflow-hidden bg-[var(--color-primary)]/15 grid place-items-center shrink-0 ${className}`}
			style={{ width: size, height: size }}
		>
			{avatarKey ? (
				<img src={cdnUrl(avatarKey)} alt="" className="w-full h-full object-cover" />
			) : (
				<span className="font-bold text-[var(--color-primary-soft)]" style={{ fontSize: Math.round(size * 0.45) }}>
					{(name || "?").slice(0, 1).toUpperCase()}
				</span>
			)}
		</div>
	);
}