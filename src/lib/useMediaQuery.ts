import { useSyncExternalStore } from "react";

// useMediaQuery reports whether a CSS media query matches, and re-renders
// when it changes.
export function useMediaQuery(query: string): boolean {
	return useSyncExternalStore(
		(onChange) => {
			const mql = window.matchMedia(query);
			mql.addEventListener("change", onChange);
			return () => mql.removeEventListener("change", onChange);
		},
		() => window.matchMedia(query).matches,
		() => false,
	);
}

// useIsMobile matches phones (below Tailwind's md breakpoint, 768px).
export function useIsMobile(): boolean {
	return useMediaQuery("(max-width: 767px)");
}
