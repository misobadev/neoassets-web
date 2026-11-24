import { describe, expect, it } from "vitest";
import { exampleTime, formatDuration, rateBurst, scrapeSeconds } from "./scrapeEstimate";

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

	it("has no example time when the daily quota is too small", () => {
		expect(exampleTime(1, 100, 500)).toBeNull(); // 500/day < EXAMPLE_GAMES
		expect(exampleTime(1, 100, 1000)).toBe("~9 min 55 s"); // a guest
		expect(exampleTime(2, 100, 1000)).toBe("~4 min 55 s"); // Novice
		expect(exampleTime(6, 100, 1000)).toBe("~1 min 35 s"); // Novice + monthly
		expect(exampleTime(20, 100, 1000)).toBe("~25 s"); // Legend
	});
});
