import { useState } from "react";
import { useTranslation } from "react-i18next";
import { ChevronLeft, ChevronRight } from "lucide-react";
import type { MediaKind, MetadataMedia } from "../lib/api";
import { regionLabel } from "../lib/regions";

// Preferred 2x2 arrangement: row 1 = logo + fanart, row 2 = screenshot +
// video. Kinds outside this list (e.g. boxfront/boxback) are appended after.
const MEDIA_ORDER: MediaKind[] = ["logo", "fanart", "screenshot", "video"];

// MediaGrid renders the game media grouped by kind. When a kind has more than
// one asset (e.g. a logo per region) it becomes a slider, so the region of each
// asset is visible in the caption.
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
	const [index, setIndex] = useState<Record<string, number>>({});

	// Group by kind, preserving the preferred kind order.
	const groups: { kind: MediaKind; items: MetadataMedia[] }[] = [];
	for (const m of [...items].sort((a, b) => {
		const ia = MEDIA_ORDER.indexOf(a.kind);
		const ib = MEDIA_ORDER.indexOf(b.kind);
		return (ia === -1 ? MEDIA_ORDER.length : ia) - (ib === -1 ? MEDIA_ORDER.length : ib);
	})) {
		const g = groups.find((x) => x.kind === m.kind);
		if (g) g.items.push(m);
		else groups.push({ kind: m.kind, items: [m] });
	}

	return (
		<div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
			{groups.map((g) => {
				const i = Math.min(index[g.kind] || 0, g.items.length - 1);
				const m = g.items[i];
				const isVideo = m.kind === "video";
				const d = dims[m.id];
				const go = (delta: number) => setIndex((prev) => ({ ...prev, [g.kind]: (i + delta + g.items.length) % g.items.length }));
				return (
					<div key={g.kind} className="rounded-xl border border-[var(--color-base-300)] bg-[var(--color-base-300)]/30 overflow-hidden">
						<div className="relative">
							{isVideo ? (
								<video
									key={m.id}
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
									key={m.id}
									src={url(m)}
									alt={label(m.kind)}
									loading="lazy"
									className="w-full h-56 object-contain"
									onLoad={(e) => {
										const el = e.currentTarget;
										if (el) setDims((prev) => ({ ...prev, [m.id]: { w: el.naturalWidth, h: el.naturalHeight } }));
									}}
									onError={(e) => (e.currentTarget.style.display = "none")}
								/>
							)}
							{g.items.length > 1 ? (
								<>
									<button
										type="button"
										onClick={() => go(-1)}
										aria-label={t("metadata.prev")}
										className="btn btn-circle btn-xs absolute left-2 top-1/2 -translate-y-1/2 bg-black/50 border-0 text-white hover:bg-black/70"
									>
										<ChevronLeft className="w-4 h-4" />
									</button>
									<button
										type="button"
										onClick={() => go(1)}
										aria-label={t("metadata.next")}
										className="btn btn-circle btn-xs absolute right-2 top-1/2 -translate-y-1/2 bg-black/50 border-0 text-white hover:bg-black/70"
									>
										<ChevronRight className="w-4 h-4" />
									</button>
									<span className="badge badge-sm absolute top-2 right-2 bg-black/50 border-0 text-white">
										{i + 1}/{g.items.length}
									</span>
								</>
							) : null}
						</div>
						<div className="px-3 py-2 text-center border-t border-[var(--color-base-300)]">
							<p className="text-[10px] uppercase tracking-wider text-[var(--color-base-content)]/50">
								{label(m.kind)}
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
