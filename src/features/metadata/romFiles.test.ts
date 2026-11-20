import { describe, expect, it } from "vitest";
import { isRomArchive, sharesHash } from "./romFiles";

describe("isRomArchive", () => {
	it("detects archives by extension or type", () => {
		expect(isRomArchive({ name: "pacman.ZIP", type: "" })).toBe(true);
		expect(isRomArchive({ name: "set", type: "application/x-7z-compressed" })).toBe(true);
		expect(isRomArchive({ name: "zelda.sfc", type: "application/octet-stream" })).toBe(false);
	});
});

describe("sharesHash", () => {
	const dump = { crc: "aa", md5: "bb", sha1: "cc", sha256: "dd" };
	it("matches on any shared hash", () => {
		expect(sharesHash(dump, { sha1: "cc" })).toBe(true);
		expect(sharesHash(dump, { crc: "zz", md5: "zz" })).toBe(false);
	});
	it("ignores empty hashes (archives)", () => {
		expect(sharesHash({ crc: "", md5: "", sha1: "", sha256: "" }, { crc: "", md5: "" })).toBe(false);
	});
});
