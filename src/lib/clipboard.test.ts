import { afterEach, describe, expect, it, vi } from "vitest";

import { writeClipboard } from "./clipboard";

function mockClipboard() {
	const clipboard = { writeText: vi.fn().mockResolvedValue(undefined), write: vi.fn().mockResolvedValue(undefined) };
	Object.defineProperty(navigator, "clipboard", { value: clipboard, configurable: true });
	return clipboard;
}

describe("writeClipboard", () => {
	afterEach(() => vi.unstubAllGlobals());

	it("writes a plain string directly", async () => {
		const clip = mockClipboard();
		await writeClipboard("ns_live_abc");
		expect(clip.writeText).toHaveBeenCalledWith("ns_live_abc");
	});

	it("passes a pending blob to ClipboardItem for a loader", async () => {
		const clip = mockClipboard();
		const items: Record<string, Promise<Blob>>[] = [];
		vi.stubGlobal(
			"ClipboardItem",
			class {
				constructor(data: Record<string, Promise<Blob>>) {
					items.push(data);
				}
			},
		);
		await writeClipboard(() => Promise.resolve("ns_live_full"));
		expect(clip.write).toHaveBeenCalledOnce();
		const blob = await items[0]["text/plain"];
		expect(await blob.text()).toBe("ns_live_full");
	});

	it("falls back to writeText without ClipboardItem", async () => {
		const clip = mockClipboard();
		vi.stubGlobal("ClipboardItem", undefined);
		await writeClipboard(() => Promise.resolve("ns_live_full"));
		expect(clip.writeText).toHaveBeenCalledWith("ns_live_full");
	});
});
