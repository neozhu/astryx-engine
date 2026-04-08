import type { ParsedReadingInput } from "@/lib/reading";

export type GeoNamesEntry = {
  geonameId: number;
  name: string;
  adminName1?: string;
  countryName?: string;
  countryCode?: string;
  lat: string;
  lng: string;
  population?: number;
};

export type ResolvedBirthLocation = {
  location: GeoNamesEntry;
  timezoneId: string;
};

export type AstrologerChartPoint = {
  sign?: string;
  house?: string;
  position?: number;
  abs_pos?: number;
  retrograde?: boolean | null;
};

export type AstrologerChartHouse = {
  sign?: string;
  house?: string;
  position?: number;
  abs_pos?: number;
};

export type AstrologerAspect = {
  p1_name?: string;
  p2_name?: string;
  aspect?: string;
  aspect_degrees?: number;
  orbit?: number;
};

export type AstrologerChartResponse = {
  status: string;
  chart_data?: {
    subject?: {
      city?: string;
      nation?: string;
      tz_str?: string;
      iso_formatted_local_datetime?: string;
      iso_formatted_utc_datetime?: string;
      sun?: AstrologerChartPoint;
      moon?: AstrologerChartPoint;
      mercury?: AstrologerChartPoint;
      venus?: AstrologerChartPoint;
      mars?: AstrologerChartPoint;
      ascendant?: AstrologerChartPoint;
      medium_coeli?: AstrologerChartPoint;
    };
    houses?: {
      cusps?: number[];
      list?: AstrologerChartHouse[];
    };
    aspects?: {
      all?: AstrologerAspect[];
      relevant?: AstrologerAspect[];
    };
  };
};

export type AstrologerContextResponse = AstrologerChartResponse & {
  context?: string;
};

export type AstrologyBundle = {
  normalizedBirth: ParsedReadingInput;
  chartRequest: {
    subject: {
      name: string;
      year: number;
      month: number;
      day: number;
      hour: number;
      minute: number;
      city: string;
      nation: string | undefined;
      longitude: number;
      latitude: number;
      timezone: string;
    };
  };
  asOf: string;
  natalChart: AstrologerChartResponse;
  natalContext: AstrologerContextResponse | null;
  transitChart: AstrologerChartResponse | null;
  transitContext: AstrologerContextResponse | null;
  natalSummary: Record<string, string>;
  transitSummary: {
    headline: string;
    highlights: string[];
  };
  futureWindowSummary: {
    windowLabel: string;
    summary: string;
  };
};

const signLabels: Record<string, string> = {
  Ari: "白羊座",
  Tau: "金牛座",
  Gem: "双子座",
  Can: "巨蟹座",
  Leo: "狮子座",
  Vir: "处女座",
  Lib: "天秤座",
  Sco: "天蝎座",
  Sag: "射手座",
  Cap: "摩羯座",
  Aqu: "水瓶座",
  Pis: "双鱼座",
};

export function humanizeSign(sign?: string) {
  if (!sign) {
    return "未知";
  }

  return signLabels[sign] ?? sign;
}

export function humanizeHouse(house?: string) {
  if (!house) {
    return "未记录宫位";
  }

  const houseLabels: Record<string, string> = {
    First_House: "第一宫",
    Second_House: "第二宫",
    Third_House: "第三宫",
    Fourth_House: "第四宫",
    Fifth_House: "第五宫",
    Sixth_House: "第六宫",
    Seventh_House: "第七宫",
    Eighth_House: "第八宫",
    Ninth_House: "第九宫",
    Tenth_House: "第十宫",
    Eleventh_House: "第十一宫",
    Twelfth_House: "第十二宫",
  };

  return houseLabels[house] ?? house.replaceAll("_", " ");
}

function parseCoordinate(
  value: string,
  min: number,
  max: number,
) {
  const parsed = Number.parseFloat(value);

  if (!Number.isFinite(parsed) || parsed < min || parsed > max) {
    throw new Error(`Invalid location coordinates.`);
  }

  return parsed;
}

function normalizeBirthInput(input: ParsedReadingInput): ParsedReadingInput {
  if (input.birthTimePrecision !== "unknown") {
    return input;
  }

  return {
    ...input,
    hour: null,
    minute: null,
  };
}

function buildChartTime(input: ParsedReadingInput) {
  if (input.birthTimePrecision === "exact") {
    if (input.hour === null || input.minute === null) {
      throw new Error("Exact birth time requires hour and minute.");
    }

    return { hour: input.hour, minute: input.minute };
  }

  if (input.birthTimePrecision === "unknown") {
    return {
      hour: 12,
      minute: 0,
    };
  }

  return {
    hour: input.hour ?? 12,
    minute: input.minute ?? 0,
  };
}

