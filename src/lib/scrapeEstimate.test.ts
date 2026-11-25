import { describe, expect, it } from "vitest";
import { exampleTime, formatDuration, ratePerMinute, rateBurst, scrapeSeconds } from "./scrapeEstimate";

describe("scrape estimates", () => {
	it("bursts about five seconds of the rate, never fewer than the threads", () => {
		expect(rateBurst(200, 2)).toBe(16);
		expect(rateBurst(1600, 16)).toBe(133);
		expect(rateBurst(6, 4)).toBe(4);
	});

	it("matches the measured 1,000-game times", () => {
		// Measured locally: guest 4m56s, Novice 2m26s, Novice + monthly 1m11s.
		expect(Math.round(scrapeSeconds(1000, 200, 2))).toBe(295);
		expect(Math.round(scrapeSeconds(1000, 400, 4))).toBe(145);
		expect(Math.round(scrapeSeconds(1000, 800, 8))).toBe(70);
	});

	it("formats durations", () => {
		expect(formatDuration(scrapeSeconds(2000, 200, 2))).toBe("~9 min 55 s");
		expect(formatDuration(33)).toBe("~33 s");
		expect(formatDuration(3900)).toBe("~1 h 05 min");
	});

	it("rates are threads times the per-thread rate, lower for guests", () => {
		expect(ratePerMinute(1, true)).toBe(30);
		expect(ratePerMinute(2, false)).toBe(120);
		expect(ratePerMinute(20, false, { rpm_per_thread: 50 })).toBe(1000);
		expect(ratePerMinute(1, true, { guest_rpm_per_thread: 20 })).toBe(20);
	});

	it("gives every account an example time (no daily limit)", () => {
		expect(exampleTime(1, ratePerMinute(1, true))).toBe("~33 min 16 s"); // a guest
		expect(exampleTime(2, ratePerMinute(2, false))).toBe("~8 min 15 s"); // Novice
		expect(exampleTime(20, ratePerMinute(20, false))).toBe("~45 s"); // Legend
	});
});
