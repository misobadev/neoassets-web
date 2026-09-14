import { useEffect } from "react";

// usePageTitle sets the document title for the current route. Useful for a SPA
// so each page has a meaningful, crawlable title.
export function usePageTitle(title: string) {
	useEffect(() => {
		document.title = title;
		return () => {
			document.title = "NeoAssets — System Art Packs & Game Metadata";
		};
	}, [title]);
}