async function fetchJson<T>(url: string, init?: RequestInit) {
  const response = await fetch(url, {
    ...init,
    cache: "no-store",
  });

  if (!response.ok) {
    throw new Error(`Request failed with ${response.status}`);
  }

  return (await response.json()) as T;
}

type AstrologyProvider = "rapidapi" | "kerykeion-local";

function getAstrologyProvider(): AstrologyProvider {
  return process.env.ASTROLOGY_PROVIDER === "kerykeion-local"
    ? "kerykeion-local"
    : "rapidapi";
}

export function buildAstrologerPayload(
  input: ParsedReadingInput,
  location: GeoNamesEntry,
  timezoneId: string,
) {
  const chartTime = buildChartTime(input);

  return {
    subject: {
      name: "Astryx Reading",
      year: input.year,
      month: input.month,
      day: input.day,
      hour: chartTime.hour,
      minute: chartTime.minute,
      city: location.name,
      nation: location.countryCode,
      longitude: parseCoordinate(location.lng, -180, 180),
      latitude: parseCoordinate(location.lat, -90, 90),
      timezone: timezoneId,
    },
  };
}

async function fetchAstrologerChart<T>(
  endpointPath: string,
  input: ParsedReadingInput,
  location: GeoNamesEntry,
  timezoneId: string,
  asOf?: string,
) {
  if (getAstrologyProvider() === "kerykeion-local") {
    const localApiUrl = process.env.LOCAL_ASTROLOGY_API_URL?.trim();

    if (!localApiUrl) {
      throw new Error("Missing LOCAL_ASTROLOGY_API_URL");
    }

    if (endpointPath !== "/api/v5/chart-data/birth-chart") {
      throw new Error(`Unsupported local astrology endpoint: ${endpointPath}`);
    }

    return fetchJson<T>(`${localApiUrl}/api/v1/chart/natal`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify(buildAstrologerPayload(input, location, timezoneId)),
    });
  }

  const apiKey = process.env.RAPIDAPI_KEY;
  const rapidApiHost = process.env.RAPIDAPI_HOST ?? "astrologer.p.rapidapi.com";

  if (!apiKey) {
    throw new Error("Missing RAPIDAPI_KEY");
  }

  const payload = {
    ...buildAstrologerPayload(input, location, timezoneId),
    ...(asOf ? { transit_at: asOf } : {}),
  };

  return fetchJson<T>(`https://${rapidApiHost}${endpointPath}`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "X-RapidAPI-Key": apiKey,
      "X-RapidAPI-Host": rapidApiHost,
    },
    body: JSON.stringify(payload),
  });
}

async function fetchNatalChart(
  input: ParsedReadingInput,
  location: GeoNamesEntry,
  timezoneId: string,
) {
  return fetchAstrologerChart<AstrologerChartResponse>(
    "/api/v5/chart-data/birth-chart",
    input,
    location,
    timezoneId,
  );
}

async function fetchNatalContext(
  input: ParsedReadingInput,
  location: GeoNamesEntry,
  timezoneId: string,
) {
  return fetchAstrologerChart<AstrologerContextResponse>(
    "/api/v5/context/birth-chart",
    input,
    location,
    timezoneId,
  );
}

async function fetchTransitChart(
  input: ParsedReadingInput,
  location: GeoNamesEntry,
  timezoneId: string,
  asOf: string,
) {
  return fetchAstrologerChart<AstrologerChartResponse>(
    "/api/v5/chart-data/transit",
    input,
    location,
    timezoneId,
    asOf,
  );
}

async function fetchTransitContext(
  input: ParsedReadingInput,
  location: GeoNamesEntry,
  timezoneId: string,
  asOf: string,
) {
  return fetchAstrologerChart<AstrologerContextResponse>(
    "/api/v5/context/transit",
    input,
    location,
    timezoneId,
    asOf,
  );
}

function decodeXmlEntities(value: string) {
  return value
    .replaceAll("&amp;", "&")
    .replaceAll("&lt;", "<")
    .replaceAll("&gt;", ">")
    .replaceAll("&quot;", '"')
    .replaceAll("&apos;", "'")
    .replaceAll("&#39;", "'");
}

export function extractAstrologerContextParagraphs(context: string) {
  const normalized = decodeXmlEntities(
    context
      .replace(/<\?xml[\s\S]*?\?>/gi, " ")
      .replace(/<!--[\s\S]*?-->/g, " ")
      .replace(/<active_points\b[^>]*>[\s\S]*?<\/active_points>/gi, " ")
      .replace(/<active_aspects\b[^>]*>[\s\S]*?<\/active_aspects>/gi, " ")
      .replace(/<br\s*\/?>/gi, "\n")
      .replace(
        /<\/(paragraph|p|section|entry|item|interpretation|line|li|div)>/gi,
        "\n\n",
      )
      .replace(/<[^>]+>/g, " "),
  )
    .replace(/\r/g, "")
    .replace(/[ \t]+\n/g, "\n")
    .replace(/\n[ \t]+/g, "\n")
    .trim();

  if (!normalized) {
    return [];
  }

  const paragraphCandidates = normalized
    .split(/\n{2,}/)
    .map((paragraph) => paragraph.replace(/\s+/g, " ").trim())
    .filter(Boolean);

  if (paragraphCandidates.length > 0) {
    return paragraphCandidates;
  }

  return normalized
    .split(/(?<=[.!?])\s+(?=[A-Z])/)
    .map((sentence) => sentence.trim())
    .filter(Boolean);
}

