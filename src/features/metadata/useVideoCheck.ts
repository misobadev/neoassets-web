import { useEffect, useState } from "react";
import { useTranslation } from "react-i18next";
import { aspectLabel, checkVideoMeasurement, measureVideo, type VideoMeasurement } from "../../lib/media";

export type VideoMeta = VideoMeasurement & { aspect: string };

export interface VideoCheck {
	meta: VideoMeta | null;
	// error blocks the submission (format, duration, size).
	error: string | null;
	// warning is informative only: the browser's frame-rate reading is
	// unreliable, and the server validates it on submit.
	warning: string | null;
}

const EMPTY: VideoCheck = { meta: null, error: null, warning: null };

// useVideoCheck measures a picked video in the browser and validates it
// before upload. Pass null when no video is picked.
export function useVideoCheck(file: File | null): VideoCheck {
	const { t } = useTranslation();
	const [check, setCheck] = useState<VideoCheck>(EMPTY);
	useEffect(() => {
		if (!file) {
			setCheck(EMPTY);
			return;
		}
		// Clear the previous file's result while the new one is measured.
		setCheck(EMPTY);
		let cancelled = false;
		measureVideo(file)
			.then((m) => {
				if (cancelled) return;
				const { errors, warnings } = checkVideoMeasurement(file.name, m);
				setCheck({
					meta: { ...m, aspect: aspectLabel(m.width, m.height) },
					error: errors.length ? errors.map((e) => t(e.key, e.params)).join(" ") : null,
					warning: warnings.length ? warnings.map((e) => t(e.key, e.params)).join(" ") : null,
				});
			})
			.catch(() => {
				if (!cancelled) setCheck({ meta: null, error: t("metadataSubmit.errors.readVideo"), warning: null });
			});
		return () => {
			cancelled = true;
		};
	}, [file, t]);
	return check;
}
