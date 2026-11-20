import { describe, expect, it } from "vitest";
import { truncate } from "./seo";

describe("truncate", () => {
	it("keeps short text and collapses whitespace", () => {
		expect(truncate("  A  game\n description ")).toBe("A game description");
	});

	it("cuts long text at a word boundary", () => {
		const out = truncate("word ".repeat(60), 40);
		expect(out.length).toBeLessThanOrEqual(40);
		expect(out.endsWith("word…")).toBe(true);
	});
});
