import isotypeUrl from "../assets/neoassets-isotype.svg";

// The NeoAssets brand: the tile-cube isotype (one tile missing, the piece the
// community adds) and the wordmark with "NEO" in the brand cyan. The isotype is
// imported so the build gives it a hashed URL (a new version is never hidden by
// a cached copy); the downloadable files live in public/brand.

export function Isotype({ className = "h-7 w-7" }: { className?: string }) {
	return <img src={isotypeUrl} alt="" aria-hidden="true" className={`shrink-0 ${className}`} />;
}

export function Wordmark({ className = "text-xl" }: { className?: string }) {
	return (
		<span className={`font-brand inline-block uppercase tracking-tight leading-none ${className}`}>
			<span className="text-[var(--color-primary-soft)]">Neo</span>
			<span>Assets</span>
		</span>
	);
}
