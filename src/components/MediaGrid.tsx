import { useState } from "react";
import { useTranslation } from "react-i18next";
import type { MediaKind, MetadataMedia } from "../lib/api";
import { regionLabel } from "../lib/regions";

// Preferred 2x2 arrangement: row 1 = logo + fanart, row 2 = screenshot +
// video. Kinds outside this list (e.g. boxfront/boxback) are appended after.
const MEDIA_ORDER: MediaKind[] = ["logo", "fanart", "screenshot", "video"];

// MediaGrid renders the game media as one card per asset in a two-column grid,
// so each kind (logo, fanart, screenshot, video) gets its own bigger preview.
export default function MediaGrid({
	items,
	url,
	label,
	showMeta = false,
}: {
	items: MetadataMedia[];
	url: (m: MetadataMedia) => string;
	label: (kind: MediaKind) => string;
	showMeta?: boolean;
}) {
	const { t } = useTranslation();
	const [dims, setDims] = useState<Record<string, { w: number; h: number }>>({});
	const list = [...items].sort((a, b) => {
		const ia = MEDIA_ORDER.indexOf(a.kind);
		const ib = MEDIA_ORDER.indexOf(b.kind);
		return (ia === -1 ? MEDIA_ORDER.length : ia) - (ib === -1 ? MEDIA_ORDER.length : ib);
	});

	return (
		<div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
			{list.map((m) => {
				const kindLabel = label(m.kind);
				const isVideo = m.kind === "video";
				const d = dims[m.id];
				return (
					<div key={m.id} className="rounded-xl border border-[var(--color-base-300)] bg-[var(--color-base-300)]/30 overflow-hidden">
						{isVideo ? (
							<video
								src={url(m)}
								controls
								className="w-full h-56 object-contain bg-black"
								onLoadedMetadata={(e) => {
								const el = e.currentTarget;
								if (el) setDims((prev) => ({ ...prev, [m.id]: { w: el.videoWidth, h: el.videoHeight } }));
							}}
							/>
						) : (
							<img
								src={url(m)}
								alt={kindLabel}
								loading="lazy"
								className="w-full h-56 object-contain"
								onLoad={(e) => {
								const el = e.currentTarget;
								if (el) setDims((prev) => ({ ...prev, [m.id]: { w: el.naturalWidth, h: el.naturalHeight } }));
							}}
								onError={(e) => (e.currentTarget.style.display = "none")}
							/>
						)}
						<div className="px-3 py-2 text-center border-t border-[var(--color-base-300)]">
							<p className="text-[10px] uppercase tracking-wider text-[var(--color-base-content)]/50">
								{kindLabel}
								{m.region ? <span className="ml-1 badge badge-ghost badge-xs align-middle">{regionLabel(t, m.region)}</span> : null}
							</p>
							{showMeta ? (
								<p className="text-[10px] text-[var(--color-base-content)]/40">
									{d ? `${d.w}×${d.h} · ` : ""}
									{t("metadataGame.mediaBy", { name: m.submitted_by_name || t("metadataGame.mediaSystem") })}
								</p>
							) : null}
						</div>
					</div>
				);
			})}
		</div>
	);
}