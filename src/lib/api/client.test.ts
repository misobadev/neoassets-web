import { describe, expect, it } from "vitest";
import { CDN_BASE, cdnUrl, mediaUrl } from "./client";

describe("mediaUrl", () => {
	it("appends an encoded version", () => {
		expect(mediaUrl("a/b.webp", "2026-01-02T03:04:05+00:00")).toBe(
			`${CDN_BASE}/a/b.webp?v=2026-01-02T03%3A04%3A05%2B00%3A00`,
		);
	});

	it("matches cdnUrl without a version", () => {
		expect(mediaUrl("a/b.webp")).toBe(cdnUrl("a/b.webp"));
		expect(mediaUrl("a/b.webp", null)).toBe(cdnUrl("a/b.webp"));
	});
});
