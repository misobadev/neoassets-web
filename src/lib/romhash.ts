// Client-side ROM hashing. When a contributor drops a ROM file, its name, size,
// CRC32, MD5, SHA1 and SHA256 are computed in the browser so nothing has to be
// typed by hand and the file never leaves the machine.

// CRC32 (IEEE 802.3) lookup table.
const CRC_TABLE = (() => {
	const table = new Uint32Array(256);
	for (let i = 0; i < 256; i++) {
		let c = i;
		for (let k = 0; k < 8; k++) c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1;
		table[i] = c >>> 0;
	}
	return table;
})();

function bytesToHex(bytes: Uint8Array): string {
	let out = "";
	for (let i = 0; i < bytes.length; i++) out += bytes[i].toString(16).padStart(2, "0");
	return out;
}

// crc32 returns the 8-char lowercase hex CRC32 of the bytes.
export function crc32(bytes: Uint8Array): string {
	let crc = 0xffffffff;
	for (let i = 0; i < bytes.length; i++) crc = CRC_TABLE[(crc ^ bytes[i]) & 0xff] ^ (crc >>> 8);
	return ((crc ^ 0xffffffff) >>> 0).toString(16).padStart(8, "0");
}

// md5 is a compact RFC 1321 implementation. MD5 is not available in Web Crypto.
const MD5_S = [
	7, 12, 17, 22, 7, 12, 17, 22, 7, 12, 17, 22, 7, 12, 17, 22,
	5, 9, 14, 20, 5, 9, 14, 20, 5, 9, 14, 20, 5, 9, 14, 20,
	4, 11, 16, 23, 4, 11, 16, 23, 4, 11, 16, 23, 4, 11, 16, 23,
	6, 10, 15, 21, 6, 10, 15, 21, 6, 10, 15, 21, 6, 10, 15, 21,
];
const MD5_K = (() => {
	const k = new Uint32Array(64);
	for (let i = 0; i < 64; i++) k[i] = (Math.abs(Math.sin(i + 1)) * 0x100000000) >>> 0;
	return k;
})();

export function md5(input: Uint8Array): string {
	const len = input.length;
	const bitLen = len * 8;
	const withOne = len + 1;
	const padLen = (((56 - withOne) % 64) + 64) % 64;
	const total = withOne + padLen + 8;
	const msg = new Uint8Array(total);
	msg.set(input);
	msg[len] = 0x80;
	const view = new DataView(msg.buffer);
	view.setUint32(total - 8, bitLen >>> 0, true);
	view.setUint32(total - 4, Math.floor(bitLen / 0x100000000), true);

	let a0 = 0x67452301;
	let b0 = 0xefcdab89;
	let c0 = 0x98badcfe;
	let d0 = 0x10325476;
	const m = new Uint32Array(16);
	for (let off = 0; off < total; off += 64) {
		for (let i = 0; i < 16; i++) m[i] = view.getUint32(off + i * 4, true);
		let a = a0;
		let b = b0;
		let c = c0;
		let d = d0;
		for (let i = 0; i < 64; i++) {
			let f: number;
			let g: number;
			if (i < 16) {
				f = (b & c) | (~b & d);
				g = i;
			} else if (i < 32) {
				f = (d & b) | (~d & c);
				g = (5 * i + 1) % 16;
			} else if (i < 48) {
				f = b ^ c ^ d;
				g = (3 * i + 5) % 16;
			} else {
				f = c ^ (b | ~d);
				g = (7 * i) % 16;
			}
			f = (f + a + MD5_K[i] + m[g]) >>> 0;
			a = d;
			d = c;
			c = b;
			b = (b + ((f << MD5_S[i]) | (f >>> (32 - MD5_S[i])))) >>> 0;
		}
		a0 = (a0 + a) >>> 0;
		b0 = (b0 + b) >>> 0;
		c0 = (c0 + c) >>> 0;
		d0 = (d0 + d) >>> 0;
	}
	const out = new Uint8Array(16);
	const ov = new DataView(out.buffer);
	ov.setUint32(0, a0, true);
	ov.setUint32(4, b0, true);
	ov.setUint32(8, c0, true);
	ov.setUint32(12, d0, true);
	return bytesToHex(out);
}

async function subtleHex(algo: "SHA-1" | "SHA-256", bytes: Uint8Array): Promise<string> {
	const digest = await crypto.subtle.digest(algo, bytes);
	return bytesToHex(new Uint8Array(digest));
}

export interface RomHashes {
	name: string;
	size: number;
	crc: string;
	md5: string;
	sha1: string;
	sha256: string;
}

// hashRomFile reads the file into memory and returns every hash the ROM form
// needs. SHA1/SHA256 use Web Crypto; MD5 and CRC32 are computed locally.
export async function hashRomFile(file: File): Promise<RomHashes> {
	const bytes = new Uint8Array(await file.arrayBuffer());
	const [sha1, sha256] = await Promise.all([subtleHex("SHA-1", bytes), subtleHex("SHA-256", bytes)]);
	return { name: file.name, size: file.size, crc: crc32(bytes), md5: md5(bytes), sha1, sha256 };
}
