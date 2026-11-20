import { hashRomFile } from "../../lib/romhash";

const ARCHIVE_TYPES = [
	"application/zip",
	"application/x-zip-compressed",
	"application/x-rar-compressed",
	"application/vnd.rar",
	"application/x-7z-compressed",
];

// isRomArchive reports whether a picked file is an archive (ZIP/RAR/7z).
// Arcade ROM sets are contributed by name only, so no size or hashes are
// computed for them.
export function isRomArchive(file: Pick<File, "name" | "type">): boolean {
	return /\.(zip|rar|7z)$/i.test(file.name) || ARCHIVE_TYPES.includes(file.type);
}

export interface RomHashes {
	crc: string;
	md5: string;
	sha1: string;
	sha256: string;
}

// sharesHash reports whether two dumps have any hash in common.
export function sharesHash(a: RomHashes, b: Partial<RomHashes>): boolean {
	return Boolean(
		(a.crc && b.crc === a.crc) ||
		(a.md5 && b.md5 === a.md5) ||
		(a.sha1 && b.sha1 === a.sha1) ||
		(a.sha256 && b.sha256 === a.sha256),
	);
}

// RomFileFields are the ROM row fields filled from a picked file.
export interface RomFileFields extends RomHashes {
	name: string;
	size: string;
}

// readRomFile returns the row fields for a picked ROM: the name only for an
// archive, or the name, size and hashes computed in the browser.
export async function readRomFile(file: File): Promise<{ archive: boolean; fields: RomFileFields }> {
	if (isRomArchive(file)) {
		return { archive: true, fields: { name: file.name, size: "", crc: "", md5: "", sha1: "", sha256: "" } };
	}
	const h = await hashRomFile(file);
	return {
		archive: false,
		fields: { name: h.name, size: String(h.size), crc: h.crc, md5: h.md5, sha1: h.sha1, sha256: h.sha256 },
	};
}
