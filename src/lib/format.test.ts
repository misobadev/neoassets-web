import { describe, expect, it } from "vitest";
import { formatBytes, formatDate, formatFileSize } from "./format";

describe("formatDate", () => {
	it("uses the fallback for a missing value", () => {
		expect(formatDate(null, "never")).toBe("never");
		expect(formatDate(undefined)).toBe("");
		expect(formatDate("")).toBe("");
	});

	it("formats a timestamp in the current locale", () => {
		const iso = "2026-01-02T03:04:05Z";
		expect(formatDate(iso)).toBe(new Date(iso).toLocaleString());
	});
});

describe("formatBytes", () => {
	it.each([
		[0, "0 B"],
		[1023, "1023 B"],
		[1024, "1 KB"],
		[5 * 1024 * 1024, "5 MB"],
		[1.5 * 1024 * 1024 * 1024, "1.5 GB"],
	])("%d -> %s", (bytes, want) => {
		expect(formatBytes(bytes)).toBe(want);
	});
});

describe("formatFileSize", () => {
	it.each([
		[undefined, "-"],
		[0, "-"],
		[512, "512 B"],
		[2048, "2 KB"],
		[1.25 * 1024 * 1024, "1.3 MB"],
	])("%s -> %s", (bytes, want) => {
		expect(formatFileSize(bytes)).toBe(want);
	});
});