function isTimeSensitiveParagraph(paragraph: string) {
  return /\b(rising|ascendant|midheaven|mc\b|house|houses|first impression|public direction|exact time)\b/i.test(
    paragraph,
  );
}

function isUsableContextParagraph(paragraph: string) {
  return paragraph.trim().length >= 24;
}

export function buildFallbackReadingBody(
  input: ParsedReadingInput,
  chartResponse: AstrologerChartResponse,
) {
  const subject = chartResponse.chart_data?.subject;

  if (!subject?.sun?.sign || !subject.moon?.sign || !subject.venus?.sign) {
    throw new Error("Missing chart facts");
  }

  const sun = humanizeSign(subject.sun.sign);
  const moon = humanizeSign(subject.moon.sign);
  const venus = humanizeSign(subject.venus.sign);
  const hasExactRelationshipDetails = Boolean(subject.mars?.sign);
  const hasExactDirectionDetails = Boolean(
    subject.ascendant?.sign && subject.medium_coeli?.sign,
  );
  const exactTimeLimitedDirection =
    "当前数据里仍缺少部分时间敏感的星盘细节，所以这一部分会保持更宽一些的判断。";

  if (input.birthTimePrecision === "exact") {
    return [
      `${sun}太阳落在${humanizeHouse(subject.sun.house)}，${moon}月亮落在${humanizeHouse(subject.moon.house)}，把好奇心和更容易感受环境的情绪节奏放在同一条主线上。你通常会先快速靠近知识与意义，再慢一些消化周围氛围。`,
      hasExactRelationshipDetails
        ? `${venus}金星与${humanizeSign(subject.mars?.sign)}火星共同塑造你在亲密关系里的依恋方式与行动方式。感情上你需要稳定与信任，一旦情绪上确认真实，行动节奏反而会明显加快。`
        : `${venus}金星会用更宽泛的方式勾勒你在亲密关系里如何表达喜欢与行动。`,
      hasExactDirectionDetails
        ? `${humanizeSign(subject.ascendant?.sign)}上升与${humanizeSign(subject.medium_coeli?.sign)}中天，让你的外在气质与公开发展方向更容易被看见。这个星盘指向一种表面平衡、内里更有保护性的外在风格。`
        : exactTimeLimitedDirection,
    ];
  }

  const softenedIntro =
    input.birthTimePrecision === "approximate"
      ? `这份解读会以你的${sun}太阳与${moon}月亮为核心，同时温和处理所有时间敏感细节。`
      : `这份解读会以你的${sun}太阳与${moon}月亮为核心，并继续弱化所有时间敏感落点。`;

  const direction =
    input.birthTimePrecision === "approximate"
      ? "你的外在发展线会比精确星盘的说法更宽一些。"
      : "在出生时间被确认前，你的外在发展线会有意保持宽泛。";

  return [
    softenedIntro,
    `${sun}太阳与${moon}月亮会让解读聚焦在你的气质与本能层面。${venus}金星会用更宽泛的方式勾勒你在亲密关系里如何表达喜欢与行动。`,
    direction,
  ];
}

export function buildPreferredReadingBody(
  input: ParsedReadingInput,
  chartResponse: AstrologerChartResponse,
  natalContext: AstrologerContextResponse | null,
) {
  const fallbackBody = buildFallbackReadingBody(input, chartResponse);
  const context = natalContext?.status === "OK" ? natalContext.context : undefined;

  if (!context) {
    return fallbackBody;
  }

  const extractedParagraphs = extractAstrologerContextParagraphs(context);

  if (extractedParagraphs.length === 0) {
    return fallbackBody;
  }

  if (input.birthTimePrecision === "exact") {
    return extractedParagraphs;
  }

  const filteredParagraphs = extractedParagraphs.filter(
    (paragraph) =>
      !isTimeSensitiveParagraph(paragraph) && isUsableContextParagraph(paragraph),
  );

  if (filteredParagraphs.length === 0) {
    return fallbackBody;
  }

  return filteredParagraphs;
}

function summarizeNatalChart(chart: AstrologerChartResponse) {
  return {
    sun: humanizeSign(chart.chart_data?.subject?.sun?.sign),
    moon: humanizeSign(chart.chart_data?.subject?.moon?.sign),
    venus: humanizeSign(chart.chart_data?.subject?.venus?.sign),
  };
}

