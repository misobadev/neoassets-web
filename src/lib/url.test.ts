import { describe, expect, it } from "vitest";
import { safeHttpUrl } from "./url";

describe("safeHttpUrl", () => {
	it("accepts http and https URLs", () => {
		expect(safeHttpUrl("https://ko-fi.com/someone")).toBe("https://ko-fi.com/someone");
		expect(safeHttpUrl(" http://example.com/a ")).toBe("http://example.com/a");
	});

	it("rejects other schemes, relative paths and empty values", () => {
		expect(safeHttpUrl("javascript:alert(1)")).toBeUndefined();
		expect(safeHttpUrl("data:text/html,hi")).toBeUndefined();
		expect(safeHttpUrl("/relative/path")).toBeUndefined();
		expect(safeHttpUrl("")).toBeUndefined();
		expect(safeHttpUrl(undefined)).toBeUndefined();
	});
});
