// Uploads a blob to a presigned R2 URL using XHR so we can report real byte
// progress. The Content-Type must match the one used when the presigned URL
// was generated (the same mime type stored in the submission file), otherwise
// S3-style signature checks could fail.
export function uploadWithProgress(
	url: string,
	blob: Blob,
	contentType: string,
	onProgress: (percent: number) => void,
): Promise<void> {
	return new Promise((resolve, reject) => {
		const xhr = new XMLHttpRequest();
		xhr.open("PUT", url);
		xhr.setRequestHeader("Content-Type", contentType);

		xhr.upload.onprogress = (e) => {
			if (e.lengthComputable && e.total > 0) {
				onProgress(Math.round((e.loaded / e.total) * 100));
			}
		};
		xhr.onload = () => {
			if (xhr.status >= 200 && xhr.status < 300) resolve();
			else reject(new Error(`Upload failed (HTTP ${xhr.status})`));
		};
		xhr.onerror = () => reject(new Error("Network error during upload"));

		xhr.send(blob);
	});
}
