import { describe, expect, it } from "vitest";
import { formatDuration, ratePerMinute, typicalGamesPerMinute, typicalTime } from "./scrapeEstimate";

describe("scrape estimates", () => {
	it("formats durations", () => {
		expect(formatDuration(595)).toBe("~9 min 55 s");
		expect(formatDuration(33)).toBe("~33 s");
		expect(formatDuration(3900)).toBe("~1 h 05 min");
	});

	it("rates are threads times the per-thread rate, lower for guests", () => {
		expect(ratePerMinute(1, true)).toBe(30);
		expect(ratePerMinute(2, false)).toBe(120);
		expect(ratePerMinute(20, false, { rpm_per_thread: 50 })).toBe(1000);
		expect(ratePerMinute(1, true, { guest_rpm_per_thread: 20 })).toBe(20);
	});

	it("typical speed follows the threads, capped by the API limit", () => {
		// Measured: 20 threads resolve about 450 games a minute.
		expect(typicalGamesPerMinute(20, ratePerMinute(20, false))).toBe(440);
		expect(typicalGamesPerMinute(2, ratePerMinute(2, false))).toBe(44);
		// A low API limit caps it.
		expect(typicalGamesPerMinute(4, 30)).toBe(30);
	});

	it("gives approximate times for 1,000 games", () => {
		expect(typicalTime(1, ratePerMinute(1, true))).toBe("~45 min 27 s"); // guest
		expect(typicalTime(2, ratePerMinute(2, false))).toBe("~22 min 44 s"); // Novice
		expect(typicalTime(10, ratePerMinute(10, false))).toBe("~4 min 33 s"); // Novice + supporter
		expect(typicalTime(20, ratePerMinute(20, false))).toBe("~2 min 16 s"); // Legend
		expect(typicalTime(0, 0)).toBe("-");
	});
});
