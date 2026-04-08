import { describe, expect, it } from "vitest";

import { buildNormalizedChartPayload } from "@/lib/chart-payload";
import { buildAstrologerPayload } from "@/lib/astrology-bundle";

function createNatalChart() {
  return {
    status: "OK",
    chart_data: {
      subject: {
        city: "Kunshan",
        nation: "CN",
        tz_str: "Asia/Shanghai",
        iso_formatted_local_datetime: "1992-08-21T10:20:00+08:00",
        iso_formatted_utc_datetime: "1992-08-21T02:20:00Z",
        sun: {
          sign: "Leo",
          house: "Seventh_House",
          position: 23.87,
          abs_pos: 143.87,
          retrograde: false,
        },
        moon: {
          sign: "Pis",
          house: "Fifth_House",
          position: 11.74,
          abs_pos: 341.74,
          retrograde: true,
        },
        mercury: {
          sign: "Vir",
          house: "Sixth_House",
          position: 4.5,
          abs_pos: 154.5,
          retrograde: false,
        },
        venus: {
          sign: "Vir",
          house: "Seventh_House",
          position: 2.11,
          abs_pos: 152.11,
          retrograde: false,
        },
        mars: {
          sign: "Gem",
          house: "Twelfth_House",
          position: 19.2,
          abs_pos: 79.2,
          retrograde: false,
        },
        ascendant: {
          sign: "Lib",
          house: "First_House",
          position: 14.37,
          abs_pos: 194.37,
          retrograde: false,
        },
        medium_coeli: {
          sign: "Can",
          house: "Tenth_House",
          position: 14.37,
          abs_pos: 104.37,
          retrograde: false,
        },
      },
      houses: {
        cusps: [194.37, 222.6, 253.25],
        list: [
          {
            sign: "Lib",
            house: "First_House",
            position: 14.37,
            abs_pos: 194.37,
          },
          {
            sign: "Sco",
            house: "Second_House",
            position: 16.4,
            abs_pos: 196.4,
          },
        ],
      },
      aspects: {
        all: [
          {
            p1_name: "Sun",
            p2_name: "Moon",
            aspect: "trine",
            aspect_degrees: 120,
            orbit: 1.2,
          },
        ],
        relevant: [
          {
            p1_name: "Moon",
            p2_name: "Venus",
            aspect: "sextile",
            aspect_degrees: 60,
            orbit: 6.71,
          },
        ],
      },
    },
  };
}

describe("buildNormalizedChartPayload", () => {
  it("normalizes local natal chart data into the AI payload shape", () => {
    const natalChart = createNatalChart();
    const payload = buildNormalizedChartPayload({
      natalChart,
      birthTimePrecision: "exact",
      locationLabel: "Kunshan, Jiangsu, China",
      postalCode: "215300",
    });

    natalChart.chart_data.houses.cusps[0] = 999;
    natalChart.chart_data.aspects.relevant.push({
      p1_name: "Mars",
      p2_name: "Moon",
      aspect: "square",
      aspect_degrees: 90,
      orbit: 0.5,
    });

    expect(payload.meta).toEqual({
      chartType: "natal",
      localDateTime: "1992-08-21T10:20:00+08:00",
      utcDateTime: "1992-08-21T02:20:00Z",
      timezone: "Asia/Shanghai",
      birthTimePrecision: "exact",
      locationLabel: "Kunshan, Jiangsu, China",
    });
    expect(payload.points.sun).toEqual({
      id: "sun",
      label: "Sun",
      sign: "Leo",
      house: "Seventh_House",
      position: 23.87,
      absPos: 143.87,
      retrograde: false,
    });
    expect(payload.points.ascendant.absPos).toBe(194.37);
    expect(payload.houses.cusps).toEqual([194.37, 222.6, 253.25]);
    expect(payload.houses.list[0]).toEqual({
      house: "First_House",
      sign: "Lib",
      position: 14.37,
      absPos: 194.37,
    });
    expect(payload.aspects.relevant).toHaveLength(1);
    expect(payload.aspects.relevant[0]?.aspect).toBe("sextile");
    expect(payload.inputContext).toEqual({
      country: "China",
      postalCode: "215300",
    });
    expect(payload.derivedSignals.repeatedSignThemes).toContain("Vir");
  });

  it("keeps conservative derived signals for approximate birth times", () => {
    const payload = buildNormalizedChartPayload({
      natalChart: createNatalChart(),
      birthTimePrecision: "approximate",
      locationLabel: "Kunshan, Jiangsu, China",
    });

    expect(payload.derivedSignals.angularPoints).toEqual([]);
    expect(payload.derivedSignals.repeatedHouseThemes).toEqual([]);
    expect(payload.derivedSignals.repeatedSignThemes).toEqual([]);
    expect(payload.derivedSignals.confidenceDowngrades.length).toBeGreaterThan(0);
  });

  it("treats whitespace-only country codes as unknown", () => {
    const natalChart = createNatalChart();
    natalChart.chart_data.subject.nation = "   ";

    const payload = buildNormalizedChartPayload({
      natalChart,
      birthTimePrecision: "exact",
      locationLabel: "Kunshan, Jiangsu, China",
    });

    expect(payload.inputContext.country).toBe("Unknown");
  });

  it("normalizes empty house labels to null", () => {
    const natalChart = createNatalChart();
    natalChart.chart_data.houses.list[0].house = "";

    const payload = buildNormalizedChartPayload({
      natalChart,
      birthTimePrecision: "exact",
      locationLabel: "Kunshan, Jiangsu, China",
    });

    expect(payload.houses.list[0].house).toBeNull();
  });

  it("returns detached copies of cusps and aspects arrays", () => {
    const natalChart = createNatalChart();
    const payload = buildNormalizedChartPayload({
      natalChart,
      birthTimePrecision: "exact",
      locationLabel: "Kunshan, Jiangsu, China",
    });

    natalChart.chart_data.houses.cusps[0] = 999;
    natalChart.chart_data.aspects.relevant[0] = {
      p1_name: "Moon",
      p2_name: "Mars",
      aspect: "square",
      aspect_degrees: 90,
      orbit: 0.5,
    };

    expect(payload.houses.cusps).toEqual([194.37, 222.6, 253.25]);
    expect(payload.aspects.relevant[0]?.aspect).toBe("sextile");
  });

  it("rejects invalid chart coordinates before request construction", () => {
    expect(() =>
      buildAstrologerPayload(
        {
          year: 1992,
          month: 8,
          day: 21,
          hour: 10,
          minute: 20,
          city: "Kunshan",
          country: "CN",
          birthTimePrecision: "exact",
        },
        {
          geonameId: 1,
          name: "Kunshan",
          lat: "not-a-number",
          lng: "120.98",
        },
        "Asia/Shanghai",
      ),
    ).toThrow("Invalid location coordinates.");
  });
});
