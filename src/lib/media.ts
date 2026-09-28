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

// Common retro/console aspect ratios, used only to LABEL a video's resolution
// in the UI. Aspect ratio is not restricted: arcade boards and vertical shmups
// use many different DARs (4:3, 3:4, 10:9, 8:7, 5:4, ...).
export const ACCEPTED_ASPECTS: { label: string; ratio: number }[] = [
	{ label: "4:3", ratio: 4 / 3 },
	{ label: "3:2", ratio: 3 / 2 },
	{ label: "16:9", ratio: 16 / 9 },
	{ label: "1:1", ratio: 1 },
	{ label: "3:4", ratio: 3 / 4 },
	{ label: "10:9", ratio: 10 / 9 },
	{ label: "5:4", ratio: 5 / 4 },
	{ label: "8:7", ratio: 8 / 7 },
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
// Browsers do not expose FPS directly, so it is measured by sampling presented
// frames over a muted playback. The element is attached to the DOM (visually
// hidden) because requestVideoFrameCallback does not fire reliably for a
// detached video, which made some videos measure as ~3 fps.
export function measureVideo(file: File): Promise<VideoMeasurement> {
	return new Promise((resolve, reject) => {
		const url = URL.createObjectURL(file);
		const video = document.createElement("video");
		video.preload = "auto";
		video.muted = true;
		video.playsInline = true;
		video.style.cssText = "position:fixed;left:-10000px;top:0;width:2px;height:2px;opacity:0;pointer-events:none";
		document.body.appendChild(video);
		video.src = url;

		let settled = false;
		const guard = window.setTimeout(() => done(0), 4000);
		const cleanup = () => {
			window.clearTimeout(guard);
			try { video.pause(); } catch {}
			video.removeAttribute("src");
			try { video.load(); } catch {}
			video.remove();
			URL.revokeObjectURL(url);
		};
		const done = (fps: number) => {
			if (settled) return;
			settled = true;
			const result = { duration: video.duration, width: video.videoWidth, height: video.videoHeight, fps };
			cleanup();
			resolve(result);
		};
		const fail = () => {
			if (settled) return;
			settled = true;
			cleanup();
			reject(new Error("could not read video"));
		};

		video.onerror = fail;
		video.onloadedmetadata = () => {
			// Ignore the decoder warm-up, then count presented frames over a
			// fixed wall-clock window. getVideoPlaybackQuality is preferred (it
			// counts frames the compositor actually presented); rVFC callbacks are
			// the fallback.
			const warmupMs = 500;
			const sampleMs = 1500;
			const t0 = performance.now();
			const qualityFrames = () => (typeof video.getVideoPlaybackQuality === "function" ? video.getVideoPlaybackQuality().totalVideoFrames : null);
			let sampling = false;
			let sampleStart = 0;
			let sampleStartFrames = 0;
			let rvfcAtStart = 0;
			let rvfcCount = 0;

			const finish = () => {
				const seconds = (performance.now() - sampleStart) / 1000;
				const endFrames = qualityFrames();
				const frames = endFrames != null ? endFrames - sampleStartFrames : rvfcCount - rvfcAtStart;
				done(frames > 0 && seconds > 0.3 ? Math.round(frames / seconds) : 0);
			};
			const tick = () => {
				if (settled) return;
				const elapsed = performance.now() - t0;
				if (!sampling && elapsed >= warmupMs) {
					sampling = true;
					sampleStart = performance.now();
					sampleStartFrames = qualityFrames() ?? 0;
					rvfcAtStart = rvfcCount;
				}
				if (sampling && performance.now() - sampleStart >= sampleMs) {
					finish();
					return;
				}
				if (typeof video.requestVideoFrameCallback === "function") {
					video.requestVideoFrameCallback(() => {
						rvfcCount++;
						tick();
					});
				} else {
					window.setTimeout(tick, 100);
				}
			};
			video.play().then(tick).catch(() => done(0));
		};
	});
}

// VideoCheck is a client-side validation result expressed as i18n keys so the
// caller can translate it. FPS is only a warning: the browser measurement is not
// fully reliable, so the server is authoritative and rejects a genuinely low
// frame rate when the submission is created.
export interface VideoCheck {
	errors: { key: string; params?: Record<string, unknown> }[];
	warnings: { key: string; params?: Record<string, unknown> }[];
}

// checkVideoMeasurement applies the video rules. Aspect ratio is intentionally
// not restricted (arcade boards use many DARs).
export function checkVideoMeasurement(fileName: string, m: VideoMeasurement): VideoCheck {
	const errors: VideoCheck["errors"] = [];
	const warnings: VideoCheck["warnings"] = [];
	if (!VIDEO_ACCEPT.split(",").some((e) => fileName.toLowerCase().endsWith(e))) {
		errors.push({ key: "metadataSubmit.errors.format" });
	}
	if (m.duration < VIDEO_MIN_SECONDS - 0.5) {
		errors.push({ key: "metadataSubmit.errors.durationMin", params: { min: VIDEO_MIN_SECONDS, current: m.duration.toFixed(1) } });
	}
	if (m.duration > VIDEO_MAX_SECONDS + 0.5) {
		errors.push({ key: "metadataSubmit.errors.durationMax", params: { max: VIDEO_MAX_SECONDS, current: m.duration.toFixed(1) } });
	}
	if (m.width <= 0 || m.height <= 0) {
		errors.push({ key: "metadataSubmit.errors.dimensions" });
	}
	if (m.fps > 0 && m.fps < VIDEO_FPS_MIN) {
		warnings.push({ key: "metadataSubmit.errors.frameRate", params: { fpsMin: VIDEO_FPS_MIN, fps: VIDEO_FPS, detected: m.fps } });
	}
	return { errors, warnings };
}
