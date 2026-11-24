export type CopyValue = string | (() => Promise<string>);

// writeClipboard copies a value, resolving it lazily when it is a loader. A
// lazy value goes through ClipboardItem with a pending blob where supported, so
// browsers that require the write to start inside the click (Safari) accept it.
export async function writeClipboard(value: CopyValue): Promise<void> {
	if (typeof value === "string") {
		await navigator.clipboard.writeText(value);
		return;
	}
	if (typeof ClipboardItem !== "undefined" && navigator.clipboard.write) {
		const blob = value().then((v) => new Blob([v], { type: "text/plain" }));
		await navigator.clipboard.write([new ClipboardItem({ "text/plain": blob })]);
		return;
	}
	await navigator.clipboard.writeText(await value());
}
