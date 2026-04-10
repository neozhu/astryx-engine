import {
  buildAstrologyBundle,
  buildPreferredReadingBody,
  humanizeHouse,
  humanizeSign,
  type AstrologerChartResponse,
  type AstrologerContextResponse,
  type GeoNamesEntry,
} from "@/lib/astrology-bundle";
import {
  buildExplanationReading,
  buildFollowUpAnswer,
  buildInitialAiReading,
  buildStructuredAnalysis,
  buildStructuredForecast,
  type AiReadingClient,
  type AiReadingTurn,
  type ExplanationViewModel,
  type StructuredAnalysisViewModel,
  type StructuredForecastViewModel,
} from "@/lib/ai-reading";
import {
  buildNormalizedChartPayload,
  type NormalizedChartPayload,
} from "@/lib/chart-payload";
import {
  rotateSessionToken,
  signSessionToken,
  verifySessionToken,
} from "@/lib/reading-session";

type SearchParamValue = string | string[] | undefined;

export type BirthTimePrecision = "exact" | "approximate" | "unknown";

type RawReadingInput = Record<string, SearchParamValue>;

function isRecord(value: unknown): value is Record<string, unknown> {
  return !!value && typeof value === "object" && !Array.isArray(value);
}

function isSearchParamValue(value: unknown): value is SearchParamValue {
  return (
    typeof value === "string" ||
    value === undefined ||
    (Array.isArray(value) && value.every((item) => typeof item === "string"))
  );
}

export function parseReadingRequestBody(input: unknown): RawReadingInput {
  if (!isRecord(input)) {
    throw new Error("Invalid reading request.");
  }

  const parsed: RawReadingInput = {};

  for (const [key, value] of Object.entries(input)) {
    if (!isSearchParamValue(value)) {
      throw new Error("Invalid reading request.");
    }

    parsed[key] = value;
  }

  return parsed;
}

export type FollowUpRequestBody = {
  sessionToken: string;
  topic: FollowUpTopic;
  question: string;
  priorTurns: FollowUpTurn[];
};

export function parseFollowUpRequestBody(input: unknown): FollowUpRequestBody {
  if (!isRecord(input)) {
    throw new Error("Invalid follow-up request.");
  }

  const sessionToken =
    typeof input.sessionToken === "string" ? input.sessionToken.trim() : "";
  const topic = typeof input.topic === "string" ? input.topic.trim() : "";
  const question =
    typeof input.question === "string" ? input.question.trim() : "";

  const priorTurns = Array.isArray(input.priorTurns)
    ? input.priorTurns
    : [];

  if (
    !sessionToken ||
    (topic !== "love" &&
      topic !== "career-change" &&
      topic !== "anxiety" &&
      topic !== "custom")
  ) {
    throw new Error("Invalid follow-up request.");
  }

  const parsedTurns = priorTurns.map((turn) => {
    if (
      !isRecord(turn) ||
      (turn.role !== "user" && turn.role !== "assistant") ||
      !Array.isArray(turn.paragraphs) ||
      !turn.paragraphs.every((paragraph) => typeof paragraph === "string")
    ) {
      throw new Error("Invalid follow-up request.");
    }

    return {
      role: turn.role,
      paragraphs: turn.paragraphs.map((paragraph) => paragraph.trim()).filter(Boolean),
    } as FollowUpTurn;
  });

  if (
    parsedTurns.some((turn) => turn.paragraphs.length === 0) ||
    (topic === "custom" && !question)
  ) {
    throw new Error("Invalid follow-up request.");
  }

  return {
    sessionToken,
    topic,
    question,
    priorTurns: parsedTurns,
  };
}

export type ParsedReadingInput = {
  year: number;
  month: number;
  day: number;
  hour: number | null;
  minute: number | null;
  postalCode?: string;
  city: string;
  country: string;
  birthTimePrecision: BirthTimePrecision;
};

export type ReadingViewModel = {
  body: string[];
  title?: string;
  certaintyLabel?: string;
  certaintyDescription?: string;
  trustItems?: string[];
  sections?: Array<{
    title: string;
    body: string;
  }>;
  evidence?: Array<{
    label: string;
    value: string;
  }>;
};

export type PrimaryReadingViewModel = {
  title: string;
  summary: string;
  highlights: string[];
  chartEvidence: string[];
};

export const FOLLOW_UP_OPTIONS = [
  "love",
  "career-change",
  "anxiety",
] as const;

export type FollowUpOption = (typeof FOLLOW_UP_OPTIONS)[number];
export type FollowUpTopic = FollowUpOption | "custom";

export type FollowUpTurn = {
  role: "user" | "assistant";
  paragraphs: string[];
};

export type LocationCandidate = {
  geonameId: number;
  label: string;
};

export type ReadingUnavailableCode =
  | "invalid-input"
  | "rate-limited"
  | "service-unavailable";

export type ReadingOutcome =
  | {
      kind: "ready";
      primary: PrimaryReadingViewModel;
      explanation: ExplanationViewModel;
      analysis: StructuredAnalysisViewModel;
      forecast: StructuredForecastViewModel;
      reading: ReadingViewModel;
      sessionToken: string;
      followUpOptions: FollowUpOption[];
      remainingFollowUps: number;
    }
  | {
      kind: "location-match";
      city: string;
      country: string;
      postalCode?: string;
      candidates: LocationCandidate[];
    }
  | {
      kind: "reading-unavailable";
      code?: ReadingUnavailableCode;
      message?: string;
      retryable?: boolean;
    };

export type FollowUpOutcome =
  | {
      kind: "follow-up-ready";
      sessionToken: string;
      answer: {
        paragraphs: string[];
      };
      remainingFollowUps: number;
      topic: FollowUpTopic;
    }
  | {
      kind: "follow-up-unavailable";
      message: string;
      retryable: boolean;
      remainingFollowUps: number;
    };

type ResolveReadingFlowOptions = {
  aiClient?: AiReadingClient;
};

type ResolveFollowUpOptions = {
  aiClient?: AiReadingClient;
};

const MAX_FOLLOW_UPS = 3;

function buildReadingUnavailable(
  overrides: Omit<Extract<ReadingOutcome, { kind: "reading-unavailable" }>, "kind"> = {},
): Extract<ReadingOutcome, { kind: "reading-unavailable" }> {
  return {
    kind: "reading-unavailable",
    ...overrides,
  };
}

