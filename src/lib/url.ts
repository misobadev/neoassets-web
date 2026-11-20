// safeHttpUrl returns the URL when it is an absolute http(s) address and
// undefined otherwise, so user-supplied links never render as javascript:,
// data: or other schemes.
export function safeHttpUrl(value: string | null | undefined): string | undefined {
	if (!value) return undefined;
	try {
		const url = new URL(value.trim());
		return url.protocol === "https:" || url.protocol === "http:" ? url.href : undefined;
	} catch {
		return undefined;
	}
}
