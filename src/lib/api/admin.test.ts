import { afterEach, describe, expect, it, vi } from "vitest";
import { setPackDonation } from "./admin";

describe("setPackDonation", () => {
	afterEach(() => vi.unstubAllGlobals());

	it("sends the link as a JSON object", async () => {
		const fetchMock = vi
			.fn()
			.mockResolvedValue(new Response(JSON.stringify({ donation_url: "https://ko-fi.com/x" }), { status: 200 }));
		vi.stubGlobal("fetch", fetchMock);
		await expect(setPackDonation("neostation", "ko-fi.com/x")).resolves.toEqual({
			donation_url: "https://ko-fi.com/x",
		});
		const [url, init] = fetchMock.mock.calls[0];
		expect(url).toMatch(/\/api\/v1\/admin\/packs\/neostation\/donation$/);
		expect(init.method).toBe("PUT");
		expect(JSON.parse(init.body)).toEqual({ donation_url: "ko-fi.com/x" });
	});
});
