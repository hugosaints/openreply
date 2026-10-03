import { describe, expect, it } from "vitest";
import {
  localizeBestTimes,
  percentChange,
  shareOfTotal,
  tidyCityName,
} from "../lib/reports/overview-insights";

describe("percentChange", () => {
  it("returns null without a usable baseline", () => {
    expect(percentChange(10, null)).toBeNull();
    expect(percentChange(10, undefined)).toBeNull();
    expect(percentChange(10, 0)).toBeNull();
  });

  it("computes growth and decline against the previous period", () => {
    expect(percentChange(150, 100)).toBe(50);
    expect(percentChange(50, 200)).toBe(-75);
    expect(percentChange(100, 100)).toBe(0);
  });
});

describe("localizeBestTimes", () => {
  const slot = { dayOfWeek: 3, hour: 12, avgEngagement: 10, postCount: 2 };

  it("keeps UTC slots untouched at a zero offset", () => {
    expect(localizeBestTimes([slot], 0)).toEqual([slot]);
  });

  it("shifts the hour into the viewer's timezone (UTC-3)", () => {
    const [local] = localizeBestTimes([slot], -180);
    expect(local).toMatchObject({ dayOfWeek: 3, hour: 9, avgEngagement: 10, postCount: 2 });
  });

  it("rolls over to the previous weekday when the shift crosses midnight", () => {
    const [local] = localizeBestTimes([{ ...slot, dayOfWeek: 3, hour: 1 }], -180);
    expect(local).toMatchObject({ dayOfWeek: 2, hour: 22 });
  });

  it("wraps Monday back to Sunday and Sunday forward to Monday", () => {
    const [back] = localizeBestTimes([{ ...slot, dayOfWeek: 0, hour: 1 }], -180);
    expect(back).toMatchObject({ dayOfWeek: 6, hour: 22 });
    const [forward] = localizeBestTimes([{ ...slot, dayOfWeek: 6, hour: 23 }], 180);
    expect(forward).toMatchObject({ dayOfWeek: 0, hour: 2 });
  });
});

describe("audience helpers", () => {
  it("computes a share of the total with one decimal", () => {
    const entries = [{ value: 1482 }, { value: 55 }, { value: 377 }];
    expect(shareOfTotal(entries, 1482)).toBe(77.4);
    expect(shareOfTotal([], 5)).toBe(0);
  });

  it("drops Instagram's (state) suffix from city names", () => {
    expect(tidyCityName("São Paulo, São Paulo (state)")).toBe("São Paulo, São Paulo");
    expect(tidyCityName("Salvador, Bahia")).toBe("Salvador, Bahia");
  });
});
