const WEBP_MIME = "image/webp";

// Converts a raster image (png/jpg/jpeg) to WebP in the browser using the
// native Canvas encoder. Does not touch the VPS: the user's device does the
// work. GIF and WebP inputs are returned unchanged so animated GIFs keep
// their animation. If the browser cannot encode WebP (toBlob silently falls
// back to PNG) the input is rejected so we never upload mislabeled bytes.
export async function toWebp(file: File, maxDim = 2560, quality = 0.85): Promise<File> {
	const type = file.type.toLowerCase();
	if (type === "image/webp" || type === "image/gif") return file;

	const bitmap = await createImageBitmap(file);
	try {
		const scale = Math.min(1, maxDim / Math.max(bitmap.width, bitmap.height));
		const w = Math.max(1, Math.round(bitmap.width * scale));
		const h = Math.max(1, Math.round(bitmap.height * scale));

		const canvas = document.createElement("canvas");
		canvas.width = w;
		canvas.height = h;
		const ctx = canvas.getContext("2d");
		if (!ctx) throw new Error("Canvas 2D context unavailable");
		ctx.drawImage(bitmap, 0, 0, w, h);

		const blob = await new Promise<Blob>((resolve, reject) =>
			canvas.toBlob((b) => (b ? resolve(b) : reject(new Error("WebP conversion failed"))), WEBP_MIME, quality),
		);
		if (blob.type !== WEBP_MIME) {
			throw new Error("This browser cannot encode WebP");
		}
		const base = file.name.replace(/\.[^.]+$/, "");
		return new File([blob], `${base}.webp`, { type: WEBP_MIME });
	} finally {
		bitmap.close();
	}
}

// toSafeBackground centre-crops a raster image to a 1:1 square and resizes it to
// 1024x1024 WebP, used for SAP backgrounds before upload so every asset is
// uniform. Animated GIFs are flattened to their first frame.
export async function toSafeBackground(file: File, size = 1024, quality = 0.85): Promise<File> {
	const bitmap = await createImageBitmap(file);
	try {
		const canvas = document.createElement("canvas");
		canvas.width = size;
		canvas.height = size;
		const ctx = canvas.getContext("2d");
		if (!ctx) throw new Error("Canvas 2D context unavailable");

		// cover: fill the square, centring the source and cropping the overflow.
		const scale = Math.max(size / bitmap.width, size / bitmap.height);
		const w = Math.max(1, Math.round(bitmap.width * scale));
		const h = Math.max(1, Math.round(bitmap.height * scale));
		const x = (size - w) / 2;
		const y = (size - h) / 2;
		ctx.drawImage(bitmap, x, y, w, h);

		const blob = await new Promise<Blob>((resolve, reject) =>
			canvas.toBlob((b) => (b ? resolve(b) : reject(new Error("WebP conversion failed"))), WEBP_MIME, quality),
		);
		if (blob.type !== WEBP_MIME) {
			throw new Error("This browser cannot encode WebP");
		}
		const base = file.name.replace(/\.[^.]+$/, "");
		return new File([blob], `${base}.webp`, { type: WEBP_MIME });
	} finally {
		bitmap.close();
	}
}
