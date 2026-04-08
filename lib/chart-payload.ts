import type { BirthTimePrecision } from "@/lib/reading";
import {
  type AstrologerAspect,
  type AstrologerChartHouse,
  type AstrologerChartPoint,
  type AstrologerChartResponse,
} from "@/lib/astrology-bundle";

export type NormalizedChartPoint = {
  id: string;
  label: string;
  sign: string | null;
  house: string | null;
  position: number | null;
  absPos: number | null;
  retrograde: boolean | null;
};

export type NormalizedChartPayload = {
  meta: {
    chartType: "natal";
    localDateTime: string | null;
    utcDateTime: string | null;
    timezone: string | null;
    birthTimePrecision: BirthTimePrecision;
    locationLabel: string;
  };
  points: {
    sun: NormalizedChartPoint;
    moon: NormalizedChartPoint;
    mercury: NormalizedChartPoint;
    venus: NormalizedChartPoint;
    mars: NormalizedChartPoint;
    ascendant: NormalizedChartPoint;
    mediumCoeli: NormalizedChartPoint;
  };
  houses: {
    cusps: number[];
    list: Array<{
      house: string | null;
      sign: string | null;
      position: number | null;
      absPos: number | null;
    }>;
  };
  aspects: {
    all: AstrologerAspect[];
    relevant: AstrologerAspect[];
  };
  derivedSignals: {
    angularPoints: string[];
    repeatedHouseThemes: string[];
    repeatedSignThemes: string[];
    confidenceDowngrades: string[];
  };
  inputContext: {
    country: string;
    postalCode?: string;
  };
};

function toNormalizedPoint(
  id: string,
  label: string,
  point?: AstrologerChartPoint,
): NormalizedChartPoint {
  return {
    id,
    label,
    sign: point?.sign ?? null,
    house: point?.house ?? null,
    position: point?.position ?? null,
    absPos: point?.abs_pos ?? null,
    retrograde: point?.retrograde ?? null,
  };
}

function toNormalizedHouse(house: AstrologerChartHouse) {
  return {
    house: house.house?.trim() ? house.house : null,
    sign: house.sign ?? null,
    position: house.position ?? null,
    absPos: house.abs_pos ?? null,
  };
}

function normalizeCountry(nation?: string) {
  const normalized = nation?.trim();

  if (!normalized) {
    return "Unknown";
  }

  const countryNames: Record<string, string> = {
    AU: "Australia",
    BR: "Brazil",
    CA: "Canada",
    CN: "China",
    DE: "Germany",
    ES: "Spain",
    FR: "France",
    GB: "United Kingdom",
    IN: "India",
    IT: "Italy",
    JP: "Japan",
    KR: "South Korea",
    MX: "Mexico",
    NZ: "New Zealand",
    RU: "Russia",
    SG: "Singapore",
    US: "United States",
  };

  if (normalized.length === 2) {
    return countryNames[normalized.toUpperCase()] ?? normalized.toUpperCase();
  }

  return normalized;
}

function buildDerivedSignals(
  subject: NonNullable<AstrologerChartResponse["chart_data"]>["subject"],
  birthTimePrecision: BirthTimePrecision,
) {
  const stablePoints = [
    subject?.sun,
    subject?.moon,
    subject?.mercury,
    subject?.venus,
    subject?.mars,
  ].filter((point): point is AstrologerChartPoint => Boolean(point));

  const repeatedHouseCounts = new Map<string, number>();
  const repeatedSignCounts = new Map<string, number>();

  for (const point of stablePoints) {
    if (point?.house) {
      repeatedHouseCounts.set(point.house, (repeatedHouseCounts.get(point.house) ?? 0) + 1);
    }

    if (point?.sign) {
      repeatedSignCounts.set(point.sign, (repeatedSignCounts.get(point.sign) ?? 0) + 1);
    }
  }

  const repeatedHouseThemes = [...repeatedHouseCounts.entries()]
    .filter(([, count]) => count > 1)
    .map(([house]) => house)
    .sort();

  const repeatedSignThemes = [...repeatedSignCounts.entries()]
    .filter(([, count]) => count > 1)
    .map(([sign]) => sign)
    .sort();

  const angularPoints =
    birthTimePrecision === "exact"
      ? [
          ...(subject?.ascendant ? ["ascendant"] : []),
          ...(subject?.medium_coeli ? ["mediumCoeli"] : []),
        ]
      : [];

  const confidenceDowngrades: string[] = [];
  if (birthTimePrecision !== "exact") {
    confidenceDowngrades.push(
      birthTimePrecision === "approximate"
        ? "Birth time is approximate, so time-sensitive chart claims should stay broad."
        : "Birth time is unknown, so time-sensitive chart claims should stay broad.",
    );
  }

  return {
    angularPoints,
    repeatedHouseThemes: birthTimePrecision === "exact" ? repeatedHouseThemes : [],
    repeatedSignThemes: birthTimePrecision === "exact" ? repeatedSignThemes : [],
    confidenceDowngrades,
  };
}

export function buildNormalizedChartPayload(input: {
  natalChart: AstrologerChartResponse;
  birthTimePrecision: BirthTimePrecision;
  locationLabel: string;
  postalCode?: string;
}): NormalizedChartPayload {
  const chartData = input.natalChart.chart_data;
  const subject = chartData?.subject;

  return {
    meta: {
      chartType: "natal",
      localDateTime: subject?.iso_formatted_local_datetime ?? null,
      utcDateTime: subject?.iso_formatted_utc_datetime ?? null,
      timezone: subject?.tz_str ?? null,
      birthTimePrecision: input.birthTimePrecision,
      locationLabel: input.locationLabel,
    },
    points: {
      sun: toNormalizedPoint("sun", "Sun", subject?.sun),
      moon: toNormalizedPoint("moon", "Moon", subject?.moon),
      mercury: toNormalizedPoint("mercury", "Mercury", subject?.mercury),
      venus: toNormalizedPoint("venus", "Venus", subject?.venus),
      mars: toNormalizedPoint("mars", "Mars", subject?.mars),
      ascendant: toNormalizedPoint("ascendant", "Ascendant", subject?.ascendant),
      mediumCoeli: toNormalizedPoint(
        "mediumCoeli",
        "Medium Coeli",
        subject?.medium_coeli,
      ),
    },
    houses: {
      cusps: [...(chartData?.houses?.cusps ?? [])],
      list: [...(chartData?.houses?.list ?? []).map(toNormalizedHouse)],
    },
    aspects: {
      all: [...(chartData?.aspects?.all ?? [])].map((aspect) => ({ ...aspect })),
      relevant: [...(chartData?.aspects?.relevant ?? [])].map((aspect) => ({ ...aspect })),
    },
    derivedSignals: buildDerivedSignals(subject, input.birthTimePrecision),
    inputContext: {
      country: normalizeCountry(subject?.nation),
      ...(input.postalCode ? { postalCode: input.postalCode } : {}),
    },
  };
}