export function buildReadingUnavailableFromError(error: unknown) {
  const message = error instanceof Error ? error.message : "";

  if (/Postal code must be six digits\./i.test(message)) {
    return buildReadingUnavailable({
      code: "invalid-input",
      message: "请输入 6 位中国邮编。",
      retryable: false,
    });
  }

  if (
    /Birth time precision is required\.|Birth date and place are required\.|Hour must be between 0 and 23\.|Minute must be between 0 and 59\.|Exact birth time requires hour and minute\.|Invalid reading request\./i.test(
      message,
    )
  ) {
    return buildReadingUnavailable({
      code: "invalid-input",
      message: "请检查出生日期、时间和邮编后再试一次。",
      retryable: false,
    });
  }

  if (/Request failed with 429|Too Many Requests/i.test(message)) {
    return buildReadingUnavailable({
      code: "rate-limited",
      message: "当前星盘服务请求过多，请稍后再试。",
      retryable: true,
    });
  }

  if (
    /Missing GEONAMES_USERNAME|Missing LOCAL_ASTROLOGY_API_URL|Missing OPENAI_API_KEY|Invalid AI reading schema|model unavailable|model_not_found|does not exist|Request failed with 5\d{2}|fetch failed/i.test(
      message,
    )
  ) {
    return buildReadingUnavailable({
      code: "service-unavailable",
      message: "当前服务暂时不可用，请稍后再试。",
      retryable: true,
    });
  }

  return buildReadingUnavailable();
}

export function getReadingOutcomeStatus(result: ReadingOutcome) {
  if (result.kind !== "reading-unavailable") {
    return 200;
  }

  if (result.code === "invalid-input") {
    return 400;
  }

  if (result.code === "rate-limited") {
    return 429;
  }

  if (result.retryable) {
    return 503;
  }

  return 200;
}

function takeFirst(value: SearchParamValue) {
  return Array.isArray(value) ? value[0] : value;
}

function parseInteger(value: SearchParamValue) {
  const raw = takeFirst(value)?.trim();

  if (!raw) {
    return null;
  }

  if (!/^-?\d+$/.test(raw)) {
    return null;
  }

  const parsed = Number(raw);

  return Number.isFinite(parsed) ? parsed : null;
}

function parseText(value: SearchParamValue) {
  return takeFirst(value)?.trim() ?? "";
}

function normalizeText(value: string) {
  return value.trim().toLowerCase();
}

function isWithinRange(
  value: number | null,
  minimum: number,
  maximum: number,
): value is number {
  return value !== null && value >= minimum && value <= maximum;
}

function isValidCalendarDate(year: number, month: number, day: number) {
  const candidate = new Date(Date.UTC(year, month - 1, day));

  return (
    candidate.getUTCFullYear() === year &&
    candidate.getUTCMonth() === month - 1 &&
    candidate.getUTCDate() === day
  );
}

function matchesRequestedCountry(
  location: Pick<GeoNamesEntry, "countryName" | "countryCode">,
  requestedCountry: string,
) {
  const normalizedRequestedCountry = normalizeText(requestedCountry);

  return (
    normalizeText(location.countryName ?? "") === normalizedRequestedCountry ||
    normalizeText(location.countryCode ?? "") === normalizedRequestedCountry
  );
}

function matchesRequestedCity(entryName: string, requestedCity: string) {
  const normalizedEntryName = normalizeText(entryName);
  const normalizedRequestedCity = normalizeText(requestedCity);

  return (
    normalizedEntryName === normalizedRequestedCity ||
    normalizedEntryName.startsWith(`${normalizedRequestedCity},`) ||
    normalizedEntryName.startsWith(`${normalizedRequestedCity} `)
  );
}

function isExactRequestedCity(entryName: string, requestedCity: string) {
  return normalizeText(entryName) === normalizeText(requestedCity);
}

function buildPlaceLabel(location: GeoNamesEntry) {
  return [location.name, location.adminName1, location.countryName]
    .filter(Boolean)
    .join(", ");
}

function isLocationCandidate(value: unknown): value is LocationCandidate {
  return (
    isRecord(value) &&
    typeof value.geonameId === "number" &&
    Number.isFinite(value.geonameId) &&
    typeof value.label === "string"
  );
}

