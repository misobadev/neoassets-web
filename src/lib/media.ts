// Shared media helpers for metadata contributions: accepted formats and video
// probing. Images are uploaded as picked; the backend normalizes them to WebP
// (crop, scale, quality) on approval, so no client-side conversion is trusted.

export const IMAGE_ACCEPT = ".webp,.png,.jpg,.jpeg,.gif";
export const VIDEO_ACCEPT = ".webm,.mp4,.mov,.mkv,.avi,.m4v,.mpg,.mpeg,.ts,.ogv,.wmv,.flv";

export const VIDEO_MIN_SECONDS = 30;
export const VIDEO_MAX_SECONDS = 45;
export const VIDEO_FPS = 60;
// 60 fps is recommended. Videos below the minimum are rejected; the source
// frame rate is preserved on re-encode, except videos above the maximum, which
// are capped down to 60 fps.
export const VIDEO_FPS_MIN = 23;
export const VIDEO_FPS_MAX = 60;

// English descriptions are translated sentence by sentence by the worker; this
// is the maximum the worker accepts (and what the backend enforces).
export const MAX_DESCRIPTION_LENGTH = 1500;

// Common retro/console aspect ratios a video should match.
export const ACCEPTED_ASPECTS: { label: string; ratio: number }[] = [
	{ label: "4:3", ratio: 4 / 3 },
	{ label: "3:2", ratio: 3 / 2 },
	{ label: "16:9", ratio: 16 / 9 },
	{ label: "1:1", ratio: 1 },
];

export function aspectLabel(w: number, h: number): string {
	const ratio = w / h;
	let best = `${Math.round(w)}x${Math.round(h)}`;
	let bestDiff = Number.POSITIVE_INFINITY;
	for (const a of ACCEPTED_ASPECTS) {
		const diff = Math.abs(a.ratio - ratio);
		if (diff < bestDiff) {
			bestDiff = diff;
			best = `${Math.round(w)}x${Math.round(h)} (${a.label})`;
		}
	}
	return best;
}

export interface VideoMeasurement {
	duration: number;
	width: number;
	height: number;
	fps: number;
}

// measureVideo loads a video to read its duration, dimensions and frame rate.
// Browsers do not expose FPS directly, so it is measured by sampling frames
// over a short muted playback.
export function measureVideo(file: File): Promise<VideoMeasurement> {
	return new Promise((resolve, reject) => {
		const url = URL.createObjectURL(file);
		const video = document.createElement("video");
		video.preload = "auto";
		video.muted = true;
		video.playsInline = true;
		video.src = url;
		let settled = false;
		const done = (fps: number) => {
			if (settled) return;
			settled = true;
			const result = { duration: video.duration, width: video.videoWidth, height: video.videoHeight, fps };
			video.pause();
			URL.revokeObjectURL(url);
			resolve(result);
		};
		const fail = () => {
			if (settled) return;
			settled = true;
			video.pause();
			URL.revokeObjectURL(url);
			reject(new Error("could not read video"));
		};
		video.onloadedmetadata = () => {
			if (!video.requestVideoFrameCallback) {
				done(0);
				return;
			}
			let frames = 0;
			let first = -1;
			const onFrame = (_now: number, meta: { mediaTime: number }) => {
				if (settled) return;
				if (first < 0) first = meta.mediaTime;
				frames++;
				const elapsed = meta.mediaTime - first;
				if (elapsed >= 0.6) {
					done(Math.round(frames / elapsed));
				} else {
					video.requestVideoFrameCallback(onFrame);
				}
			};
			video.requestVideoFrameCallback(onFrame);
			video.play().catch(() => done(0));
		};
		video.onerror = fail;
	});
}