function summarizeCurrentTransits(
  chart: AstrologerChartResponse | null,
  context: AstrologerContextResponse | null,
) {
  const contextParagraphs = extractAstrologerContextParagraphs(context?.context ?? "");
  const hasTransitSigns = Boolean(
    chart?.chart_data?.subject?.sun?.sign || chart?.chart_data?.subject?.moon?.sign,
  );

  if ((!chart && !context) || (!hasTransitSigns && contextParagraphs.length === 0)) {
    return {
      headline:
        "当前行运数据暂时不可用，所以这部分总结会先以本命盘为稳定参照。",
      highlights: [],
    };
  }
  const sun = humanizeSign(chart?.chart_data?.subject?.sun?.sign);
  const moon = humanizeSign(chart?.chart_data?.subject?.moon?.sign);

  return {
    headline:
      contextParagraphs[0] ??
      `当前行运会更突出${sun}式的推进感，同时放大${moon}式的情绪处理节奏。`,
    highlights:
      chart === null
        ? []
        : [`行运太阳：${sun}`, `行运月亮：${moon}`],
  };
}

function summarizeFutureWindow(
  chart: AstrologerChartResponse | null,
  context: AstrologerContextResponse | null,
) {
  const contextParagraphs = extractAstrologerContextParagraphs(context?.context ?? "");
  const hasTransitSigns = Boolean(
    chart?.chart_data?.subject?.sun?.sign || chart?.chart_data?.subject?.moon?.sign,
  );

  if ((!chart && !context) || (!hasTransitSigns && contextParagraphs.length === 0)) {
    return {
      windowLabel: "未来 4-8 周",
      summary:
        "未来行运节奏暂时不可用，所以接下来几周先以本命盘的稳定结构作为参照。",
    };
  }

  const transitSummary = summarizeCurrentTransits(chart, context);
  const sun = humanizeSign(chart?.chart_data?.subject?.sun?.sign);
  const moon = humanizeSign(chart?.chart_data?.subject?.moon?.sign);

  return {
    windowLabel: "未来 4-8 周",
    summary:
      contextParagraphs[1] ??
      (chart
        ? `未来 4-8 周，${sun}主题会继续累积推进感，而${moon}主题更需要稳定节奏来消化。`
        : transitSummary.headline),
  };
}

async function fetchOptionalTransitChart(
  input: ParsedReadingInput,
  location: GeoNamesEntry,
  timezoneId: string,
  asOf: string,
) {
  try {
    const chart = await fetchTransitChart(input, location, timezoneId, asOf);
    return chart.status === "OK" ? chart : null;
  } catch {
    return null;
  }
}

async function fetchOptionalTransitContext(
  input: ParsedReadingInput,
  location: GeoNamesEntry,
  timezoneId: string,
  asOf: string,
) {
  try {
    const context = await fetchTransitContext(input, location, timezoneId, asOf);
    return context.status === "OK" ? context : null;
  } catch {
    return null;
  }
}

export async function buildAstrologyBundle(
  input: ParsedReadingInput,
  resolvedLocation: ResolvedBirthLocation,
  asOfOverride?: string,
): Promise<AstrologyBundle> {
  const normalizedBirth = normalizeBirthInput(input);
  const provider = getAstrologyProvider();
  const asOf = asOfOverride ?? new Date().toISOString();
  const chartRequest = buildAstrologerPayload(
    normalizedBirth,
    resolvedLocation.location,
    resolvedLocation.timezoneId,
  );

  const natalChart = await fetchNatalChart(
    normalizedBirth,
    resolvedLocation.location,
    resolvedLocation.timezoneId,
  );

  const natalContext =
    provider === "rapidapi"
      ? await fetchNatalContext(
          normalizedBirth,
          resolvedLocation.location,
          resolvedLocation.timezoneId,
        ).catch(() => null)
      : null;

  const transitChart =
    provider === "rapidapi"
      ? await fetchOptionalTransitChart(
          normalizedBirth,
          resolvedLocation.location,
          resolvedLocation.timezoneId,
          asOf,
        )
      : null;

  const transitContext =
    provider === "rapidapi"
      ? await fetchOptionalTransitContext(
          normalizedBirth,
          resolvedLocation.location,
          resolvedLocation.timezoneId,
          asOf,
        )
      : null;

  return {
    normalizedBirth,
    chartRequest,
    asOf,
    natalChart,
    natalContext,
    transitChart,
    transitContext,
    natalSummary: summarizeNatalChart(natalChart),
    transitSummary: summarizeCurrentTransits(transitChart, transitContext),
    futureWindowSummary: summarizeFutureWindow(transitChart, transitContext),
  };
}