export function parseReadingSearchParams(
  input: RawReadingInput,
): ParsedReadingInput {
  const year = parseInteger(input.year);
  const month = parseInteger(input.month);
  const day = parseInteger(input.day);
  const city = parseText(input.city);
  const country = parseText(input.country);
  const postalCode = parseText(input.postalCode);
  const requestedPrecision = parseText(input.birthTimePrecision);
  const birthTimePrecision: BirthTimePrecision =
    requestedPrecision === "approximate" || requestedPrecision === "unknown"
      ? requestedPrecision
      : "exact";

  if (
    !isWithinRange(year, 1, 9999) ||
    !isWithinRange(month, 1, 12) ||
    !isWithinRange(day, 1, 31) ||
    !isValidCalendarDate(year, month, day)
  ) {
    throw new Error("Birth date and place are required.");
  }

  const usingPostalCode = Boolean(postalCode);

  if (usingPostalCode && !/^\d{6}$/.test(postalCode)) {
    throw new Error("Postal code must be six digits.");
  }

  if (!usingPostalCode && (!city || !country)) {
    throw new Error("Birth date and place are required.");
  }

  const parsedHour = parseInteger(input.hour);
  const parsedMinute = parseInteger(input.minute);

  const rawHour = takeFirst(input.hour)?.trim();
  const rawMinute = takeFirst(input.minute)?.trim();

  if (rawHour && !isWithinRange(parsedHour, 0, 23)) {
    throw new Error("Hour must be between 0 and 23.");
  }

  if (rawMinute && !isWithinRange(parsedMinute, 0, 59)) {
    throw new Error("Minute must be between 0 and 59.");
  }

  const parsed: ParsedReadingInput = {
    year,
    month,
    day,
    hour: parsedHour,
    minute: parsedMinute,
    postalCode: usingPostalCode ? postalCode : undefined,
    city: usingPostalCode ? "" : city,
    country: usingPostalCode ? "China" : country,
    birthTimePrecision,
  };

  if (
    parsed.birthTimePrecision === "exact" &&
    (parsed.hour === null || parsed.minute === null)
  ) {
    throw new Error("Exact birth time requires hour and minute.");
  }

  return parsed;
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

async function resolveLocation(
  input: ParsedReadingInput,
): Promise<
  | {
      kind: "resolved";
      location: GeoNamesEntry;
      timezoneId: string;
    }
  | {
      kind: "location-match";
      candidates: LocationCandidate[];
    }
  | {
      kind: "reading-unavailable";
    }
> {
  const username = process.env.GEONAMES_USERNAME;

  if (!username) {
    return { kind: "reading-unavailable" };
  }

  if (input.postalCode) {
    const lookupUrl =
      `http://api.geonames.org/postalCodeLookupJSON?postalcode=${encodeURIComponent(input.postalCode)}` +
      `&country=CN&maxRows=10&username=${encodeURIComponent(username)}`;

    const lookupResponse = await fetchJson<{
      postalcodes?: Array<{
        postalCode?: string;
        placeName?: string;
        adminName1?: string;
        countryCode?: string;
        lat?: string;
        lng?: string;
      }>;
    }>(lookupUrl);

    const postalCandidates = (lookupResponse.postalcodes ?? [])
      .filter(
        (entry) =>
          entry.placeName &&
          entry.lat &&
          entry.lng &&
          (entry.countryCode ?? "CN") === "CN",
      )
      .map((entry, index) => ({
        geonameId: index + 1,
        name: entry.placeName ?? "",
        adminName1: entry.adminName1,
        countryName: "中国",
        countryCode: entry.countryCode ?? "CN",
        lat: entry.lat ?? "",
        lng: entry.lng ?? "",
      }));

    if (postalCandidates.length === 0) {
      return { kind: "reading-unavailable" };
    }

    if (postalCandidates.length > 1) {
      return {
        kind: "location-match",
        candidates: postalCandidates.map((candidate) => ({
          geonameId: candidate.geonameId,
          label: buildPlaceLabel(candidate),
        })),
      };
    }

    const [primary] = postalCandidates;
    const timezoneUrl =
      `http://api.geonames.org/timezoneJSON?lat=${encodeURIComponent(primary.lat)}` +
      `&lng=${encodeURIComponent(primary.lng)}` +
      `&username=${encodeURIComponent(username)}`;

    const timezoneResponse = await fetchJson<{
      timezoneId?: string;
    }>(timezoneUrl);

    if (!timezoneResponse.timezoneId) {
      return { kind: "reading-unavailable" };
    }

    return {
      kind: "resolved",
      location: primary,
      timezoneId: timezoneResponse.timezoneId,
    };
  }

  const query = encodeURIComponent(`${input.city}, ${input.country}`);
  const searchUrl =
    `http://api.geonames.org/searchJSON?q=${query}` +
    `&maxRows=5&orderby=population&username=${encodeURIComponent(username)}`;

  const searchResponse = await fetchJson<{
    geonames?: GeoNamesEntry[];
  }>(searchUrl);

  const countryMatchedCandidates = (searchResponse.geonames ?? []).filter((entry) =>
    matchesRequestedCountry(entry, input.country),
  );

  const matchedCandidates = countryMatchedCandidates.filter((entry) =>
    matchesRequestedCity(entry.name, input.city),
  );

  const allCandidates =
    matchedCandidates.filter((entry) =>
      isExactRequestedCity(entry.name, input.city),
    ) || [];

  if (allCandidates.length > 1) {
    const candidates = [...allCandidates]
      .sort((left, right) => (right.population ?? 0) - (left.population ?? 0))
      .map((candidate) => ({
        geonameId: candidate.geonameId,
        label: buildPlaceLabel(candidate),
      }));

    return {
      kind: "location-match",
      candidates,
    };
  }

  const candidatePool =
    allCandidates.length > 0 ? allCandidates : matchedCandidates;

  if (candidatePool.length === 0) {
    return { kind: "reading-unavailable" };
  }

  const candidates = [...candidatePool].sort(
    (left, right) => (right.population ?? 0) - (left.population ?? 0),
  );

  const [primary, secondary] = candidates;
  const primaryPopulation = primary?.population ?? 0;
  const secondaryPopulation = secondary?.population ?? 0;

  if (
    secondary &&
    primaryPopulation > 0 &&
    secondaryPopulation > 0 &&
    secondaryPopulation / primaryPopulation >= 0.45
  ) {
    return {
      kind: "location-match",
      candidates: candidates.map((candidate) => ({
        geonameId: candidate.geonameId,
        label: buildPlaceLabel(candidate),
      })),
    };
  }

  const timezoneUrl =
    `http://api.geonames.org/timezoneJSON?lat=${encodeURIComponent(primary.lat)}` +
    `&lng=${encodeURIComponent(primary.lng)}` +
    `&username=${encodeURIComponent(username)}`;

  const timezoneResponse = await fetchJson<{
    timezoneId?: string;
  }>(timezoneUrl);

  if (!timezoneResponse.timezoneId) {
    return { kind: "reading-unavailable" };
  }

  return {
    kind: "resolved",
    location: primary,
    timezoneId: timezoneResponse.timezoneId,
  };
}

function buildReadingViewModel(
  input: ParsedReadingInput,
  location: GeoNamesEntry,
  timezoneId: string,
  chartResponse: AstrologerChartResponse,
  natalContext: AstrologerContextResponse | null,
): ReadingViewModel {
  const subject = chartResponse.chart_data?.subject;

  if (!subject?.sun?.sign || !subject.moon?.sign || !subject.venus?.sign) {
    throw new Error("Missing chart facts");
  }

  const sun = humanizeSign(subject.sun.sign);
  const moon = humanizeSign(subject.moon.sign);
  const venus = humanizeSign(subject.venus.sign);
  const placeLabel = buildPlaceLabel(location);
  const localDatetime = subject.iso_formatted_local_datetime ?? "Unavailable";
  const utcDatetime = subject.iso_formatted_utc_datetime ?? "Unavailable";

  const exactTime = input.birthTimePrecision === "exact";
  const approximateTime = input.birthTimePrecision === "approximate";
  const certaintyLabel = exactTime
    ? "准确出生时间"
    : approximateTime
      ? "大概出生时间"
      : "未知出生时间";

  const certaintyDescription = exactTime
    ? "由于出生时间准确，解读会纳入对时间较敏感的星盘信息。"
    : approximateTime
      ? "由于出生时间只有大概范围，解读会对时间敏感的信息保持克制。"
      : "由于出生时间未知，解读会继续弱化所有时间敏感的信息。";

  const hasExactRelationshipDetails = Boolean(subject.mars?.sign);
  const hasExactDirectionDetails = Boolean(
    subject.ascendant?.sign && subject.medium_coeli?.sign,
  );
  const canUseExactTitle = exactTime && Boolean(subject.ascendant?.sign);
  const exactTimeLimitedTitle = `这份解读会以你的${sun}太阳与${moon}月亮为核心，因为当前数据里仍缺少部分时间敏感的星盘细节。`;
  const exactTimeLimitedDirection =
    "当前数据仍缺少部分时间敏感的星盘细节，所以这一部分会保持更宽泛的解读。";

  const title = exactTime
    ? canUseExactTitle
      ? `${sun}太阳、${moon}月亮与${humanizeSign(subject.ascendant?.sign)}上升，让你的星盘同时带着行动感与社交分寸。`
      : exactTimeLimitedTitle
    : approximateTime
      ? `这份解读会以你的${sun}太阳与${moon}月亮为核心，同时温和处理所有时间敏感细节。`
      : `这份解读会以你的${sun}太阳与${moon}月亮为核心，并继续弱化所有时间敏感落点。`;

  const nonExactCorePattern = `${sun}太阳与${moon}月亮会让解读聚焦在你的气质与本能层面，同时弱化时间敏感细节。`;
  const nonExactRelationships = `${venus}金星会用更宽泛的方式勾勒你在亲密关系里如何表达喜欢与行动。`;
  const nonExactDirection = approximateTime
    ? "你的外在发展线会比精确星盘的说法更宽一些。"
    : "在出生时间被确认前，你的外在发展线会有意保持宽泛。";

  const sections = [
    {
      title: "核心模式",
      body: exactTime
        ? `${sun}太阳落在${humanizeHouse(subject.sun.house)}，${moon}月亮落在${humanizeHouse(subject.moon.house)}，把好奇心和更容易感受环境的情绪节奏结合在一起。你通常会先快速靠近知识与意义，再慢一些消化周围氛围。`
        : nonExactCorePattern,
    },
    {
      title: "关系模式",
      body: exactTime && hasExactRelationshipDetails
        ? `${venus}金星与${humanizeSign(subject.mars?.sign)}火星共同塑造你在亲密关系里的依恋方式与行动方式。感情上你需要稳定与信任，一旦情绪上确认真实，行动节奏反而会明显加快。`
        : nonExactRelationships,
    },
    {
      title: "发展方向",
      body: exactTime && hasExactDirectionDetails
        ? `${humanizeSign(subject.ascendant?.sign)}上升与${humanizeSign(subject.medium_coeli?.sign)}中天，让你的外在气质与公开发展方向更容易被看见。这个星盘指向一种表面平衡、内里更有保护性的外在风格。`
        : exactTime
          ? exactTimeLimitedDirection
          : nonExactDirection,
    },
  ];

  const body = buildPreferredReadingBody(input, chartResponse, natalContext);

  return {
    body,
    title,
    certaintyLabel,
    certaintyDescription,
    trustItems: [
      `出生地已标准化为${placeLabel}。`,
      `时区已锁定为${timezoneId}。`,
      input.birthTimePrecision === "unknown"
        ? "仅为兼容接口，系统使用了一个中性的兜底时间。"
        : "星盘事实数据来自官方 Astrologer API。",
    ],
    sections,
    ...(!exactTime
      ? {
          evidence: [
            { label: "地点", value: placeLabel },
            { label: "时区", value: timezoneId },
            { label: "本地星盘时间", value: "暂不可用" },
            { label: "UTC 时间", value: "暂不可用" },
            { label: "出生时间精度", value: certaintyLabel },
          ],
        }
      : {
          evidence: [
            { label: "地点", value: placeLabel },
            { label: "时区", value: timezoneId },
            { label: "本地星盘时间", value: localDatetime },
            { label: "UTC 时间", value: utcDatetime },
            { label: "出生时间精度", value: certaintyLabel },
          ],
        }),
  };
}

function buildReadingFromBundle(
  bundle: Awaited<ReturnType<typeof buildAstrologyBundle>>,
  location: GeoNamesEntry,
  timezoneId: string,
) {
  return buildReadingViewModel(
    bundle.normalizedBirth,
    location,
    timezoneId,
    bundle.natalChart,
    bundle.natalContext,
  );
}

function createFallbackExplanation(
  reading: ReadingViewModel,
  input: ParsedReadingInput,
): ExplanationViewModel {
  const overview =
    reading.body[0] ??
    "这张盘的核心在于性格结构与关系节奏之间的相互牵引。";

  return {
    overview,
    keyPatterns: (reading.sections ?? [])
      .slice(0, 3)
      .map((section, index) => ({
        title: section.title,
        explanation: section.body,
        evidence: [
          {
            label: `兜底模式 ${index + 1}`,
            refs: ["fallback.reading.sections"],
          },
        ],
      })),
    terminologyNotes: [
      "宫位描述生活议题的落点，星座描述表达方式。",
      "当多个行星聚焦相近宫位或星座时，主题会更反复出现。",
    ],
    caveats: [
      input.birthTimePrecision === "exact"
        ? "这份解释仍然以服务端可验证的星盘字段为边界。"
        : "出生时间不是 exact，涉及宫位和角度的解释需要更保守。",
    ],
  };
}

function createFallbackAnalysis(
  reading: ReadingViewModel,
): StructuredAnalysisViewModel {
  const sectionBody = (index: number, fallback: string) =>
    reading.sections?.[index]?.body ?? fallback;

  const section = (
    summary: string,
    refs: string[],
    confidence: "high" | "medium" | "low" = "medium",
  ) => ({
    summary,
    bullets: [summary],
    evidence: [
      {
        label: "兜底解读依据",
        refs,
      },
    ],
    confidence,
  });

  return {
    sections: {
      personality: section(
        reading.body[0] ?? "人格主轴围绕好奇、判断与情绪过滤展开。",
        ["fallback.reading.body[0]"],
        "high",
      ),
      behaviorAndThinking: section(
        sectionBody(0, "思考与行为模式会先快速抓重点，再慢慢确认可信度。"),
        ["fallback.reading.sections[0]"],
      ),
      relationshipsAndEmotions: section(
        sectionBody(1, "关系上更重视回应质量与信任感。"),
        ["fallback.reading.sections[1]"],
      ),
      careerAndGrowth: section(
        sectionBody(2, "职业路径更适合阶段式推进，而不是冲动切换。"),
        ["fallback.reading.sections[2]"],
      ),
      strengthsAndRisks: section(
        reading.body[1] ?? "优势在于感知细腻，风险在于容易因为信息过载而犹豫。",
        ["fallback.reading.body[1]"],
      ),
      lifeThemes: section(
        reading.title ?? "人生主题围绕理解世界与建立可信连接展开。",
        ["fallback.reading.title"],
        "high",
      ),
      timeDimension: section(
        reading.certaintyDescription ?? "时间维度上的判断会跟随出生时间精度而调整。",
        ["fallback.reading.certaintyDescription"],
        "low",
      ),
    },
  };
}

function createFallbackForecast(
  bundle: Awaited<ReturnType<typeof buildAstrologyBundle>>,
): StructuredForecastViewModel {
  const domain = (
    theme: string,
    forecast: string,
    confidence: "high" | "medium" | "low",
  ) => ({
    theme,
    forecast,
    opportunities: [forecast],
    risks: ["需要根据现实节奏持续校准判断。"],
    timingNotes: [bundle.futureWindowSummary.windowLabel],
    evidence: [
      {
        label: "行运兜底依据",
        refs: ["futureWindowSummary.summary", "transitSummary.headline"],
      },
    ],
    confidence,
  });

  return {
    nearTerm: {
      love: domain("关系观察期", bundle.futureWindowSummary.summary, "medium"),
      career: domain("节奏校准期", bundle.futureWindowSummary.summary, "medium"),
      emotion: domain("情绪整理期", bundle.transitSummary.headline, "high"),
      social: domain("社交筛选期", bundle.transitSummary.headline, "medium"),
      finance: domain("资源收拢期", bundle.futureWindowSummary.summary, "low"),
    },
    yearAhead: {
      love: domain("关系结构调整", bundle.futureWindowSummary.summary, "medium"),
      career: domain("长期方向重估", bundle.futureWindowSummary.summary, "medium"),
      emotion: domain("稳定内核建立", bundle.transitSummary.headline, "medium"),
      social: domain("圈层更新", bundle.transitSummary.headline, "medium"),
      finance: domain("资源配置重整", bundle.futureWindowSummary.summary, "low"),
    },
  };
}

function buildPrimaryReadingViewModel(
  initialParagraphs: string[],
  analysis: StructuredAnalysisViewModel,
  forecast: StructuredForecastViewModel,
  chartPayload?: NormalizedChartPayload,
): PrimaryReadingViewModel {
  const compressedTitle = compressPrimaryTitle(
    analysis.sections.lifeThemes.summary,
  );
  const primarySummarySource =
    initialParagraphs[0] || analysis.sections.personality.summary;

  return {
    title: compressedTitle,
    summary: collapseRepeatedSentences(primarySummarySource).trim(),
    chartEvidence: buildPrimaryChartEvidence(chartPayload),
    highlights: [
      analysis.sections.relationshipsAndEmotions.bullets[0],
      analysis.sections.careerAndGrowth.bullets[0],
      forecast.nearTerm.love.theme,
      forecast.nearTerm.career.theme,
    ].filter((value): value is string => Boolean(value)).slice(0, 4),
  };
}

function buildPrimaryChartEvidence(payload?: NormalizedChartPayload) {
  if (!payload) {
    return [];
  }

  const includeAngular = payload.meta.birthTimePrecision === "exact";
  const pointEntries = [
    ["太阳", payload.points.sun.sign],
    ["月亮", payload.points.moon.sign],
    ["水星", payload.points.mercury.sign],
    ["金星", payload.points.venus.sign],
    ["火星", payload.points.mars.sign],
    ...(includeAngular
      ? [
          ["上升", payload.points.ascendant.sign],
          ["MC", payload.points.mediumCoeli.sign],
        ]
      : []),
  ] as const;

  return pointEntries
    .map(([label, sign]) => {
      const normalizedSign = humanizeSign(sign);
      return normalizedSign ? `${label}${normalizedSign}` : null;
    })
    .filter((value): value is string => Boolean(value));
}

function compressPrimaryTitle(input: string) {
  const normalized = collapseRepeatedSentences(input.replace(/\s+/g, " ").trim())
    .replace(/[：:]/g, "，");

  if (normalized.length <= 36) {
    return normalized;
  }

  const sentence = normalized.split(/[。！？!?]/)[0]?.trim() ?? normalized;
  if (sentence.length <= 36) {
    return sentence;
  }

  const clauses = sentence
    .split(/[，、：:；;]/)
    .map((part) => part.trim())
    .filter(Boolean);

  let compact = "";
  for (const clause of clauses) {
    const next = compact ? `${compact}，${clause}` : clause;
    if (next.length > 30) {
      break;
    }
    compact = next;
  }

  if (compact) {
    return `${compact}。`;
  }

  return `${sentence.slice(0, 30).trim()}…`;
}

function normalizeComparableText(input: string) {
  return input
    .replace(/\s+/g, "")
    .replace(/[，。！？、；：:“”"'‘’（）()【】《》\-—…,.!?;:]/g, "")
    .toLowerCase()
    .trim();
}

function collapseRepeatedSentences(input: string) {
  const normalized = input.replace(/\s+/g, " ").trim();

  if (!normalized) {
    return normalized;
  }

  const parts = normalized
    .split(/(?<=[。！？!?])/)
    .map((part) => part.trim())
    .filter(Boolean);

  if (parts.length <= 1) {
    return normalized;
  }

  const seen = new Set<string>();
  const deduped: string[] = [];

  for (const part of parts) {
    const comparable = normalizeComparableText(part);

    if (!comparable || seen.has(comparable)) {
      continue;
    }

    seen.add(comparable);
    deduped.push(part);
  }

  return deduped.join("");
}

function truncateChineseText(input: string, maxLength: number) {
  const normalized = collapseRepeatedSentences(input).trim();

  if (normalized.length <= maxLength) {
    return normalized;
  }

  const sentence = normalized.split(/[。！？!?]/)[0]?.trim() ?? normalized;
  if (sentence.length <= maxLength) {
    return sentence.endsWith("。") ? sentence : `${sentence}。`;
  }

  return `${sentence.slice(0, Math.max(0, maxLength - 1)).trim()}…`;
}

function sanitizeBullets(summary: string, bullets: string[], maxLength: number) {
  const summaryComparable = normalizeComparableText(summary);
  const seen = new Set<string>();
  const summaryPrefix = summaryComparable.slice(0, Math.min(12, summaryComparable.length));

  return bullets.flatMap((rawBullet) => {
    const rawComparable = normalizeComparableText(rawBullet);

    if (!rawComparable || rawComparable === summaryComparable) {
      return [];
    }

    if (
      summaryComparable &&
      summaryComparable.includes(rawComparable) ||
      summaryComparable &&
      rawComparable.includes(summaryComparable)
    ) {
      return [];
    }

    const rawPrefix = rawComparable.slice(0, Math.min(12, rawComparable.length));
    if (
      rawPrefix.length >= 8 &&
      summaryPrefix.length >= 8 &&
      (summaryComparable.includes(rawPrefix) || rawComparable.includes(summaryPrefix))
    ) {
      return [];
    }

    const bullet = truncateChineseText(rawBullet, maxLength);
    const comparable = normalizeComparableText(bullet);

    if (!comparable || seen.has(comparable)) {
      return [];
    }

    seen.add(comparable);
    return [bullet];
  });
}

function removeLeadEchoBullets(summary: string, bullets: string[]) {
  const summaryComparable = normalizeComparableText(summary);

  return bullets.filter((bullet) => {
    const comparable = normalizeComparableText(bullet);
    const prefix = comparable.slice(0, Math.min(10, comparable.length));

    return !(prefix.length >= 6 && summaryComparable.startsWith(prefix));
  });
}

function sanitizeExplanationViewModel(
  explanation: ExplanationViewModel,
): ExplanationViewModel {
  return {
    overview: truncateChineseText(explanation.overview, 96),
    keyPatterns: explanation.keyPatterns.slice(0, 3).map((pattern) => ({
      ...pattern,
      title: truncateChineseText(pattern.title, 14).replace(/[。！？!?]$/g, ""),
      explanation: truncateChineseText(pattern.explanation, 68),
      evidence: pattern.evidence.slice(0, 2),
    })),
    terminologyNotes: sanitizeBullets("", explanation.terminologyNotes, 22).slice(
      0,
      3,
    ),
    caveats: sanitizeBullets("", explanation.caveats, 26).slice(0, 3),
  };
}

function sanitizeAnalysisViewModel(
  analysis: StructuredAnalysisViewModel,
): StructuredAnalysisViewModel {
  return {
    sections: {
      personality: {
        ...analysis.sections.personality,
        summary: truncateChineseText(analysis.sections.personality.summary, 72),
        bullets: removeLeadEchoBullets(
          analysis.sections.personality.summary,
          sanitizeBullets(
            analysis.sections.personality.summary,
            analysis.sections.personality.bullets,
            34,
          ),
        ),
      },
      behaviorAndThinking: {
        ...analysis.sections.behaviorAndThinking,
        summary: truncateChineseText(
          analysis.sections.behaviorAndThinking.summary,
          72,
        ),
        bullets: removeLeadEchoBullets(
          analysis.sections.behaviorAndThinking.summary,
          sanitizeBullets(
            analysis.sections.behaviorAndThinking.summary,
            analysis.sections.behaviorAndThinking.bullets,
            34,
          ),
        ),
      },
      relationshipsAndEmotions: {
        ...analysis.sections.relationshipsAndEmotions,
        summary: truncateChineseText(
          analysis.sections.relationshipsAndEmotions.summary,
          72,
        ),
        bullets: removeLeadEchoBullets(
          analysis.sections.relationshipsAndEmotions.summary,
          sanitizeBullets(
            analysis.sections.relationshipsAndEmotions.summary,
            analysis.sections.relationshipsAndEmotions.bullets,
            34,
          ),
        ),
      },
      careerAndGrowth: {
        ...analysis.sections.careerAndGrowth,
        summary: truncateChineseText(
          analysis.sections.careerAndGrowth.summary,
          72,
        ),
        bullets: removeLeadEchoBullets(
          analysis.sections.careerAndGrowth.summary,
          sanitizeBullets(
            analysis.sections.careerAndGrowth.summary,
            analysis.sections.careerAndGrowth.bullets,
            34,
          ),
        ),
      },
      strengthsAndRisks: {
        ...analysis.sections.strengthsAndRisks,
        summary: truncateChineseText(
          analysis.sections.strengthsAndRisks.summary,
          72,
        ),
        bullets: removeLeadEchoBullets(
          analysis.sections.strengthsAndRisks.summary,
          sanitizeBullets(
            analysis.sections.strengthsAndRisks.summary,
            analysis.sections.strengthsAndRisks.bullets,
            34,
          ),
        ),
      },
      lifeThemes: {
        ...analysis.sections.lifeThemes,
        summary: compressPrimaryTitle(analysis.sections.lifeThemes.summary),
        bullets: removeLeadEchoBullets(
          analysis.sections.lifeThemes.summary,
          sanitizeBullets(
            analysis.sections.lifeThemes.summary,
            analysis.sections.lifeThemes.bullets,
            34,
          ),
        ),
      },
      timeDimension: {
        ...analysis.sections.timeDimension,
        summary: truncateChineseText(analysis.sections.timeDimension.summary, 72),
        bullets: removeLeadEchoBullets(
          analysis.sections.timeDimension.summary,
          sanitizeBullets(
            analysis.sections.timeDimension.summary,
            analysis.sections.timeDimension.bullets,
            34,
          ),
        ),
      },
    },
  };
}

function sanitizeForecastViewModel(
  forecast: StructuredForecastViewModel,
): StructuredForecastViewModel {
  const sanitizeDomain = (domain: StructuredForecastViewModel["nearTerm"]["love"]) => ({
    ...domain,
    theme: truncateChineseText(domain.theme, 12).replace(/[。！？!?]$/g, ""),
    forecast: truncateChineseText(domain.forecast, 60),
    opportunities: sanitizeBullets("", domain.opportunities, 20).slice(0, 1),
    risks: sanitizeBullets("", domain.risks, 20).slice(0, 1),
    timingNotes: sanitizeBullets("", domain.timingNotes, 18).slice(0, 1),
  });

  return {
    nearTerm: {
      love: sanitizeDomain(forecast.nearTerm.love),
      career: sanitizeDomain(forecast.nearTerm.career),
      emotion: sanitizeDomain(forecast.nearTerm.emotion),
      social: sanitizeDomain(forecast.nearTerm.social),
      finance: sanitizeDomain(forecast.nearTerm.finance),
    },
    yearAhead: {
      love: sanitizeDomain(forecast.yearAhead.love),
      career: sanitizeDomain(forecast.yearAhead.career),
      emotion: sanitizeDomain(forecast.yearAhead.emotion),
      social: sanitizeDomain(forecast.yearAhead.social),
      finance: sanitizeDomain(forecast.yearAhead.finance),
    },
  };
}

export function sanitizeStructuredReading(input: {
  initialParagraphs?: string[];
  explanation: ExplanationViewModel;
  analysis: StructuredAnalysisViewModel;
  forecast: StructuredForecastViewModel;
  chartPayload?: NormalizedChartPayload;
}) {
  const explanation = sanitizeExplanationViewModel(input.explanation);
  const analysis = sanitizeAnalysisViewModel(input.analysis);
  const forecast = sanitizeForecastViewModel(input.forecast);

  return {
    primary: buildPrimaryReadingViewModel(
      input.initialParagraphs ?? [],
      analysis,
      forecast,
      input.chartPayload,
    ),
    explanation,
    analysis,
    forecast,
  };
}

async function buildInitialReading(
  bundle: Awaited<ReturnType<typeof buildAstrologyBundle>>,
  location: GeoNamesEntry,
  timezoneId: string,
  aiClient?: AiReadingClient,
) {
  const fallbackReading = buildReadingFromBundle(bundle, location, timezoneId);
  const chartPayload = buildNormalizedChartPayload({
    natalChart: bundle.natalChart,
    birthTimePrecision: bundle.normalizedBirth.birthTimePrecision,
    locationLabel: buildPlaceLabel(location),
    postalCode: bundle.normalizedBirth.postalCode,
  });

  const [aiReadingResult, explanation, analysis, forecast] = await Promise.all([
    buildInitialAiReading(bundle, chartPayload, aiClient),
    buildExplanationReading(chartPayload, aiClient),
    buildStructuredAnalysis(chartPayload, aiClient),
    buildStructuredForecast(chartPayload, aiClient),
  ]);

  const sanitized = sanitizeStructuredReading({
    initialParagraphs: aiReadingResult.paragraphs,
    explanation,
    analysis,
    forecast,
    chartPayload,
  });
  const reading = fallbackReading;

  return {
    primary: sanitized.primary,
    explanation: sanitized.explanation,
    analysis: sanitized.analysis,
    forecast: sanitized.forecast,
    reading,
  };
}

function buildSessionToken(
  bundle: Awaited<ReturnType<typeof buildAstrologyBundle>>,
) {
  return signSessionToken({
    normalizedBirth: bundle.normalizedBirth,
    natalSummary: bundle.natalSummary,
    transitSummary: {
      headline: bundle.transitSummary.headline,
      windowLabel: bundle.futureWindowSummary.windowLabel,
    },
    asOf: bundle.asOf,
    followUpCount: 0,
  });
}

function countSuccessfulAssistantTurns(priorTurns: FollowUpTurn[]) {
  return priorTurns.filter((turn) => turn.role === "assistant").length;
}

function getRemainingFollowUps(followUpCount: number) {
  return Math.max(0, MAX_FOLLOW_UPS - followUpCount);
}

function mapTopicToQuestion(topic: FollowUpTopic, customQuestion: string) {
  if (topic === "love") {
    return "What is happening in love right now?";
  }

  if (topic === "career-change") {
    return "Is this a good time to change jobs?";
  }

  if (topic === "anxiety") {
    return "Why have I felt restless or anxious recently?";
  }

  return customQuestion;
}

export async function resolveReadingFlow(
  rawInput: RawReadingInput,
  options?: ResolveReadingFlowOptions,
): Promise<ReadingOutcome> {
  try {
    const parsed = parseReadingSearchParams(rawInput);
    const locationOutcome = await resolveLocation(parsed);

    if (locationOutcome.kind === "location-match") {
      return {
        kind: "location-match",
        city: parsed.city,
        country: parsed.country,
        postalCode: parsed.postalCode,
        candidates: locationOutcome.candidates,
      };
    }

    if (locationOutcome.kind === "reading-unavailable") {
      return { kind: "reading-unavailable" };
    }

    const bundle = await buildAstrologyBundle(
      parsed,
      {
        location: locationOutcome.location,
        timezoneId: locationOutcome.timezoneId,
      },
    );

    if (bundle.natalChart.status !== "OK") {
      return { kind: "reading-unavailable" };
    }

    const readingResult = await buildInitialReading(
      bundle,
      locationOutcome.location,
      locationOutcome.timezoneId,
      options?.aiClient,
    );

    return {
      kind: "ready",
      primary: readingResult.primary,
      explanation: readingResult.explanation,
      analysis: readingResult.analysis,
      forecast: readingResult.forecast,
      reading: readingResult.reading,
      sessionToken: buildSessionToken(bundle),
      followUpOptions: [...FOLLOW_UP_OPTIONS],
      remainingFollowUps: MAX_FOLLOW_UPS,
    };
  } catch (error) {
    return buildReadingUnavailableFromError(error);
  }
}

export async function resolveReadingFollowUp(
  request: FollowUpRequestBody,
  options?: ResolveFollowUpOptions,
): Promise<FollowUpOutcome> {
  try {
    const session = verifySessionToken(request.sessionToken);
    const successfulTurns = countSuccessfulAssistantTurns(request.priorTurns);

    if (successfulTurns !== session.followUpCount) {
      return {
        kind: "follow-up-unavailable",
        message: "当前解读会话已经失效，请重新开始。",
        retryable: false,
        remainingFollowUps: getRemainingFollowUps(session.followUpCount),
      };
    }

    if (session.followUpCount >= MAX_FOLLOW_UPS) {
      return {
        kind: "follow-up-unavailable",
        message: "这次解读的追问次数已经用完。",
        retryable: false,
        remainingFollowUps: 0,
      };
    }

    const locationOutcome = await resolveLocation(session.normalizedBirth);

    if (locationOutcome.kind !== "resolved") {
      return {
        kind: "follow-up-unavailable",
        message: "暂时无法重建这次解读会话。",
        retryable: false,
        remainingFollowUps: getRemainingFollowUps(session.followUpCount),
      };
    }

    const bundle = await buildAstrologyBundle(
      session.normalizedBirth,
      {
        location: locationOutcome.location,
        timezoneId: locationOutcome.timezoneId,
      },
      session.asOf,
    );

    const mappedQuestion = mapTopicToQuestion(request.topic, request.question);
    const priorTurns: AiReadingTurn[] = request.priorTurns;

    let answer: Awaited<ReturnType<typeof buildFollowUpAnswer>>;

    try {
      answer = await buildFollowUpAnswer(
        bundle,
        mappedQuestion,
        priorTurns,
        options?.aiClient,
      );
    } catch {
      return {
        kind: "follow-up-unavailable",
        message: "暂时无法生成追问解读。",
        retryable: true,
        remainingFollowUps: getRemainingFollowUps(session.followUpCount),
      };
    }

    const nextToken = rotateSessionToken(request.sessionToken);
    const nextSession = verifySessionToken(nextToken);

    return {
      kind: "follow-up-ready",
      sessionToken: nextToken,
      answer,
      remainingFollowUps: getRemainingFollowUps(nextSession.followUpCount),
      topic: request.topic,
    };
  } catch {
    return {
      kind: "follow-up-unavailable",
      message: "暂时无法生成追问解读。",
      retryable: false,
      remainingFollowUps: 0,
    };
  }
}

function isReadingViewModel(value: unknown): value is ReadingViewModel {
  return (
    isRecord(value) &&
    Array.isArray(value.body) &&
    value.body.every((paragraph) => typeof paragraph === "string") &&
    (value.title === undefined || typeof value.title === "string") &&
    (value.certaintyLabel === undefined ||
      typeof value.certaintyLabel === "string") &&
    (value.certaintyDescription === undefined ||
      typeof value.certaintyDescription === "string") &&
    (value.trustItems === undefined ||
      (Array.isArray(value.trustItems) &&
        value.trustItems.every((item) => typeof item === "string"))) &&
    (value.sections === undefined ||
      (Array.isArray(value.sections) &&
        value.sections.every(
          (section) =>
            isRecord(section) &&
            typeof section.title === "string" &&
            typeof section.body === "string",
        ))) &&
    (value.evidence === undefined ||
      (Array.isArray(value.evidence) &&
        value.evidence.every(
          (item) =>
            isRecord(item) &&
            typeof item.label === "string" &&
            typeof item.value === "string",
        )))
  );
}

function isEvidenceItem(value: unknown) {
  return (
    isRecord(value) &&
    typeof value.label === "string" &&
    Array.isArray(value.refs) &&
    value.refs.every((item) => typeof item === "string")
  );
}

function isExplanationViewModel(value: unknown): value is ExplanationViewModel {
  return (
    isRecord(value) &&
    typeof value.overview === "string" &&
    Array.isArray(value.keyPatterns) &&
    value.keyPatterns.every(
      (item) =>
        isRecord(item) &&
        typeof item.title === "string" &&
        typeof item.explanation === "string" &&
        Array.isArray(item.evidence) &&
        item.evidence.every(isEvidenceItem),
    ) &&
    Array.isArray(value.terminologyNotes) &&
    value.terminologyNotes.every((item) => typeof item === "string") &&
    Array.isArray(value.caveats) &&
    value.caveats.every((item) => typeof item === "string")
  );
}

function isAnalysisSection(value: unknown) {
  return (
    isRecord(value) &&
    typeof value.summary === "string" &&
    Array.isArray(value.bullets) &&
    value.bullets.every((item) => typeof item === "string") &&
    Array.isArray(value.evidence) &&
    value.evidence.every(isEvidenceItem) &&
    (value.confidence === "high" ||
      value.confidence === "medium" ||
      value.confidence === "low")
  );
}

function isStructuredAnalysisViewModel(
  value: unknown,
): value is StructuredAnalysisViewModel {
  return (
    isRecord(value) &&
    isRecord(value.sections) &&
    isAnalysisSection(value.sections.personality) &&
    isAnalysisSection(value.sections.behaviorAndThinking) &&
    isAnalysisSection(value.sections.relationshipsAndEmotions) &&
    isAnalysisSection(value.sections.careerAndGrowth) &&
    isAnalysisSection(value.sections.strengthsAndRisks) &&
    isAnalysisSection(value.sections.lifeThemes) &&
    isAnalysisSection(value.sections.timeDimension)
  );
}

function isForecastDomain(value: unknown) {
  return (
    isRecord(value) &&
    typeof value.theme === "string" &&
    typeof value.forecast === "string" &&
    Array.isArray(value.opportunities) &&
    value.opportunities.every((item) => typeof item === "string") &&
    Array.isArray(value.risks) &&
    value.risks.every((item) => typeof item === "string") &&
    Array.isArray(value.timingNotes) &&
    value.timingNotes.every((item) => typeof item === "string") &&
    Array.isArray(value.evidence) &&
    value.evidence.every(isEvidenceItem) &&
    (value.confidence === "high" ||
      value.confidence === "medium" ||
      value.confidence === "low")
  );
}

function isForecastWindow(value: unknown) {
  return (
    isRecord(value) &&
    isForecastDomain(value.love) &&
    isForecastDomain(value.career) &&
    isForecastDomain(value.emotion) &&
    isForecastDomain(value.social) &&
    isForecastDomain(value.finance)
  );
}

function isStructuredForecastViewModel(
  value: unknown,
): value is StructuredForecastViewModel {
  return (
    isRecord(value) &&
    isForecastWindow(value.nearTerm) &&
    isForecastWindow(value.yearAhead)
  );
}

function isPrimaryReadingViewModel(value: unknown): value is PrimaryReadingViewModel {
  return (
    isRecord(value) &&
    typeof value.title === "string" &&
    typeof value.summary === "string" &&
    Array.isArray(value.highlights) &&
    value.highlights.every((item) => typeof item === "string") &&
    Array.isArray(value.chartEvidence) &&
    value.chartEvidence.every((item) => typeof item === "string")
  );
}

function isLocationMatchOutcome(
  value: unknown,
): value is Extract<ReadingOutcome, { kind: "location-match" }> {
  return (
    isRecord(value) &&
    (value.city === undefined || typeof value.city === "string") &&
    (value.country === undefined || typeof value.country === "string") &&
    (value.postalCode === undefined || typeof value.postalCode === "string") &&
    Array.isArray(value.candidates) &&
    value.candidates.every(isLocationCandidate)
  );
}

export function isReadingOutcome(value: unknown): value is ReadingOutcome {
  if (!isRecord(value) || typeof value.kind !== "string") {
    return false;
  }

  if (value.kind === "ready") {
    return (
      isPrimaryReadingViewModel(value.primary) &&
      isExplanationViewModel(value.explanation) &&
      isStructuredAnalysisViewModel(value.analysis) &&
      isStructuredForecastViewModel(value.forecast) &&
      isReadingViewModel(value.reading) &&
      typeof value.sessionToken === "string" &&
      Array.isArray(value.followUpOptions) &&
      value.followUpOptions.every((option) =>
        FOLLOW_UP_OPTIONS.includes(option as FollowUpOption),
      ) &&
      typeof value.remainingFollowUps === "number"
    );
  }

  if (value.kind === "location-match") {
    return isLocationMatchOutcome(value);
  }

  return (
    value.kind === "reading-unavailable" &&
    (value.code === undefined ||
      value.code === "invalid-input" ||
      value.code === "rate-limited" ||
      value.code === "service-unavailable") &&
    (value.message === undefined || typeof value.message === "string") &&
    (value.retryable === undefined || typeof value.retryable === "boolean")
  );
}

export function isFollowUpOutcome(value: unknown): value is FollowUpOutcome {
  if (!isRecord(value) || typeof value.kind !== "string") {
    return false;
  }

  if (value.kind === "follow-up-ready") {
    return (
      typeof value.sessionToken === "string" &&
      isRecord(value.answer) &&
      Array.isArray(value.answer.paragraphs) &&
      value.answer.paragraphs.every(
        (paragraph) => typeof paragraph === "string",
      ) &&
      typeof value.remainingFollowUps === "number" &&
      typeof value.topic === "string"
    );
  }

  if (value.kind === "follow-up-unavailable") {
    return (
      typeof value.message === "string" &&
      typeof value.retryable === "boolean" &&
      typeof value.remainingFollowUps === "number"
    );
  }

  return false;
}
