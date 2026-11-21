import { useState } from "react";
import { useTranslation } from "react-i18next";
import { ChevronLeft, ChevronRight, Clapperboard, Image, Monitor, Type, type LucideIcon } from "lucide-react";
import type { MediaKind, MetadataMedia } from "../lib/api";
import RegionLabel from "./RegionLabel";

// Preferred order: logo, fanart, screenshot, video. Kinds outside this list
// (e.g. boxfront/boxback) are appended after.
const MEDIA_ORDER: MediaKind[] = ["logo", "fanart", "screenshot", "video"];

const KIND_ICON: Partial<Record<MediaKind, LucideIcon>> = {
	logo: Type,
	fanart: Image,
	screenshot: Monitor,
	video: Clapperboard,
};

// MediaGrid renders the game media grouped by kind, one compact tile per kind:
// the asset in a 16:9 well (images open full size in a new tab), and a caption
// with the kind, its region and, when a kind has several assets (e.g. a logo
// per region), a small switcher.
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
		<div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
			{groups.map((g) => {
				const i = Math.min(index[g.kind] || 0, g.items.length - 1);
				const m = g.items[i];
				const isVideo = m.kind === "video";
				const d = dims[m.id];
				const Icon = KIND_ICON[m.kind] || Image;
				const go = (delta: number) =>
					setIndex((prev) => ({ ...prev, [g.kind]: (i + delta + g.items.length) % g.items.length }));
				return (
					<div
						key={g.kind}
						className="card card-tone-hover tone-meta overflow-hidden flex flex-col bg-[var(--color-base-200)]"
					>
						<div className="relative aspect-video bg-[var(--color-base-100)] overflow-hidden">
							{isVideo ? (
								<video
									key={m.id}
									src={url(m)}
									controls
									preload="metadata"
									className="absolute inset-0 w-full h-full object-contain bg-black"
									onLoadedMetadata={(e) => {
										const el = e.currentTarget;
										if (el)
											setDims((prev) => ({
												...prev,
												[m.id]: { w: el.videoWidth, h: el.videoHeight },
											}));
									}}
								/>
							) : (
								<a
									href={url(m)}
									target="_blank"
									rel="noopener noreferrer"
									className="absolute inset-0 grid place-items-center p-3"
									title={label(m.kind)}
								>
									<img
										key={m.id}
										src={url(m)}
										alt={label(m.kind)}
										loading="lazy"
										className="max-w-full max-h-full object-contain rounded-sm"
										onLoad={(e) => {
											const el = e.currentTarget;
											if (el)
												setDims((prev) => ({
													...prev,
													[m.id]: { w: el.naturalWidth, h: el.naturalHeight },
												}));
										}}
										onError={(e) => (e.currentTarget.style.visibility = "hidden")}
									/>
								</a>
							)}
						</div>
						<div className="flex items-center gap-2 px-3 py-2 border-t border-[var(--color-base-300)] min-h-[3.25rem]">
							<span className="tone-chip !w-7 !h-7 shrink-0">
								<Icon className="w-3.5 h-3.5" aria-hidden="true" />
							</span>
							<div className="min-w-0 flex-1">
								<p className="flex items-center gap-1.5 text-sm font-medium">
									<span className="truncate">{label(m.kind)}</span>
									{m.region ? (
										<span className="badge badge-solid-neutral badge-xs shrink-0">
											<RegionLabel region={m.region} />
										</span>
									) : null}
								</p>
								{showMeta ? (
									<p className="text-[11px] text-[var(--color-base-content)]/50 truncate">
										{d ? `${d.w}×${d.h} · ` : ""}
										{t("metadataGame.mediaBy", {
											name: m.submitted_by_name || t("metadataGame.mediaSystem"),
										})}
									</p>
								) : null}
							</div>
							{g.items.length > 1 ? (
								<span className="inline-flex items-center shrink-0 rounded-md border border-[var(--color-base-300)] bg-[var(--color-base-100)]">
									<button
										type="button"
										onClick={() => go(-1)}
										aria-label={t("metadata.prev")}
										className="grid place-items-center w-6 h-6 hover:bg-[var(--color-base-300)] rounded-l-md"
									>
										<ChevronLeft className="w-3.5 h-3.5" />
									</button>
									<span className="px-1 font-display text-[11px] tabular-nums text-[var(--color-base-content)]/70">
										{i + 1}/{g.items.length}
									</span>
									<button
										type="button"
										onClick={() => go(1)}
										aria-label={t("metadata.next")}
										className="grid place-items-center w-6 h-6 hover:bg-[var(--color-base-300)] rounded-r-md"
									>
										<ChevronRight className="w-3.5 h-3.5" />
									</button>
								</span>
							) : null}
						</div>
					</div>
				);
			})}
		</div>
	);
}
