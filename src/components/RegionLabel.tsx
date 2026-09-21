import { useTranslation } from "react-i18next";
import { regionFlagClass, regionLabel } from "../lib/regions";

// RegionFlag renders just the flag of a region (no name).
export function RegionFlag({ region, className }: { region: string; className?: string }) {
	const flag = regionFlagClass(region);
	if (!flag) return null;
	return <span className={(flag + " rounded-[3px] shadow-sm " + (className || "")).trim()} aria-hidden />;
}

// RegionLabel renders a region's flag (flag-icons) followed by its translated
// name. The flag is omitted when the region has no known flag.
export default function RegionLabel({ region, className }: { region: string; className?: string }) {
	const { t } = useTranslation();
	if (!region) return null;
	const flag = regionFlagClass(region);
	return (
		<span className={"inline-flex items-center gap-1.5 " + (className || "")}>
			{flag ? <span className={flag + " rounded-[3px] shadow-sm shrink-0"} aria-hidden /> : null}
			<span>{regionLabel(t, region)}</span>
		</span>
	);
}
