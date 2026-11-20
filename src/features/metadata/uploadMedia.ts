import { requestMetadataUploadUrl, type MediaKind } from "../../lib/api";
import { uploadWithProgress } from "../../lib/upload";

// UploadedMedia is a file entry of a metadata submission payload.
export interface UploadedMedia {
	kind: MediaKind;
	object_key: string;
	file_name: string;
	mime_type: string;
	size: number;
	region: string;
}

// uploadMedia uploads one picked file for a metadata submission through a
// presigned URL and returns its submission file entry. target is the game (an
// edit) or the system (a new game).
export async function uploadMedia(
	target: { game_id: string } | { system_id: string },
	kind: MediaKind,
	file: File,
	region: string,
	onProgress: (percent: number) => void,
): Promise<UploadedMedia> {
	const mime = file.type || "application/octet-stream";
	const resp = await requestMetadataUploadUrl({
		...target,
		kind,
		file_name: file.name,
		mime_type: mime,
		size: file.size,
		region,
	});
	await uploadWithProgress(resp.upload_url, file, mime, onProgress);
	onProgress(100);
	return { kind, object_key: resp.object_key, file_name: file.name, mime_type: mime, size: file.size, region };
}
