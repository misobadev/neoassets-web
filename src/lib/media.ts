// Shared media helpers for metadata contributions: image conversion to WebP and
// video probing. Used by the per-field submission page and the new game form.

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

// toWebp converts any picked image to WebP. With `target` the image is
// cover-cropped to that aspect ratio and scaled to exactly that size (fanart:
// 1920x1080 16:9). With `maxSize` the image is only downscaled so its longest
// side fits that size, preserving the aspect ratio (logo/cover: max 1024px).
export async function toWebp(file: File, target?: { w: number; h: number }, maxSize?: number): Promise<File> {
	const bitmap = await createImageBitmap(file);
	let sx = 0;
	let sy = 0;
	let sw = bitmap.width;
	let sh = bitmap.height;
	let outW = bitmap.width;
	let outH = bitmap.height;
	if (target) {
		const targetRatio = target.w / target.h;
		const srcRatio = bitmap.width / bitmap.height;
		if (srcRatio > targetRatio) {
			sw = Math.round(bitmap.height * targetRatio);
			sx = Math.round((bitmap.width - sw) / 2);
		} else {
			sh = Math.round(bitmap.width / targetRatio);
			sy = Math.round((bitmap.height - sh) / 2);
		}
		outW = target.w;
		outH = target.h;
	} else if (maxSize && (bitmap.width > maxSize || bitmap.height > maxSize)) {
		const scale = maxSize / Math.max(bitmap.width, bitmap.height);
		outW = Math.round(bitmap.width * scale);
		outH = Math.round(bitmap.height * scale);
	}
	const canvas = document.createElement("canvas");
	canvas.width = outW;
	canvas.height = outH;
	const ctx = canvas.getContext("2d");
	if (!ctx) throw new Error("canvas is not supported in this browser");
	ctx.drawImage(bitmap, sx, sy, sw, sh, 0, 0, outW, outH);
	const blob: Blob = await new Promise((resolve, reject) =>
		canvas.toBlob((b) => (b ? resolve(b) : reject(new Error("could not encode WebP"))), "image/webp", 0.92),
	);
	const name = file.name.replace(/\.[^.]+$/, "") + ".webp";
	return new File([blob], name, { type: "image/webp" });
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
