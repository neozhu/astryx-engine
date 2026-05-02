import {
  buildReadingUnavailableFromError,
  parseReadingSearchParams,
  resolveReadingFlow,
  resolveReadingFollowUp,
  sanitizeStructuredReading,
} from "@/lib/reading";
import { buildAstrologyBundle } from "@/lib/astrology-bundle";
import { POST } from "@/app/api/reading/route";
import { POST as postFollowUp } from "@/app/api/reading/follow-up/route";
import type { AiReadingClient } from "@/lib/ai-reading";

function createAiClient(outputText: string): AiReadingClient {
  return {
    responses: {
      create: vi.fn(async () => ({
        output_text: outputText,
      })),
    },
  };
}

function createReadingAiClient(): AiReadingClient {
  const outputs = [
    JSON.stringify({
      paragraphs: [
        "这是第一段 AI 解读。",
        "这是第二段 AI 解读。",
        "接下来的几周更适合稳一点推进。",
      ],
    }),
    JSON.stringify({
      overview: "这张盘的核心在于认知扩张与情绪感受并行推进。",
      keyPatterns: [
        {
          title: "核心模式",
          explanation: "你会先快速理解外部信息，再慢慢确认真正值得投入的方向。",
          evidence: [{ label: "太阳与月亮", refs: ["points.sun.sign", "points.moon.sign"] }],
        },
      ],
      terminologyNotes: ["宫位描述生活议题的落点，星座描述表达方式。"],
      caveats: ["解读只依据当前可验证的星盘数据。"],
    }),
    JSON.stringify({
      sections: {
        personality: {
          summary: "你的核心人格偏向开放吸收，再经过情绪过滤形成判断。",
          bullets: ["先理解，再筛选。"],
          evidence: [{ label: "太阳", refs: ["points.sun.sign"] }],
          confidence: "high",
        },
        behaviorAndThinking: {
          summary: "思维速度快，但落决定前会反复确认。",
          bullets: ["信息抓取得快，承诺下得慢。"],
          evidence: [{ label: "水星", refs: ["points.mercury.sign"] }],
          confidence: "medium",
        },
        relationshipsAndEmotions: {
          summary: "关系里重视稳定回应与情绪真实感。",
          bullets: ["越真实，越愿意加快行动。"],
          evidence: [{ label: "金星火星", refs: ["points.venus.sign", "points.mars.sign"] }],
          confidence: "medium",
        },
        careerAndGrowth: {
          summary: "发展路径适合边扩张视野边沉淀长期方向。",
          bullets: ["先打开可能性，再筛出主线。"],
          evidence: [{ label: "中天", refs: ["points.mediumCoeli.sign"] }],
          confidence: "medium",
        },
        strengthsAndRisks: {
          summary: "优势在理解快，风险在容易被过多信息牵动。",
          bullets: ["需要主动收束注意力。"],
          evidence: [{ label: "重复主题", refs: ["derivedSignals.repeatedSignThemes"] }],
          confidence: "medium",
        },
        lifeThemes: {
          summary: "理解世界，也要筛选真正可信的连接。",
          bullets: ["开放不等于无边界。"],
          evidence: [{ label: "人生主题", refs: ["points.sun.house"] }],
          confidence: "high",
        },
        timeDimension: {
          summary: "当前更适合渐进推进，而不是一次定局。",
          bullets: ["先观察节奏，再做大动作。"],
          evidence: [{ label: "时间维度", refs: ["meta.birthTimePrecision"] }],
          confidence: "low",
        },
      },
    }),
    JSON.stringify({
      nearTerm: {
        love: {
          theme: "关系观察期",
          forecast: "未来 30-90 天更适合观察互动质量，而不是急着定性。",
          opportunities: ["看清谁能稳定回应你。"],
          risks: ["因为节奏不一致而误判关系。"],
          timingNotes: ["先观察，再定边界。"],
          evidence: [{ label: "感情", refs: ["points.venus.sign"] }],
          confidence: "medium",
        },
        career: {
          theme: "节奏校准期",
          forecast: "工作上适合先校准方向，再扩大投入。",
          opportunities: ["收敛更值得长期投入的路径。"],
          risks: ["被短期焦虑带着频繁换向。"],
          timingNotes: ["先收敛，再推进。"],
          evidence: [{ label: "事业", refs: ["points.mediumCoeli.sign"] }],
          confidence: "medium",
        },
        emotion: {
          theme: "情绪整理期",
          forecast: "近期更适合先命名感受，再决定行动方式。",
          opportunities: ["更快识别真正的压力源。"],
          risks: ["把内部波动误判成外部问题。"],
          timingNotes: ["先内观，再行动。"],
          evidence: [{ label: "情绪", refs: ["points.moon.sign"] }],
          confidence: "high",
        },
        social: {
          theme: "社交筛选期",
          forecast: "社交关系会自然向更有回应感的连接收敛。",
          opportunities: ["留下更有质量的互动。"],
          risks: ["过度解读冷淡信号。"],
          timingNotes: ["先观察，再分层。"],
          evidence: [{ label: "社交", refs: ["points.sun.sign"] }],
          confidence: "medium",
        },
        finance: {
          theme: "资源收拢期",
          forecast: "近期更适合稳住资源配置，不急着做激进决定。",
          opportunities: ["建立更稳定的缓冲。"],
          risks: ["情绪影响花费判断。"],
          timingNotes: ["先整理现状。"],
          evidence: [{ label: "财务", refs: ["points.venus.house"] }],
          confidence: "low",
        },
      },
      yearAhead: {
        love: {
          theme: "关系结构调整",
          forecast: "未来一年会更清楚自己要把情感投入放在哪里。",
          opportunities: ["长期关系框架变清楚。"],
          risks: ["旧模式拖慢决定。"],
          timingNotes: ["后段更适合明确选择。"],
          evidence: [{ label: "年度感情", refs: ["points.venus.sign"] }],
          confidence: "medium",
        },
        career: {
          theme: "长期方向重估",
          forecast: "职业主线会逐渐向更值得深耕的方向集中。",
          opportunities: ["找到可长期积累的能力主线。"],
          risks: ["被短期机会打断布局。"],
          timingNotes: ["先定方向，再定节奏。"],
          evidence: [{ label: "年度事业", refs: ["points.mediumCoeli.sign"] }],
          confidence: "medium",
        },
        emotion: {
          theme: "稳定内核建立",
          forecast: "情绪管理会从被动应对转向更稳定的自我调节。",
          opportunities: ["恢复力逐步增强。"],
          risks: ["旧习惯在压力下反复出现。"],
          timingNotes: ["先识别模式，再巩固。"],
          evidence: [{ label: "年度情绪", refs: ["points.moon.sign"] }],
          confidence: "medium",
        },
        social: {
          theme: "圈层更新",
          forecast: "社交关系会经历一轮自然筛选与重组。",
          opportunities: ["形成更稳定的支持系统。"],
          risks: ["过渡期会感觉联系变少。"],
          timingNotes: ["先收缩，再重建。"],
          evidence: [{ label: "年度社交", refs: ["points.sun.sign"] }],
          confidence: "medium",
        },
        finance: {
          theme: "资源配置重整",
          forecast: "财务观念会逐渐变得更长期和结构化。",
          opportunities: ["建立更明确的优先级。"],
          risks: ["关系与资源议题互相影响。"],
          timingNotes: ["中后段更适合结构调整。"],
          evidence: [{ label: "年度财务", refs: ["points.venus.house"] }],
          confidence: "low",
        },
      },
    }),
  ];

  let index = 0;

  return {
    responses: {
      create: vi.fn(async () => ({
        output_text: outputs[Math.min(index++, outputs.length - 1)],
      })),
    },
  };
}

async function resolveReadingFlowWithAi(
  rawInput: Parameters<typeof resolveReadingFlow>[0],
) {
  return resolveReadingFlow(rawInput, {
    aiClient: createReadingAiClient(),
  });
}

function createFailingAiClient(): AiReadingClient {
  return {
    responses: {
      create: vi.fn(async () => {
        throw new Error("model unavailable");
      }),
    },
  };
}

describe("reading flow library", () => {
  beforeEach(() => {
    process.env.LOCAL_ASTROLOGY_API_URL = "http://127.0.0.1:8010";
  });

  afterEach(() => {
    vi.useRealTimers();
    vi.unstubAllGlobals();
    vi.restoreAllMocks();
    delete process.env.ASTROLOGY_PROVIDER;
    delete process.env.GEONAMES_USERNAME;
    delete process.env.LOCAL_ASTROLOGY_API_URL;
    delete process.env.RAPIDAPI_KEY;
    delete process.env.RAPIDAPI_HOST;
    delete process.env.OPENAI_API_KEY;
    delete process.env.OPENAI_READING_MODEL;
  });

  it("builds an astrology bundle with one locked asOf timestamp and deterministic summaries", async () => {
    process.env.RAPIDAPI_KEY = "test-key";
    process.env.RAPIDAPI_HOST = "astrologer.p.rapidapi.com";

    vi.useFakeTimers();
    vi.setSystemTime(new Date("2026-04-05T12:00:00.000Z"));

    const fetchMock = vi.fn(async (input: RequestInfo | URL) => {
      const url = input.toString();

      if (url.includes("/api/v5/context/transit")) {
        return Response.json({
          status: "OK",
          context:
            "<reading><paragraph>Current transits emphasize movement and emotional processing.</paragraph><paragraph>Over the next 4-8 weeks, the mood stays fluid while practical follow-through matters more than speed.</paragraph></reading>",
        });
      }

      if (url.includes("/api/v5/chart-data/transit")) {
        return Response.json({
          status: "OK",
          chart_data: {
            subject: {
              sun: { sign: "Ari" },
              moon: { sign: "Can" },
            },
          },
        });
      }

      if (url.includes("/api/v5/context/birth-chart")) {
        return Response.json({
          status: "OK",
          context:
            "<reading><paragraph>You come across as mentally quick, but you do your real sorting later.</paragraph></reading>",
        });
      }

      if (url.includes("/api/v5/chart-data/birth-chart")) {
        return Response.json({
          status: "OK",
          chart_data: {
            subject: {
              city: "New York",
              nation: "US",
              tz_str: "America/New_York",
              iso_formatted_local_datetime: "1990-06-15T14:30:00-04:00",
              iso_formatted_utc_datetime: "1990-06-15T18:30:00Z",
              sun: { sign: "Gem", house: "Ninth_House" },
              moon: { sign: "Pis", house: "Sixth_House" },
              venus: { sign: "Tau", house: "Eighth_House" },
              mars: { sign: "Ari", house: "Sixth_House" },
              ascendant: { sign: "Lib", house: "First_House" },
              medium_coeli: { sign: "Can", house: "Tenth_House" },
            },
          },
        });
      }

      throw new Error(`Unexpected URL: ${url}`);
    });

    vi.stubGlobal("fetch", fetchMock);

    const bundle = await buildAstrologyBundle(
      {
        year: 1990,
        month: 6,
        day: 15,
        hour: 14,
        minute: 30,
        city: "New York",
        country: "US",
        birthTimePrecision: "exact",
      },
      {
        location: {
          geonameId: 5128581,
          name: "New York",
          adminName1: "New York",
          countryName: "United States",
          countryCode: "US",
          lat: "40.71427",
          lng: "-74.00597",
          population: 8804190,
        },
        timezoneId: "America/New_York",
      },
    );

    expect(bundle.asOf).toBe("2026-04-05T12:00:00.000Z");
    expect(bundle.chartRequest.subject.hour).toBe(14);
    expect(bundle.chartRequest.subject.minute).toBe(30);
    expect(bundle.natalSummary).toEqual({
      sun: "双子座",
      moon: "双鱼座",
      venus: "金牛座",
    });
    expect(bundle.transitSummary.headline).toBe(
      "Current transits emphasize movement and emotional processing.",
    );
    expect(bundle.futureWindowSummary).toEqual({
      windowLabel: "未来 4-8 周",
      summary:
        "Over the next 4-8 weeks, the mood stays fluid while practical follow-through matters more than speed.",
    });

    const transitCalls = fetchMock.mock.calls.filter(([request]) =>
      request.toString().includes("/transit"),
    );

    expect(transitCalls).toHaveLength(2);
    for (const [, init] of transitCalls) {
      expect(JSON.parse(String(init?.body)).transit_at).toBe(
        "2026-04-05T12:00:00.000Z",
      );
    }
  });

  it("uses a neutral noon fallback in the bundle payload when birth time is unknown", async () => {
    process.env.RAPIDAPI_KEY = "test-key";
    process.env.RAPIDAPI_HOST = "astrologer.p.rapidapi.com";

    const fetchMock = vi.fn(async (input: RequestInfo | URL) => {
      const url = input.toString();

      if (url.includes("/api/v5/context/transit")) {
        throw new Error("transit context unavailable");
      }

      if (url.includes("/api/v5/chart-data/transit")) {
        throw new Error("transit chart unavailable");
      }

      if (url.includes("/api/v5/context/birth-chart")) {
        return Response.json({
          status: "OK",
          context:
            "<reading><paragraph>This reading keeps the chart grounded in the luminaries.</paragraph></reading>",
        });
      }

      if (url.includes("/api/v5/chart-data/birth-chart")) {
        return Response.json({
          status: "OK",
          chart_data: {
            subject: {
              city: "New York",
              nation: "US",
              tz_str: "America/New_York",
              sun: { sign: "Gem", house: "Ninth_House" },
              moon: { sign: "Pis", house: "Sixth_House" },
              venus: { sign: "Tau", house: "Eighth_House" },
            },
          },
        });
      }

      throw new Error(`Unexpected URL: ${url}`);
    });

    vi.stubGlobal("fetch", fetchMock);

    const bundle = await buildAstrologyBundle(
      {
        year: 1990,
        month: 6,
        day: 15,
        hour: 7,
        minute: 45,
        city: "New York",
        country: "US",
        birthTimePrecision: "unknown",
      },
      {
        location: {
          geonameId: 5128581,
          name: "New York",
          adminName1: "New York",
          countryName: "United States",
          countryCode: "US",
          lat: "40.71427",
          lng: "-74.00597",
          population: 8804190,
        },
        timezoneId: "America/New_York",
      },
    );

    expect(bundle.normalizedBirth.hour).toBeNull();
    expect(bundle.normalizedBirth.minute).toBeNull();
    expect(bundle.chartRequest.subject.hour).toBe(12);
    expect(bundle.chartRequest.subject.minute).toBe(0);
    expect(bundle.transitChart).toBeNull();
    expect(bundle.transitContext).toBeNull();

    const natalRequest = fetchMock.mock.calls.find(([request]) =>
      request.toString().includes("/api/v5/chart-data/birth-chart"),
    );

    expect(natalRequest).toBeDefined();
    expect(JSON.parse(String(natalRequest?.[1]?.body)).subject.hour).toBe(12);
    expect(JSON.parse(String(natalRequest?.[1]?.body)).subject.minute).toBe(0);
  });

  it("defaults missing birthTimePrecision to exact", () => {
    const parsed = parseReadingSearchParams({
      year: "1990",
      month: "6",
      day: "15",
      hour: "14",
      minute: "30",
      postalCode: "215300",
    });

    expect(parsed.birthTimePrecision).toBe("exact");
    expect(parsed.hour).toBe(14);
    expect(parsed.minute).toBe(30);
  });

  it("uses explicit unavailable-safe transit summaries when both optional transit calls fail", async () => {
    process.env.RAPIDAPI_KEY = "test-key";
    process.env.RAPIDAPI_HOST = "astrologer.p.rapidapi.com";

    const fetchMock = vi.fn(async (input: RequestInfo | URL) => {
      const url = input.toString();

      if (url.includes("/api/v5/context/transit")) {
        throw new Error("transit context unavailable");
      }

      if (url.includes("/api/v5/chart-data/transit")) {
        throw new Error("transit chart unavailable");
      }

      if (url.includes("/api/v5/context/birth-chart")) {
        return Response.json({
          status: "OK",
          context:
            "<reading><paragraph>This reading keeps the chart grounded in the luminaries.</paragraph></reading>",
        });
      }

      if (url.includes("/api/v5/chart-data/birth-chart")) {
        return Response.json({
          status: "OK",
          chart_data: {
            subject: {
              city: "New York",
              nation: "US",
              tz_str: "America/New_York",
              sun: { sign: "Gem", house: "Ninth_House" },
              moon: { sign: "Pis", house: "Sixth_House" },
              venus: { sign: "Tau", house: "Eighth_House" },
            },
          },
        });
      }

      throw new Error(`Unexpected URL: ${url}`);
    });

    vi.stubGlobal("fetch", fetchMock);

    const bundle = await buildAstrologyBundle(
      {
        year: 1990,
        month: 6,
        day: 15,
        hour: 14,
        minute: 30,
        city: "New York",
        country: "US",
        birthTimePrecision: "exact",
      },
      {
        location: {
          geonameId: 5128581,
          name: "New York",
          adminName1: "New York",
          countryName: "United States",
          countryCode: "US",
          lat: "40.71427",
          lng: "-74.00597",
          population: 8804190,
        },
        timezoneId: "America/New_York",
      },
    );

    expect(bundle.transitChart).toBeNull();
    expect(bundle.transitContext).toBeNull();
    expect(bundle.transitSummary).toEqual({
      headline: "当前行运数据暂时不可用，所以这部分总结会先以本命盘为稳定参照。",
      highlights: [],
    });
    expect(bundle.futureWindowSummary).toEqual({
      windowLabel: "未来 4-8 周",
      summary: "未来行运节奏暂时不可用，所以接下来几周先以本命盘的稳定结构作为参照。",
    });
  });

  it("uses explicit unavailable-safe transit summaries when transit context exists but has no usable paragraphs", async () => {
    process.env.RAPIDAPI_KEY = "test-key";
    process.env.RAPIDAPI_HOST = "astrologer.p.rapidapi.com";

    const fetchMock = vi.fn(async (input: RequestInfo | URL) => {
      const url = input.toString();

      if (url.includes("/api/v5/context/transit")) {
        return Response.json({
          status: "OK",
          context:
            "<reading><active_points>Sun, Moon</active_points><active_aspects>trine (2)</active_aspects></reading>",
        });
      }

      if (url.includes("/api/v5/chart-data/transit")) {
        return Response.json({
          status: "OK",
          chart_data: {
            subject: {},
          },
        });
      }

      if (url.includes("/api/v5/context/birth-chart")) {
        return Response.json({
          status: "OK",
          context:
            "<reading><paragraph>This reading keeps the chart grounded in the luminaries.</paragraph></reading>",
        });
      }

      if (url.includes("/api/v5/chart-data/birth-chart")) {
        return Response.json({
          status: "OK",
          chart_data: {
            subject: {
              city: "New York",
              nation: "US",
              tz_str: "America/New_York",
              sun: { sign: "Gem", house: "Ninth_House" },
              moon: { sign: "Pis", house: "Sixth_House" },
              venus: { sign: "Tau", house: "Eighth_House" },
            },
          },
        });
      }

      throw new Error(`Unexpected URL: ${url}`);
    });

    vi.stubGlobal("fetch", fetchMock);

    const bundle = await buildAstrologyBundle(
      {
        year: 1990,
        month: 6,
        day: 15,
        hour: 14,
        minute: 30,
        city: "New York",
        country: "US",
        birthTimePrecision: "exact",
      },
      {
        location: {
          geonameId: 5128581,
          name: "New York",
          adminName1: "New York",
          countryName: "United States",
          countryCode: "US",
          lat: "40.71427",
          lng: "-74.00597",
          population: 8804190,
        },
        timezoneId: "America/New_York",
      },
    );

    expect(bundle.transitSummary).toEqual({
      headline: "当前行运数据暂时不可用，所以这部分总结会先以本命盘为稳定参照。",
      highlights: [],
    });
    expect(bundle.futureWindowSummary).toEqual({
      windowLabel: "未来 4-8 周",
      summary: "未来行运节奏暂时不可用，所以接下来几周先以本命盘的稳定结构作为参照。",
    });
  });

  it("allows unknown time precision without requiring hour and minute", () => {
    const parsed = parseReadingSearchParams({
      year: "1990",
      month: "6",
      day: "15",
      city: "Kunshan",
      country: "China",
      birthTimePrecision: "unknown",
    });

    expect(parsed.birthTimePrecision).toBe("unknown");
    expect(parsed.hour).toBeNull();
    expect(parsed.minute).toBeNull();
  });

  it("treats malformed birthTimePrecision as exact", () => {
    const parsed = parseReadingSearchParams({
      year: "1990",
      month: "6",
      day: "15",
      hour: "14",
      minute: "30",
      city: "Kunshan",
      country: "China",
      birthTimePrecision: "definitely",
    });

    expect(parsed.birthTimePrecision).toBe("exact");
    expect(parsed.hour).toBe(14);
    expect(parsed.minute).toBe(30);
  });

  it("prefers natal context body copy when the XML payload is available", async () => {
    process.env.GEONAMES_USERNAME = "new163";
    process.env.RAPIDAPI_KEY = "test-key";
    process.env.RAPIDAPI_HOST = "astrologer.p.rapidapi.com";

    const fetchMock = vi.fn(async (input: RequestInfo | URL) => {
      const url = input.toString();

      if (url.includes("searchJSON")) {
        return Response.json({
          totalResultsCount: 1,
          geonames: [
            {
              geonameId: 1785623,
              name: "Kunshan",
              adminName1: "Jiangsu",
              countryName: "China",
              countryCode: "CN",
              lat: "31.37762",
              lng: "120.95431",
              population: 2092496,
            },
          ],
        });
      }

      if (url.includes("timezoneJSON")) {
        return Response.json({
          timezoneId: "Asia/Shanghai",
          lat: 31.37762,
          lng: 120.95431,
        });
      }

      if (url.includes("/api/v5/context/birth-chart")) {
        return Response.json({
          status: "OK",
          context:
            "<reading><paragraph>You come across as mentally quick, but you do your real sorting later, once the emotional weather has calmed down.</paragraph><paragraph>The strongest through-line here is curiosity first, trust second, which is why people often meet your speed before they understand your depth.</paragraph></reading>",
          chart_data: {
            subject: {
              sun: { sign: "Gem", house: "Ninth_House" },
              moon: { sign: "Pis", house: "Sixth_House" },
              venus: { sign: "Tau", house: "Eighth_House" },
            },
          },
        });
      }

      if (url.includes("/api/v5/chart-data/birth-chart")) {
        return Response.json({
          status: "OK",
          chart_data: {
            subject: {
              city: "Kunshan",
              nation: "CN",
              tz_str: "Asia/Shanghai",
              iso_formatted_local_datetime: "1990-06-15T14:30:00+08:00",
              iso_formatted_utc_datetime: "1990-06-15T06:30:00Z",
              sun: { sign: "Gem", house: "Ninth_House" },
              moon: { sign: "Pis", house: "Sixth_House" },
              mercury: { sign: "Gem", house: "Eighth_House" },
              venus: { sign: "Tau", house: "Eighth_House" },
              mars: { sign: "Ari", house: "Sixth_House" },
              ascendant: { sign: "Lib", house: "First_House" },
              medium_coeli: { sign: "Can", house: "Tenth_House" },
            },
          },
        });
      }

      throw new Error(`Unexpected URL: ${url}`);
    });

    vi.stubGlobal("fetch", fetchMock);

    const result = await resolveReadingFlowWithAi({
      year: "1990",
      month: "6",
      day: "15",
      hour: "14",
      minute: "30",
      city: "Kunshan",
      country: "China",
      birthTimePrecision: "exact",
    });

    expect(result.kind).toBe("ready");
    if (result.kind !== "ready") {
      throw new Error("Expected ready reading");
    }

    expect((result.reading as { body?: string[] }).body).toEqual([
      "You come across as mentally quick, but you do your real sorting later, once the emotional weather has calmed down.",
      "The strongest through-line here is curiosity first, trust second, which is why people often meet your speed before they understand your depth.",
    ]);
  });

  it("strips raw active-points metadata from the visible reading body", async () => {
    process.env.GEONAMES_USERNAME = "new163";
    process.env.RAPIDAPI_KEY = "test-key";
    process.env.RAPIDAPI_HOST = "astrologer.p.rapidapi.com";

    const fetchMock = vi.fn(async (input: RequestInfo | URL) => {
      const url = input.toString();

      if (url.includes("searchJSON")) {
        return Response.json({
          totalResultsCount: 1,
          geonames: [
            {
              geonameId: 1785623,
              name: "Kunshan",
              adminName1: "Jiangsu",
              countryName: "China",
              countryCode: "CN",
              lat: "31.37762",
              lng: "120.95431",
              population: 2092496,
            },
          ],
        });
      }

      if (url.includes("timezoneJSON")) {
        return Response.json({
          timezoneId: "Asia/Shanghai",
          lat: 31.37762,
          lng: 120.95431,
        });
      }

      if (url.includes("/api/v5/context/birth-chart")) {
        return Response.json({
          status: "OK",
          context:
            "<chart_analysis><paragraph>You tend to lead with quick pattern recognition, then decide what feels trustworthy after sitting with the emotional tone.</paragraph><active_points>Ascendant, Chiron, Descendant, Imum_Coeli, Jupiter, Mars, Mean_Lilith, Medium_Coeli, Mercury, Moon, Neptune, Pluto, Saturn, Sun, True_North_Lunar_Node, True_South_Lunar_Node, Uranus, Venus</active_points><active_aspects>conjunction (10), opposition (10), trine (8), sextile (6), square (5), quintile (1)</active_aspects><paragraph>The reading should stay focused on interpretation, not dump raw API metadata into the visible body.</paragraph></chart_analysis>",
        });
      }

      if (url.includes("/api/v5/chart-data/birth-chart")) {
        return Response.json({
          status: "OK",
          chart_data: {
            subject: {
              city: "Kunshan",
              nation: "CN",
              tz_str: "Asia/Shanghai",
              iso_formatted_local_datetime: "1990-06-15T14:30:00+08:00",
              iso_formatted_utc_datetime: "1990-06-15T06:30:00Z",
              sun: { sign: "Gem", house: "Ninth_House" },
              moon: { sign: "Pis", house: "Sixth_House" },
              mercury: { sign: "Gem", house: "Eighth_House" },
              venus: { sign: "Tau", house: "Eighth_House" },
              mars: { sign: "Ari", house: "Sixth_House" },
              ascendant: { sign: "Lib", house: "First_House" },
              medium_coeli: { sign: "Can", house: "Tenth_House" },
            },
          },
        });
      }

      throw new Error(`Unexpected URL: ${url}`);
    });

    vi.stubGlobal("fetch", fetchMock);

    const result = await resolveReadingFlowWithAi({
      year: "1990",
      month: "6",
      day: "15",
      hour: "14",
      minute: "30",
      city: "Kunshan",
      country: "China",
      birthTimePrecision: "exact",
    });

    expect(result.kind).toBe("ready");
    if (result.kind !== "ready") {
      throw new Error("Expected ready reading");
    }

    const visibleBody = (result.reading as { body?: string[] }).body?.join(" ") ?? "";
    expect(visibleBody).toContain("quick pattern recognition");
    expect(visibleBody).not.toContain("Ascendant, Chiron, Descendant");
    expect(visibleBody).not.toContain("conjunction (10)");
  });

  it("falls back to deterministic chart copy when natal context fails", async () => {
    process.env.GEONAMES_USERNAME = "new163";
    process.env.RAPIDAPI_KEY = "test-key";
    process.env.RAPIDAPI_HOST = "astrologer.p.rapidapi.com";

    const fetchMock = vi.fn(async (input: RequestInfo | URL) => {
      const url = input.toString();

      if (url.includes("searchJSON")) {
        return Response.json({
          totalResultsCount: 1,
          geonames: [
            {
              geonameId: 1785623,
              name: "Kunshan",
              adminName1: "Jiangsu",
              countryName: "China",
              countryCode: "CN",
              lat: "31.37762",
              lng: "120.95431",
              population: 2092496,
            },
          ],
        });
      }

      if (url.includes("timezoneJSON")) {
        return Response.json({
          timezoneId: "Asia/Shanghai",
          lat: 31.37762,
          lng: 120.95431,
        });
      }

      if (url.includes("/api/v5/context/birth-chart")) {
        throw new Error("context service unavailable");
      }

      if (url.includes("/api/v5/chart-data/birth-chart")) {
        return Response.json({
          status: "OK",
          chart_data: {
            subject: {
              city: "Kunshan",
              nation: "CN",
              tz_str: "Asia/Shanghai",
              iso_formatted_local_datetime: "1990-06-15T14:30:00+08:00",
              iso_formatted_utc_datetime: "1990-06-15T06:30:00Z",
              sun: { sign: "Gem", house: "Ninth_House" },
              moon: { sign: "Pis", house: "Sixth_House" },
              mercury: { sign: "Gem", house: "Eighth_House" },
              venus: { sign: "Tau", house: "Eighth_House" },
              mars: { sign: "Ari", house: "Sixth_House" },
              ascendant: { sign: "Lib", house: "First_House" },
              medium_coeli: { sign: "Can", house: "Tenth_House" },
            },
          },
        });
      }

      throw new Error(`Unexpected URL: ${url}`);
    });

    vi.stubGlobal("fetch", fetchMock);

    const result = await resolveReadingFlowWithAi({
      year: "1990",
      month: "6",
      day: "15",
      hour: "14",
      minute: "30",
      city: "Kunshan",
      country: "China",
      birthTimePrecision: "exact",
    });

    expect(result.kind).toBe("ready");
    if (result.kind !== "ready") {
      throw new Error("Expected ready reading");
    }

    expect((result.reading as { body?: string[] }).body?.[0]).toMatch(
      /双子座太阳/,
    );
    expect((result.reading as { body?: string[] }).body?.join(" ")).not.toContain(
      "context service unavailable",
    );
  });

  it("keeps exact-time fallback copy exact-time-consistent when exact-only fields are missing", async () => {
    process.env.GEONAMES_USERNAME = "new163";
    process.env.RAPIDAPI_KEY = "test-key";
    process.env.RAPIDAPI_HOST = "astrologer.p.rapidapi.com";

    const fetchMock = vi.fn(async (input: RequestInfo | URL) => {
      const url = input.toString();

      if (url.includes("searchJSON")) {
        return Response.json({
          totalResultsCount: 1,
          geonames: [
            {
              geonameId: 1785623,
              name: "Kunshan",
              adminName1: "Jiangsu",
              countryName: "China",
              countryCode: "CN",
              lat: "31.37762",
              lng: "120.95431",
              population: 2092496,
            },
          ],
        });
      }

      if (url.includes("timezoneJSON")) {
        return Response.json({
          timezoneId: "Asia/Shanghai",
          lat: 31.37762,
          lng: 120.95431,
        });
      }

      if (url.includes("/api/v5/context/transit")) {
        throw new Error("transit context unavailable");
      }

      if (url.includes("/api/v5/chart-data/transit")) {
        throw new Error("transit chart unavailable");
      }

      if (url.includes("/api/v5/context/birth-chart")) {
        throw new Error("context service unavailable");
      }

      if (url.includes("/api/v5/chart-data/birth-chart")) {
        return Response.json({
          status: "OK",
          chart_data: {
            subject: {
              city: "Kunshan",
              nation: "CN",
              tz_str: "Asia/Shanghai",
              iso_formatted_local_datetime: "1990-06-15T14:30:00+08:00",
              iso_formatted_utc_datetime: "1990-06-15T06:30:00Z",
              sun: { sign: "Gem", house: "Ninth_House" },
              moon: { sign: "Pis", house: "Sixth_House" },
              venus: { sign: "Tau", house: "Eighth_House" },
            },
          },
        });
      }

      throw new Error(`Unexpected URL: ${url}`);
    });

    vi.stubGlobal("fetch", fetchMock);

    const result = await resolveReadingFlowWithAi({
      year: "1990",
      month: "6",
      day: "15",
      hour: "14",
      minute: "30",
      city: "Kunshan",
      country: "China",
      birthTimePrecision: "exact",
    });

    expect(result.kind).toBe("ready");
    if (result.kind !== "ready") {
      throw new Error("Expected ready reading");
    }

    expect(result.reading.title).not.toMatch(/Unknown/i);
    expect(result.reading.title).toMatch(
      /缺少部分时间敏感的星盘细节/,
    );
    expect(result.reading.title).not.toMatch(/温和处理所有时间敏感细节/);
    expect(result.reading.sections?.[1]?.body).not.toMatch(/Unknown/i);
    expect(result.reading.sections?.[2]?.body).not.toMatch(/Unknown/i);
    expect(result.reading.body.join(" ")).not.toMatch(/Unknown/i);
    expect(result.reading.sections?.[1]?.body).toMatch(/更宽泛的方式/);
    expect(result.reading.sections?.[2]?.body).toMatch(
      /缺少部分时间敏感的星盘细节/,
    );
    expect(result.reading.sections?.[2]?.body).not.toMatch(/birth time is confirmed/i);
    expect(result.reading.sections?.[2]?.body).not.toMatch(/unconfirmed/i);
  });

  it("keeps approximate time readings context-first after filtering time-sensitive claims", async () => {
    process.env.GEONAMES_USERNAME = "new163";
    process.env.RAPIDAPI_KEY = "test-key";
    process.env.RAPIDAPI_HOST = "astrologer.p.rapidapi.com";

    const fetchMock = vi.fn(async (input: RequestInfo | URL) => {
      const url = input.toString();

      if (url.includes("searchJSON")) {
        return Response.json({
          totalResultsCount: 1,
          geonames: [
            {
              geonameId: 1785623,
              name: "Kunshan",
              adminName1: "Jiangsu",
              countryName: "China",
              countryCode: "CN",
              lat: "31.37762",
              lng: "120.95431",
              population: 2092496,
            },
          ],
        });
      }

      if (url.includes("timezoneJSON")) {
        return Response.json({
          timezoneId: "Asia/Shanghai",
          lat: 31.37762,
          lng: 120.95431,
        });
      }

      if (url.includes("/api/v5/context/birth-chart")) {
        return Response.json({
          status: "OK",
          context:
            "<reading><paragraph>You move fast toward meaning, but your emotional decisions still take time to settle into trust.</paragraph><paragraph>Libra rising makes the social surface look smoother than the private process beneath it.</paragraph><paragraph>What remains reliable here is the rhythm between quick curiosity and slower emotional confirmation.</paragraph></reading>",
          chart_data: {
            subject: {
              sun: { sign: "Gem", house: "Ninth_House" },
              moon: { sign: "Pis", house: "Sixth_House" },
              venus: { sign: "Tau", house: "Eighth_House" },
            },
          },
        });
      }

      if (url.includes("/api/v5/chart-data/birth-chart")) {
        return Response.json({
          status: "OK",
          chart_data: {
            subject: {
              city: "Kunshan",
              nation: "CN",
              tz_str: "Asia/Shanghai",
              iso_formatted_local_datetime: "1990-06-15T14:30:00+08:00",
              iso_formatted_utc_datetime: "1990-06-15T06:30:00Z",
              sun: { sign: "Gem", house: "Ninth_House" },
              moon: { sign: "Pis", house: "Sixth_House" },
              mercury: { sign: "Gem", house: "Eighth_House" },
              venus: { sign: "Tau", house: "Eighth_House" },
              mars: { sign: "Ari", house: "Sixth_House" },
              ascendant: { sign: "Lib", house: "First_House" },
              medium_coeli: { sign: "Can", house: "Tenth_House" },
            },
          },
        });
      }

      throw new Error(`Unexpected URL: ${url}`);
    });

    vi.stubGlobal("fetch", fetchMock);

    const result = await resolveReadingFlowWithAi({
      year: "1990",
      month: "6",
      day: "15",
      hour: "14",
      minute: "30",
      city: "Kunshan",
      country: "China",
      birthTimePrecision: "approximate",
    });

    expect(result.kind).toBe("ready");
    if (result.kind !== "ready") {
      throw new Error("Expected ready reading");
    }

    expect(result.reading.body).toEqual([
      "You move fast toward meaning, but your emotional decisions still take time to settle into trust.",
      "What remains reliable here is the rhythm between quick curiosity and slower emotional confirmation.",
    ]);
    expect(result.reading.body.join(" ")).not.toMatch(/rising|Midheaven/i);
    expect(result.reading.body[0]).not.toMatch(/this reading stays grounded/i);
  });

  it("keeps unknown time readings context-first after filtering time-sensitive claims", async () => {
    process.env.GEONAMES_USERNAME = "new163";
    process.env.RAPIDAPI_KEY = "test-key";
    process.env.RAPIDAPI_HOST = "astrologer.p.rapidapi.com";

    const fetchMock = vi.fn(async (input: RequestInfo | URL) => {
      const url = input.toString();

      if (url.includes("searchJSON")) {
        return Response.json({
          totalResultsCount: 1,
          geonames: [
            {
              geonameId: 1785623,
              name: "Kunshan",
              adminName1: "Jiangsu",
              countryName: "China",
              countryCode: "CN",
              lat: "31.37762",
              lng: "120.95431",
              population: 2092496,
            },
          ],
        });
      }

      if (url.includes("timezoneJSON")) {
        return Response.json({
          timezoneId: "Asia/Shanghai",
          lat: 31.37762,
          lng: 120.95431,
        });
      }

      if (url.includes("/api/v5/context/birth-chart")) {
        return Response.json({
          status: "OK",
          context:
            "<reading><paragraph>Your first move is still curiosity, and the stronger pattern is how slowly trust arrives after the first wave of contact.</paragraph><paragraph>The ascendant story is intentionally unstable here without a confirmed birth time.</paragraph><paragraph>That leaves a reading centered on instinct, sensitivity, and the pace at which emotional certainty catches up.</paragraph></reading>",
          chart_data: {
            subject: {
              sun: { sign: "Gem", house: "Ninth_House" },
              moon: { sign: "Pis", house: "Sixth_House" },
              venus: { sign: "Tau", house: "Eighth_House" },
            },
          },
        });
      }

      if (url.includes("/api/v5/chart-data/birth-chart")) {
        return Response.json({
          status: "OK",
          chart_data: {
            subject: {
              city: "Kunshan",
              nation: "CN",
              tz_str: "Asia/Shanghai",
              iso_formatted_local_datetime: "1990-06-15T12:00:00+08:00",
              iso_formatted_utc_datetime: "1990-06-15T04:00:00Z",
              sun: { sign: "Gem", house: "Ninth_House" },
              moon: { sign: "Pis", house: "Sixth_House" },
              mercury: { sign: "Gem", house: "Eighth_House" },
              venus: { sign: "Tau", house: "Eighth_House" },
              mars: { sign: "Ari", house: "Sixth_House" },
              ascendant: { sign: "Lib", house: "First_House" },
              medium_coeli: { sign: "Can", house: "Tenth_House" },
            },
          },
        });
      }

      throw new Error(`Unexpected URL: ${url}`);
    });

    vi.stubGlobal("fetch", fetchMock);

    const result = await resolveReadingFlowWithAi({
      year: "1990",
      month: "6",
      day: "15",
      city: "Kunshan",
      country: "China",
      birthTimePrecision: "unknown",
    });

    expect(result.kind).toBe("ready");
    if (result.kind !== "ready") {
      throw new Error("Expected ready reading");
    }

    expect(result.reading.body).toEqual([
      "Your first move is still curiosity, and the stronger pattern is how slowly trust arrives after the first wave of contact.",
      "That leaves a reading centered on instinct, sensitivity, and the pace at which emotional certainty catches up.",
    ]);
    expect(result.reading.body.join(" ")).not.toMatch(/ascendant|rising|Midheaven/i);
    expect(result.reading.body[0]).not.toMatch(/this reading keeps the chart grounded/i);
  });

  it("returns ready from resolveReadingFlow with a client-safe discriminated union", async () => {
    process.env.GEONAMES_USERNAME = "new163";
    process.env.RAPIDAPI_KEY = "test-key";
    process.env.RAPIDAPI_HOST = "astrologer.p.rapidapi.com";

    const fetchMock = vi.fn(async (input: RequestInfo | URL) => {
      const url = input.toString();

      if (url.includes("searchJSON")) {
        return Response.json({
          totalResultsCount: 1,
          geonames: [
            {
              geonameId: 1785623,
              name: "Kunshan",
              adminName1: "Jiangsu",
              countryName: "China",
              countryCode: "CN",
              lat: "31.37762",
              lng: "120.95431",
              population: 2092496,
            },
          ],
        });
      }

      if (url.includes("timezoneJSON")) {
        return Response.json({
          timezoneId: "Asia/Shanghai",
          lat: 31.37762,
          lng: 120.95431,
        });
      }

      if (url.includes("/api/v5/chart-data/birth-chart")) {
        return Response.json({
          status: "OK",
          chart_data: {
            subject: {
              city: "Kunshan",
              nation: "CN",
              tz_str: "Asia/Shanghai",
              iso_formatted_local_datetime: "1990-06-15T14:30:00+08:00",
              iso_formatted_utc_datetime: "1990-06-15T06:30:00Z",
              sun: { sign: "Gem", house: "Ninth_House" },
              moon: { sign: "Pis", house: "Sixth_House" },
              mercury: { sign: "Gem", house: "Eighth_House" },
              venus: { sign: "Tau", house: "Eighth_House" },
              mars: { sign: "Ari", house: "Sixth_House" },
              ascendant: { sign: "Lib", house: "First_House" },
              medium_coeli: { sign: "Can", house: "Tenth_House" },
            },
          },
        });
      }

      throw new Error(`Unexpected URL: ${url}`);
    });

    vi.stubGlobal("fetch", fetchMock);

    const result = await resolveReadingFlowWithAi({
      year: "1990",
      month: "6",
      day: "15",
      hour: "14",
      minute: "30",
      city: "Kunshan",
      country: "China",
      birthTimePrecision: "exact",
    });

    expect(result.kind).toBe("ready");
    if (result.kind !== "ready") {
      throw new Error("Expected ready reading");
    }
    expect(result.reading).toMatchObject({
      certaintyLabel: "准确出生时间",
      trustItems: expect.arrayContaining([
        expect.stringContaining("Kunshan"),
        expect.stringContaining("Asia/Shanghai"),
      ]),
    });
  });

  it("allows unknown precision to resolve without hour and minute", async () => {
    process.env.GEONAMES_USERNAME = "new163";
    process.env.RAPIDAPI_KEY = "test-key";
    process.env.RAPIDAPI_HOST = "astrologer.p.rapidapi.com";

    const fetchMock = vi.fn(async (input: RequestInfo | URL) => {
      const url = input.toString();

      if (url.includes("searchJSON")) {
        return Response.json({
          totalResultsCount: 1,
          geonames: [
            {
              geonameId: 1785623,
              name: "Kunshan",
              adminName1: "Jiangsu",
              countryName: "China",
              countryCode: "CN",
              lat: "31.37762",
              lng: "120.95431",
              population: 2092496,
            },
          ],
        });
      }

      if (url.includes("timezoneJSON")) {
        return Response.json({
          timezoneId: "Asia/Shanghai",
          lat: 31.37762,
          lng: 120.95431,
        });
      }

      if (url.includes("/api/v5/chart-data/birth-chart")) {
        return Response.json({
          status: "OK",
          chart_data: {
            subject: {
              city: "Kunshan",
              nation: "CN",
              tz_str: "Asia/Shanghai",
              iso_formatted_local_datetime: "1990-06-15T12:00:00+08:00",
              iso_formatted_utc_datetime: "1990-06-15T04:00:00Z",
              sun: { sign: "Gem", house: "Ninth_House" },
              moon: { sign: "Pis", house: "Sixth_House" },
              mercury: { sign: "Gem", house: "Eighth_House" },
              venus: { sign: "Tau", house: "Eighth_House" },
              mars: { sign: "Ari", house: "Sixth_House" },
              ascendant: { sign: "Lib", house: "First_House" },
              medium_coeli: { sign: "Can", house: "Tenth_House" },
            },
          },
        });
      }

      throw new Error(`Unexpected URL: ${url}`);
    });

    vi.stubGlobal("fetch", fetchMock);

    const result = await resolveReadingFlowWithAi({
      year: "1990",
      month: "6",
      day: "15",
      city: "Kunshan",
      country: "China",
      birthTimePrecision: "unknown",
    });

    expect(result.kind).toBe("ready");
    if (result.kind !== "ready") {
      throw new Error("Expected ready reading");
    }
    expect(result.reading.certaintyLabel).toBe("未知出生时间");
  });

  it("uses the neutral fallback time for unknown precision even when hour and minute are present", async () => {
    process.env.GEONAMES_USERNAME = "new163";
    process.env.RAPIDAPI_KEY = "test-key";
    process.env.RAPIDAPI_HOST = "astrologer.p.rapidapi.com";

    const fetchMock = vi.fn(async (input: RequestInfo | URL, init?: RequestInit) => {
      const url = input.toString();

      if (url.includes("searchJSON")) {
        return Response.json({
          totalResultsCount: 1,
          geonames: [
            {
              geonameId: 1785623,
              name: "Kunshan",
              adminName1: "Jiangsu",
              countryName: "China",
              countryCode: "CN",
              lat: "31.37762",
              lng: "120.95431",
              population: 2092496,
            },
          ],
        });
      }

      if (url.includes("timezoneJSON")) {
        return Response.json({
          timezoneId: "Asia/Shanghai",
          lat: 31.37762,
          lng: 120.95431,
        });
      }

      if (url.includes("/api/v5/context/birth-chart")) {
        const payload = JSON.parse(String(init?.body));
        expect(payload.subject.hour).toBe(12);
        expect(payload.subject.minute).toBe(0);

        return Response.json({
          status: "OK",
          context:
            "<reading><paragraph>A neutral time was used.</paragraph></reading>",
          chart_data: {
            subject: {
              sun: { sign: "Gem", house: "Ninth_House" },
              moon: { sign: "Pis", house: "Sixth_House" },
              venus: { sign: "Tau", house: "Eighth_House" },
            },
          },
        });
      }

      if (url.includes("/api/v5/chart-data/birth-chart")) {
        const payload = JSON.parse(String(init?.body));
        expect(payload.subject.hour).toBe(12);
        expect(payload.subject.minute).toBe(0);

        return Response.json({
          status: "OK",
          chart_data: {
            subject: {
              city: "Kunshan",
              nation: "CN",
              tz_str: "Asia/Shanghai",
              iso_formatted_local_datetime: "1990-06-15T12:00:00+08:00",
              iso_formatted_utc_datetime: "1990-06-15T04:00:00Z",
              sun: { sign: "Gem", house: "Ninth_House" },
              moon: { sign: "Pis", house: "Sixth_House" },
              mercury: { sign: "Gem", house: "Eighth_House" },
              venus: { sign: "Tau", house: "Eighth_House" },
              mars: { sign: "Ari", house: "Sixth_House" },
              ascendant: { sign: "Lib", house: "First_House" },
              medium_coeli: { sign: "Can", house: "Tenth_House" },
            },
          },
        });
      }

      throw new Error(`Unexpected URL: ${url}`);
    });

    vi.stubGlobal("fetch", fetchMock);

    const result = await resolveReadingFlowWithAi({
      year: "1990",
      month: "6",
      day: "15",
      hour: "23",
      minute: "59",
      city: "Kunshan",
      country: "China",
      birthTimePrecision: "unknown",
    });

    expect(result.kind).toBe("ready");
  });

  it("does not resolve a same-named city from the wrong requested country", async () => {
    process.env.GEONAMES_USERNAME = "new163";
    process.env.RAPIDAPI_KEY = "test-key";

    const fetchMock = vi.fn(async (input: RequestInfo | URL) => {
      const url = input.toString();

      if (url.includes("searchJSON")) {
        return Response.json({
          totalResultsCount: 2,
          geonames: [
            {
              geonameId: 1,
              name: "Springfield",
              adminName1: "Illinois",
              countryName: "United States",
              countryCode: "US",
              lat: "39.8017",
              lng: "-89.6436",
              population: 114394,
            },
            {
              geonameId: 2,
              name: "Springfield",
              adminName1: "Queensland",
              countryName: "Australia",
              countryCode: "AU",
              lat: "-27.6779",
              lng: "152.8987",
              population: 9472,
            },
          ],
        });
      }

      throw new Error(`Unexpected URL: ${url}`);
    });

    vi.stubGlobal("fetch", fetchMock);

    const result = await resolveReadingFlow({
      year: "1990",
      month: "6",
      day: "15",
      hour: "14",
      minute: "30",
      city: "Springfield",
      country: "Canada",
      birthTimePrecision: "exact",
    });

    expect(result).toEqual({ kind: "reading-unavailable" });
  });

  it("does not auto-resolve a single same-named city when it belongs to the wrong country", async () => {
    process.env.GEONAMES_USERNAME = "new163";
    process.env.RAPIDAPI_KEY = "test-key";

    const fetchMock = vi.fn(async (input: RequestInfo | URL) => {
      const url = input.toString();

      if (url.includes("searchJSON")) {
        return Response.json({
          totalResultsCount: 1,
          geonames: [
            {
              geonameId: 1,
              name: "Springfield",
              adminName1: "Illinois",
              countryName: "United States",
              countryCode: "US",
              lat: "39.8017",
              lng: "-89.6436",
              population: 114394,
            },
          ],
        });
      }

      throw new Error(`Unexpected URL: ${url}`);
    });

    vi.stubGlobal("fetch", fetchMock);

    const result = await resolveReadingFlow({
      year: "1990",
      month: "6",
      day: "15",
      hour: "14",
      minute: "30",
      city: "Springfield",
      country: "Canada",
      birthTimePrecision: "exact",
    });

    expect(result).toEqual({ kind: "reading-unavailable" });
    expect(fetchMock).toHaveBeenCalledTimes(1);
  });

  it("returns reading-unavailable for malformed or out-of-range numeric input", async () => {
    process.env.GEONAMES_USERNAME = "new163";
    process.env.RAPIDAPI_KEY = "test-key";

    const fetchMock = vi.fn(async () => {
      throw new Error("fetch should not be called");
    });

    vi.stubGlobal("fetch", fetchMock);

    await expect(
      resolveReadingFlow({
        year: "1990abc",
        month: "13",
        day: "32",
        hour: "24",
        minute: "60",
        city: "Kunshan",
        country: "China",
        birthTimePrecision: "exact",
      }),
    ).resolves.toEqual({
      kind: "reading-unavailable",
      code: "invalid-input",
      message: "请检查出生日期、时间和定位权限后再试一次。",
      retryable: false,
    });

    expect(fetchMock).not.toHaveBeenCalled();
  });

  it("accepts a six-digit postal code without requiring city or country", () => {
    const parsed = parseReadingSearchParams({
      year: "1990",
      month: "6",
      day: "15",
      hour: "14",
      minute: "30",
      postalCode: "215300",
      birthTimePrecision: "exact",
    });

    expect(parsed.postalCode).toBe("215300");
    expect(parsed.city).toBe("");
    expect(parsed.country).toBe("China");
  });

  it("accepts browser coordinates without requiring postal code, city, or country", () => {
    const parsed = parseReadingSearchParams({
      year: "1990",
      month: "6",
      day: "15",
      hour: "14",
      minute: "30",
      latitude: "31.37762",
      longitude: "120.95431",
      birthTimePrecision: "exact",
    });

    expect(parsed.latitude).toBe(31.37762);
    expect(parsed.longitude).toBe(120.95431);
    expect(parsed.postalCode).toBeUndefined();
    expect(parsed.city).toBe("");
    expect(parsed.country).toBe("");
  });

  it("rejects malformed browser coordinates", () => {
    expect(() =>
      parseReadingSearchParams({
        year: "1990",
        month: "6",
        day: "15",
        hour: "14",
        minute: "30",
        latitude: "91",
        longitude: "120.95431",
        birthTimePrecision: "exact",
      }),
    ).toThrow(/coordinates/i);
  });

  it("rejects malformed postal codes", () => {
    expect(() =>
      parseReadingSearchParams({
        year: "1990",
        month: "6",
        day: "15",
        hour: "14",
        minute: "30",
        postalCode: "2153",
        birthTimePrecision: "exact",
      }),
    ).toThrow(/postal code/i);
  });

  it("maps invalid OpenAI API key errors to service unavailable", () => {
    expect(
      buildReadingUnavailableFromError(
        new Error("401 Incorrect API key provided: sk-proj-***"),
      ),
    ).toEqual({
      kind: "reading-unavailable",
      code: "service-unavailable",
      message: "当前 AI 服务配置不可用，请检查 OpenAI API Key。",
      retryable: true,
    });
  });

  it("resolves browser coordinates through timezone lookup without postal lookup", async () => {
    process.env.GEONAMES_USERNAME = "new163";
    process.env.RAPIDAPI_KEY = "test-key";
    process.env.RAPIDAPI_HOST = "astrologer.p.rapidapi.com";

    const fetchMock = vi.fn(async (input: RequestInfo | URL) => {
      const url = input.toString();

      if (url.includes("timezoneJSON")) {
        return Response.json({
          timezoneId: "Asia/Shanghai",
          countryName: "China",
          countryCode: "CN",
        });
      }

      if (url.includes("/api/v5/chart-data/birth-chart")) {
        return new Response("rate limited", {
          status: 429,
        });
      }

      throw new Error(`Unexpected URL: ${url}`);
    });

    vi.stubGlobal("fetch", fetchMock);

    await expect(
      resolveReadingFlow({
        year: "1990",
        month: "6",
        day: "15",
        hour: "14",
        minute: "30",
        latitude: "31.37762",
        longitude: "120.95431",
        birthTimePrecision: "exact",
      }),
    ).resolves.toMatchObject({
      kind: "reading-unavailable",
      code: "rate-limited",
    });

    const requestedUrls = fetchMock.mock.calls.map(([input]) => input.toString());
    expect(requestedUrls).toEqual(
      expect.arrayContaining([
        expect.stringContaining("timezoneJSON?lat=31.37762&lng=120.95431"),
      ]),
    );
    expect(requestedUrls.some((url) => url.includes("postalCodeLookupJSON"))).toBe(false);
  });

  it("returns a specific unavailable message when the astrologer API is rate limited", async () => {
    process.env.GEONAMES_USERNAME = "new163";
    process.env.RAPIDAPI_KEY = "test-key";
    process.env.RAPIDAPI_HOST = "astrologer.p.rapidapi.com";

    const fetchMock = vi.fn(async (input: RequestInfo | URL) => {
      const url = input.toString();

      if (url.includes("postalCodeLookupJSON")) {
        return Response.json({
          postalcodes: [
            {
              postalCode: "215300",
              placeName: "Kunshan",
              adminName1: "Jiangsu",
              countryCode: "CN",
              lat: "31.37762",
              lng: "120.95431",
            },
          ],
        });
      }

      if (url.includes("timezoneJSON")) {
        return Response.json({
          timezoneId: "Asia/Shanghai",
          lat: 31.37762,
          lng: 120.95431,
        });
      }

      if (url.includes("/api/v5/chart-data/birth-chart")) {
        return new Response("rate limited", {
          status: 429,
        });
      }

      throw new Error(`Unexpected URL: ${url}`);
    });

    vi.stubGlobal("fetch", fetchMock);

    await expect(
      resolveReadingFlow({
        year: "1990",
        month: "6",
        day: "15",
        hour: "14",
        minute: "30",
        postalCode: "215300",
        birthTimePrecision: "exact",
      }),
    ).resolves.toEqual({
      kind: "reading-unavailable",
      code: "rate-limited",
      message: "当前星盘服务请求过多，请稍后再试。",
      retryable: true,
    });
  });

  it("POST /api/reading returns reading-unavailable when AI output is unavailable", async () => {
    process.env.GEONAMES_USERNAME = "new163";
    process.env.RAPIDAPI_KEY = "test-key";
    process.env.RAPIDAPI_HOST = "astrologer.p.rapidapi.com";
    process.env.READING_SESSION_SECRET = "test-secret";

    const fetchMock = vi.fn(async (input: RequestInfo | URL) => {
      const url = input.toString();

      if (url.includes("searchJSON")) {
        return Response.json({
          totalResultsCount: 1,
          geonames: [
            {
              geonameId: 1785623,
              name: "Kunshan",
              adminName1: "Jiangsu",
              countryName: "China",
              countryCode: "CN",
              lat: "31.37762",
              lng: "120.95431",
              population: 2092496,
            },
          ],
        });
      }

      if (url.includes("timezoneJSON")) {
        return Response.json({
          timezoneId: "Asia/Shanghai",
          lat: 31.37762,
          lng: 120.95431,
        });
      }

      if (url.includes("/api/v5/chart-data/birth-chart")) {
        return Response.json({
          status: "OK",
          chart_data: {
            subject: {
              city: "Kunshan",
              nation: "CN",
              tz_str: "Asia/Shanghai",
              iso_formatted_local_datetime: "1990-06-15T14:30:00+08:00",
              iso_formatted_utc_datetime: "1990-06-15T06:30:00Z",
              sun: { sign: "Gem", house: "Ninth_House" },
              moon: { sign: "Pis", house: "Sixth_House" },
              mercury: { sign: "Gem", house: "Eighth_House" },
              venus: { sign: "Tau", house: "Eighth_House" },
              mars: { sign: "Ari", house: "Sixth_House" },
              ascendant: { sign: "Lib", house: "First_House" },
              medium_coeli: { sign: "Can", house: "Tenth_House" },
            },
          },
        });
      }

      throw new Error(`Unexpected URL: ${url}`);
    });

    vi.stubGlobal("fetch", fetchMock);

    const response = await POST(
      new Request("http://localhost/api/reading", {
        method: "POST",
        headers: {
          "content-type": "application/json",
        },
        body: JSON.stringify({
          year: "1990",
          month: "6",
          day: "15",
          hour: "14",
          minute: "30",
          city: "Kunshan",
          country: "China",
          birthTimePrecision: "exact",
        }),
      }),
    );

    expect(response.status).toBe(503);
    expect(await response.json()).toMatchObject({
      kind: "reading-unavailable",
      code: "service-unavailable",
      retryable: true,
    });
  });

  it("returns ready with session state when the model layer succeeds", async () => {
    process.env.GEONAMES_USERNAME = "new163";
    process.env.RAPIDAPI_KEY = "test-key";
    process.env.RAPIDAPI_HOST = "astrologer.p.rapidapi.com";
    process.env.READING_SESSION_SECRET = "test-secret";

    const fetchMock = vi.fn(async (input: RequestInfo | URL) => {
      const url = input.toString();

      if (url.includes("searchJSON")) {
        return Response.json({
          totalResultsCount: 1,
          geonames: [
            {
              geonameId: 1785623,
              name: "Kunshan",
              adminName1: "Jiangsu",
              countryName: "China",
              countryCode: "CN",
              lat: "31.37762",
              lng: "120.95431",
              population: 2092496,
            },
          ],
        });
      }

      if (url.includes("timezoneJSON")) {
        return Response.json({
          timezoneId: "Asia/Shanghai",
          lat: 31.37762,
          lng: 120.95431,
        });
      }

      if (url.includes("/api/v5/context/transit")) {
        return Response.json({
          status: "OK",
          context:
            "<reading><paragraph>Current transits emphasize movement and emotional processing.</paragraph><paragraph>Over the next 4-8 weeks, the mood stays fluid while practical follow-through matters more than speed.</paragraph></reading>",
        });
      }

      if (url.includes("/api/v5/chart-data/transit")) {
        return Response.json({
          status: "OK",
          chart_data: {
            subject: {
              sun: { sign: "Ari" },
              moon: { sign: "Can" },
            },
          },
        });
      }

      if (url.includes("/api/v5/context/birth-chart")) {
        return Response.json({
          status: "OK",
          context:
            "<reading><paragraph>You come across as mentally quick, but you do your real sorting later.</paragraph></reading>",
        });
      }

      if (url.includes("/api/v5/chart-data/birth-chart")) {
        return Response.json({
          status: "OK",
          chart_data: {
            subject: {
              city: "Kunshan",
              nation: "CN",
              tz_str: "Asia/Shanghai",
              iso_formatted_local_datetime: "1990-06-15T14:30:00+08:00",
              iso_formatted_utc_datetime: "1990-06-15T06:30:00Z",
              sun: { sign: "Gem", house: "Ninth_House" },
              moon: { sign: "Pis", house: "Sixth_House" },
              mercury: { sign: "Gem", house: "Eighth_House" },
              venus: { sign: "Tau", house: "Eighth_House" },
              mars: { sign: "Ari", house: "Sixth_House" },
              ascendant: { sign: "Lib", house: "First_House" },
              medium_coeli: { sign: "Can", house: "Tenth_House" },
            },
          },
        });
      }

      throw new Error(`Unexpected URL: ${url}`);
    });

    vi.stubGlobal("fetch", fetchMock);

    const result = await resolveReadingFlow(
      {
        year: "1990",
        month: "6",
        day: "15",
        hour: "14",
        minute: "30",
        city: "Kunshan",
        country: "China",
        birthTimePrecision: "exact",
      },
      {
        aiClient: createReadingAiClient(),
      },
    );

    expect(result.kind).toBe("ready");
    if (result.kind !== "ready") {
      throw new Error("Expected ready outcome");
    }

    expect(result.primary.title).toBe("理解世界，也要筛选真正可信的连接。");
    expect(result.analysis.sections.personality.summary).toBe(
      "你的核心人格偏向开放吸收，再经过情绪过滤形成判断。",
    );
    expect(result.sessionToken).toEqual(expect.any(String));
    expect(result.followUpOptions).toEqual([
      "love",
      "career-change",
      "anxiety",
    ]);
    expect(result.remainingFollowUps).toBe(3);
  });

  it("sanitizes repeated bullets and overlong titles from the AI layer", () => {
    const result = sanitizeStructuredReading({
      chartPayload: {
        meta: {
          chartType: "natal",
          localDateTime: "1990-06-15T14:30:00-04:00",
          utcDateTime: "1990-06-15T18:30:00Z",
          timezone: "America/New_York",
          birthTimePrecision: "exact",
          locationLabel: "New York, United States",
        },
        points: {
          sun: {
            id: "sun",
            label: "Sun",
            sign: "Gem",
            house: "Ninth_House",
            position: 24.1,
            absPos: 84.1,
            retrograde: false,
          },
          moon: {
            id: "moon",
            label: "Moon",
            sign: "Pis",
            house: "Sixth_House",
            position: 11.2,
            absPos: 341.2,
            retrograde: false,
          },
          mercury: {
            id: "mercury",
            label: "Mercury",
            sign: "Can",
            house: "Ninth_House",
            position: 1.4,
            absPos: 91.4,
            retrograde: false,
          },
          venus: {
            id: "venus",
            label: "Venus",
            sign: "Tau",
            house: "Eighth_House",
            position: 17.8,
            absPos: 47.8,
            retrograde: false,
          },
          mars: {
            id: "mars",
            label: "Mars",
            sign: "Aqu",
            house: "Fourth_House",
            position: 4.3,
            absPos: 304.3,
            retrograde: false,
          },
          ascendant: {
            id: "ascendant",
            label: "Ascendant",
            sign: "Lib",
            house: "First_House",
            position: 13.6,
            absPos: 193.6,
            retrograde: false,
          },
          mediumCoeli: {
            id: "mediumCoeli",
            label: "Medium Coeli",
            sign: "Can",
            house: "Tenth_House",
            position: 14.4,
            absPos: 104.4,
            retrograde: false,
          },
        },
        houses: {
          cusps: [193.6, 223.2, 252.1],
          list: [
            {
              house: "First_House",
              sign: "Lib",
              position: 13.6,
              absPos: 193.6,
            },
          ],
        },
        aspects: {
          all: [],
          relevant: [],
        },
        derivedSignals: {
          angularPoints: ["ascendant", "mediumCoeli"],
          repeatedHouseThemes: ["Ninth_House"],
          repeatedSignThemes: [],
          confidenceDowngrades: [],
        },
        inputContext: {
          country: "United States",
          postalCode: "10001",
        },
      },
      explanation: {
        overview:
          "这张盘把双子座第九宫的太阳、双鱼座第五宫的月亮、天秤上升与金星八宫放在同一条线上，所以你会先快速理解世界，再慢慢确认真正值得信任的人与方向。这种组合强调理解、筛选、再投入。这种组合强调理解、筛选、再投入。",
        keyPatterns: [
          {
            title: "快速理解，慢速信任，这是一条很长的标题",
            explanation:
              "双子座太阳落在第九宫，双鱼座月亮落在第五宫，天秤上升又把关系感受拉进来，所以你会先快速理解世界，再慢慢确认真正值得信任的人与方向。双子座太阳落在第九宫，双鱼座月亮落在第五宫，天秤上升又把关系感受拉进来，所以你会先快速理解世界，再慢慢确认真正值得信任的人与方向。",
            evidence: [
              { label: "太阳", refs: ["points.sun.sign"] },
              { label: "月亮", refs: ["points.moon.sign"] },
              { label: "上升", refs: ["points.ascendant.sign"] },
            ],
          },
          {
            title: "关系过滤",
            explanation: "你会先观察互动质量，再决定是否真正投入。",
            evidence: [{ label: "金星", refs: ["points.venus.sign"] }],
          },
          {
            title: "主线收束",
            explanation: "你适合先打开视野，再逐步收束长期方向。",
            evidence: [{ label: "中天", refs: ["points.mediumCoeli.sign"] }],
          },
        ],
        terminologyNotes: [
          "第九宫通常和视野、学习、远行有关，这里重点看你如何扩大理解边界。",
          "第九宫通常和视野、学习、远行有关，这里重点看你如何扩大理解边界。",
        ],
        caveats: ["出生时间越精确，宫位相关判断越稳。"],
      },
      analysis: {
        sections: {
          personality: {
            summary:
              "双子座太阳落在第九宫，双鱼座月亮落在第五宫，把好奇心和更容易感受环境的情绪节奏放在同一条主线上。你通常会先快速靠近知识与意义，再慢一些消化周围氛围。",
            bullets: [
              "双子座太阳落在第九宫，把好奇心和更容易感受环境的情绪节奏放在同一条主线上。你通常会先快速靠近知识与意义，再慢一些消化周围氛围。",
              "先理解，再决定靠多近。",
            ],
            evidence: [{ label: "太阳与月亮", refs: ["points.sun.sign", "points.moon.sign"] }],
            confidence: "high",
          },
          behaviorAndThinking: {
            summary: "你习惯先把信息铺开，再慢慢筛出真正重要的线索。",
            bullets: ["需要定期收束注意力。"],
            evidence: [{ label: "水星", refs: ["points.mercury.sign"] }],
            confidence: "medium",
          },
          relationshipsAndEmotions: {
            summary: "关系里既想靠近，也会保留观察空间。",
            bullets: ["先看回应，再决定投入。"],
            evidence: [{ label: "金星", refs: ["points.venus.sign"] }],
            confidence: "medium",
          },
          careerAndGrowth: {
            summary: "发展路径适合先扩展视野，再慢慢收束主线。",
            bullets: ["先打开，再定方向。"],
            evidence: [{ label: "中天", refs: ["points.mediumCoeli.sign"] }],
            confidence: "medium",
          },
          strengthsAndRisks: {
            summary: "优势在理解快，风险在容易被过多信息牵动。",
            bullets: ["需要主动收束注意力。"],
            evidence: [{ label: "重复主题", refs: ["derivedSignals.repeatedSignThemes"] }],
            confidence: "medium",
          },
          lifeThemes: {
            summary:
              "理解世界与筛选连接之间保持清醒边界，同时继续扩展认知与关系的真正主线，这是一条明显过长的标题",
            bullets: [
              "理解世界与筛选连接之间保持清醒边界，同时继续扩展认知与关系的真正主线，这是一条明显过长的标题",
            ],
            evidence: [{ label: "人生主题", refs: ["points.sun.house"] }],
            confidence: "high",
          },
          timeDimension: {
            summary: "当前适合渐进推进，而不是一次定局。",
            bullets: ["先观察节奏，再做大动作。"],
            evidence: [{ label: "时间维度", refs: ["meta.birthTimePrecision"] }],
            confidence: "low",
          },
        },
      },
      forecast: {
        nearTerm: {
          love: {
            theme: "关系观察期关系观察期关系观察期",
            forecast:
              "未来 30-90 天更适合观察互动质量，而不是急着定性。未来 30-90 天更适合观察互动质量，而不是急着定性。",
            opportunities: ["看清谁能稳定回应你。", "看清谁能稳定回应你。"],
            risks: ["因为节奏不一致而误判关系。"],
            timingNotes: ["先观察，再定边界。", "先观察，再定边界。"],
            evidence: [{ label: "近程关系", refs: ["futureWindowSummary.summary"] }],
            confidence: "medium",
          },
          career: {
            theme: "方向校准期",
            forecast: "近期更适合校准节奏，而不是同时铺开太多目标。",
            opportunities: ["重排优先级。"],
            risks: ["被并行事项分散。"],
            timingNotes: ["先减法，再推进。"],
            evidence: [{ label: "近程职业", refs: ["futureWindowSummary.summary"] }],
            confidence: "medium",
          },
          emotion: {
            theme: "情绪回收期",
            forecast: "需要先回收注意力，再恢复稳定判断。",
            opportunities: ["重新分配精力。"],
            risks: ["情绪受外界节奏牵动。"],
            timingNotes: ["节奏宜慢一点。"],
            evidence: [{ label: "近程情绪", refs: ["futureWindowSummary.summary"] }],
            confidence: "low",
          },
          social: {
            theme: "圈层调整期",
            forecast: "社交关系会更重质量而不是数量。",
            opportunities: ["留下有效连接。"],
            risks: ["对无效互动失去耐心。"],
            timingNotes: ["优先稳定回应。"],
            evidence: [{ label: "近程社交", refs: ["futureWindowSummary.summary"] }],
            confidence: "medium",
          },
          finance: {
            theme: "资源整理期",
            forecast: "更适合整理资源，而不是急着放大投入。",
            opportunities: ["看清支出结构。"],
            risks: ["分散投入。"],
            timingNotes: ["先收拢再扩张。"],
            evidence: [{ label: "近程财务", refs: ["futureWindowSummary.summary"] }],
            confidence: "low",
          },
        },
        yearAhead: {
          love: {
            theme: "关系重估期",
            forecast: "一年内会更看重持续回应与边界清晰。",
            opportunities: ["留下真正能并肩的人。"],
            risks: ["对模糊关系耐心下降。"],
            timingNotes: ["稳定比速度重要。"],
            evidence: [{ label: "年度关系", refs: ["futureWindowSummary.summary"] }],
            confidence: "medium",
          },
          career: {
            theme: "主线收束期",
            forecast: "长期发展会越来越强调主线感。",
            opportunities: ["形成稳定方向。"],
            risks: ["扩张过宽。"],
            timingNotes: ["边做边收束。"],
            evidence: [{ label: "年度职业", refs: ["futureWindowSummary.summary"] }],
            confidence: "medium",
          },
          emotion: {
            theme: "内核稳定期",
            forecast: "情绪判断会比现在更稳。",
            opportunities: ["减少外界牵动。"],
            risks: ["在过渡期反复拉扯。"],
            timingNotes: ["先稳住内节奏。"],
            evidence: [{ label: "年度情绪", refs: ["futureWindowSummary.summary"] }],
            confidence: "medium",
          },
          social: {
            theme: "关系换挡期",
            forecast: "社交圈会更强调长期互信。",
            opportunities: ["筛出稳定连接。"],
            risks: ["旧关系自然淡出。"],
            timingNotes: ["自然换挡即可。"],
            evidence: [{ label: "年度社交", refs: ["futureWindowSummary.summary"] }],
            confidence: "medium",
          },
          finance: {
            theme: "配置重整期",
            forecast: "资源配置会更偏稳健。",
            opportunities: ["理清配置顺序。"],
            risks: ["被短期波动带节奏。"],
            timingNotes: ["先清理，再配置。"],
            evidence: [{ label: "年度财务", refs: ["futureWindowSummary.summary"] }],
            confidence: "low",
          },
        },
      },
    });

    expect(result.primary.title.length).toBeLessThanOrEqual(36);
    expect(result.primary.title).not.toContain("这是一条明显过长的标题");
    expect(result.primary.chartEvidence).toEqual([
      "太阳双子座",
      "月亮双鱼座",
      "水星巨蟹座",
      "金星金牛座",
      "火星水瓶座",
      "上升天秤座",
      "MC巨蟹座",
    ]);
    expect(result.analysis.sections.personality.bullets).toEqual([
      "先理解，再决定靠多近。",
    ]);
    expect(result.analysis.sections.lifeThemes.bullets).toEqual([]);
    expect(result.explanation.keyPatterns[0]?.title.length).toBeLessThanOrEqual(14);
    expect(result.explanation.keyPatterns[0]?.evidence).toHaveLength(2);
    expect(result.explanation.terminologyNotes).toHaveLength(1);
    expect(result.forecast.nearTerm.love.opportunities).toEqual([
      "看清谁能稳定回应你。",
    ]);
    expect(result.forecast.nearTerm.love.timingNotes).toEqual([
      "先观察，再定边界。",
    ]);
  });

  it("returns reading-unavailable when the model layer fails", async () => {
    process.env.GEONAMES_USERNAME = "new163";
    process.env.RAPIDAPI_KEY = "test-key";
    process.env.RAPIDAPI_HOST = "astrologer.p.rapidapi.com";
    process.env.READING_SESSION_SECRET = "test-secret";

    const fetchMock = vi.fn(async (input: RequestInfo | URL) => {
      const url = input.toString();

      if (url.includes("searchJSON")) {
        return Response.json({
          totalResultsCount: 1,
          geonames: [
            {
              geonameId: 1785623,
              name: "Kunshan",
              adminName1: "Jiangsu",
              countryName: "China",
              countryCode: "CN",
              lat: "31.37762",
              lng: "120.95431",
              population: 2092496,
            },
          ],
        });
      }

      if (url.includes("timezoneJSON")) {
        return Response.json({
          timezoneId: "Asia/Shanghai",
          lat: 31.37762,
          lng: 120.95431,
        });
      }

      if (url.includes("/api/v5/context/transit")) {
        return Response.json({
          status: "OK",
          context:
            "<reading><paragraph>Current transits emphasize movement and emotional processing.</paragraph><paragraph>Over the next 4-8 weeks, the mood stays fluid while practical follow-through matters more than speed.</paragraph></reading>",
        });
      }

      if (url.includes("/api/v5/chart-data/transit")) {
        return Response.json({
          status: "OK",
          chart_data: {
            subject: {
              sun: { sign: "Ari" },
              moon: { sign: "Can" },
            },
          },
        });
      }

      if (url.includes("/api/v5/context/birth-chart")) {
        return Response.json({
          status: "OK",
          context:
            "<reading><paragraph>You come across as mentally quick, but you do your real sorting later.</paragraph></reading>",
        });
      }

      if (url.includes("/api/v5/chart-data/birth-chart")) {
        return Response.json({
          status: "OK",
          chart_data: {
            subject: {
              city: "Kunshan",
              nation: "CN",
              tz_str: "Asia/Shanghai",
              iso_formatted_local_datetime: "1990-06-15T14:30:00+08:00",
              iso_formatted_utc_datetime: "1990-06-15T06:30:00Z",
              sun: { sign: "Gem", house: "Ninth_House" },
              moon: { sign: "Pis", house: "Sixth_House" },
              mercury: { sign: "Gem", house: "Eighth_House" },
              venus: { sign: "Tau", house: "Eighth_House" },
              mars: { sign: "Ari", house: "Sixth_House" },
              ascendant: { sign: "Lib", house: "First_House" },
              medium_coeli: { sign: "Can", house: "Tenth_House" },
            },
          },
        });
      }

      throw new Error(`Unexpected URL: ${url}`);
    });

    vi.stubGlobal("fetch", fetchMock);

    const result = await resolveReadingFlow(
      {
        year: "1990",
        month: "6",
        day: "15",
        hour: "14",
        minute: "30",
        city: "Kunshan",
        country: "China",
        birthTimePrecision: "exact",
      },
      {
        aiClient: createFailingAiClient(),
      },
    );

    expect(result.kind).toBe("reading-unavailable");
  });

  it("POST /api/reading returns location-match", async () => {
    process.env.GEONAMES_USERNAME = "new163";

    const fetchMock = vi.fn(async (input: RequestInfo | URL) => {
      const url = input.toString();

      if (url.includes("searchJSON")) {
        return Response.json({
          totalResultsCount: 2,
          geonames: [
            {
              geonameId: 1,
              name: "Springfield",
              adminName1: "Illinois",
              countryName: "United States",
              countryCode: "US",
              lat: "39.8017",
              lng: "-89.6436",
              population: 114394,
            },
            {
              geonameId: 2,
              name: "Springfield",
              adminName1: "Missouri",
              countryName: "United States",
              countryCode: "US",
              lat: "37.2153",
              lng: "-93.2982",
              population: 169176,
            },
          ],
        });
      }

      throw new Error(`Unexpected URL: ${url}`);
    });

    vi.stubGlobal("fetch", fetchMock);

    const response = await POST(
      new Request("http://localhost/api/reading", {
        method: "POST",
        headers: {
          "content-type": "application/json",
        },
        body: JSON.stringify({
          year: "1990",
          month: "6",
          day: "15",
          hour: "14",
          minute: "30",
          city: "Springfield",
          country: "United States",
          birthTimePrecision: "exact",
        }),
      }),
    );

    expect(response.status).toBe(200);
    expect(await response.json()).toMatchObject({
      kind: "location-match",
      city: "Springfield",
      country: "United States",
      candidates: [
        {
          geonameId: 2,
          label: "Springfield, Missouri, United States",
        },
        {
          geonameId: 1,
          label: "Springfield, Illinois, United States",
        },
      ],
    });
  });

  it("POST /api/reading returns reading-unavailable", async () => {
    process.env.GEONAMES_USERNAME = "new163";

    const fetchMock = vi.fn(async () =>
      Response.json({
        totalResultsCount: 0,
        geonames: [],
      }),
    );

    vi.stubGlobal("fetch", fetchMock);

    const response = await POST(
      new Request("http://localhost/api/reading", {
        method: "POST",
        headers: {
          "content-type": "application/json",
        },
        body: JSON.stringify({
          year: "1990",
          month: "6",
          day: "15",
          hour: "14",
          minute: "30",
          city: "NotARealPlace",
          country: "China",
          birthTimePrecision: "exact",
        }),
      }),
    );

    expect(response.status).toBe(200);
    expect(await response.json()).toEqual({ kind: "reading-unavailable" });
  });

  it("POST /api/reading returns a client error for malformed postal codes", async () => {
    const response = await POST(
      new Request("http://localhost/api/reading", {
        method: "POST",
        headers: {
          "content-type": "application/json",
        },
        body: JSON.stringify({
          year: "1990",
          month: "6",
          day: "15",
          hour: "14",
          minute: "30",
          postalCode: "2153",
          birthTimePrecision: "exact",
        }),
      }),
    );

    expect(response.status).toBe(400);
    expect(await response.json()).toEqual({
      kind: "reading-unavailable",
      code: "invalid-input",
      message: "请输入 6 位中国邮编。",
      retryable: false,
    });
  });

  it("returns follow-up-ready with a rotated token", async () => {
    process.env.GEONAMES_USERNAME = "new163";
    process.env.RAPIDAPI_KEY = "test-key";
    process.env.RAPIDAPI_HOST = "astrologer.p.rapidapi.com";
    process.env.READING_SESSION_SECRET = "test-secret";

    const fetchMock = vi.fn(async (input: RequestInfo | URL) => {
      const url = input.toString();

      if (url.includes("searchJSON")) {
        return Response.json({
          totalResultsCount: 1,
          geonames: [
            {
              geonameId: 1785623,
              name: "Kunshan",
              adminName1: "Jiangsu",
              countryName: "China",
              countryCode: "CN",
              lat: "31.37762",
              lng: "120.95431",
              population: 2092496,
            },
          ],
        });
      }

      if (url.includes("timezoneJSON")) {
        return Response.json({
          timezoneId: "Asia/Shanghai",
          lat: 31.37762,
          lng: 120.95431,
        });
      }

      if (url.includes("/api/v5/context/transit")) {
        return Response.json({
          status: "OK",
          context:
            "<reading><paragraph>Current transits emphasize movement and emotional processing.</paragraph><paragraph>Over the next 4-8 weeks, the mood stays fluid while practical follow-through matters more than speed.</paragraph></reading>",
        });
      }

      if (url.includes("/api/v5/chart-data/transit")) {
        return Response.json({
          status: "OK",
          chart_data: {
            subject: {
              sun: { sign: "Ari" },
              moon: { sign: "Can" },
            },
          },
        });
      }

      if (url.includes("/api/v5/context/birth-chart")) {
        return Response.json({
          status: "OK",
          context:
            "<reading><paragraph>You come across as mentally quick, but you do your real sorting later.</paragraph></reading>",
        });
      }

      if (url.includes("/api/v5/chart-data/birth-chart")) {
        return Response.json({
          status: "OK",
          chart_data: {
            subject: {
              city: "Kunshan",
              nation: "CN",
              tz_str: "Asia/Shanghai",
              iso_formatted_local_datetime: "1990-06-15T14:30:00+08:00",
              iso_formatted_utc_datetime: "1990-06-15T06:30:00Z",
              sun: { sign: "Gem", house: "Ninth_House" },
              moon: { sign: "Pis", house: "Sixth_House" },
              mercury: { sign: "Gem", house: "Eighth_House" },
              venus: { sign: "Tau", house: "Eighth_House" },
              mars: { sign: "Ari", house: "Sixth_House" },
              ascendant: { sign: "Lib", house: "First_House" },
              medium_coeli: { sign: "Can", house: "Tenth_House" },
            },
          },
        });
      }

      throw new Error(`Unexpected URL: ${url}`);
    });

    vi.stubGlobal("fetch", fetchMock);

    const initial = await resolveReadingFlowWithAi(
      {
        year: "1990",
        month: "6",
        day: "15",
        hour: "14",
        minute: "30",
        city: "Kunshan",
        country: "China",
        birthTimePrecision: "exact",
      },
      {
        aiClient: createAiClient(
          JSON.stringify({
            paragraphs: [
              "这是第一段 AI 解读。",
              "接下来的几周更适合稳一点推进。",
            ],
          }),
        ),
      },
    );

    if (initial.kind !== "ready") {
      throw new Error("Expected ready outcome");
    }

    const response = await resolveReadingFollowUp(
      {
        sessionToken: initial.sessionToken,
        topic: "love",
        question: "What is happening in love right now?",
        priorTurns: [],
      },
      {
        aiClient: createAiClient(
          JSON.stringify({
            paragraphs: [
              "感情线正在变得更直接，也更清晰。",
            ],
          }),
        ),
      },
    );

    expect(response.kind).toBe("follow-up-ready");
    if (response.kind !== "follow-up-ready") {
      throw new Error("Expected follow-up-ready outcome");
    }

    expect(response.answer.paragraphs).toEqual([
      "感情线正在变得更直接，也更清晰。",
    ]);
    expect(response.remainingFollowUps).toBe(2);
    expect(response.sessionToken).not.toBe(initial.sessionToken);
  });

  it("POST /api/reading/follow-up returns follow-up-unavailable for invalid tokens", async () => {
    process.env.READING_SESSION_SECRET = "test-secret";

    const response = await postFollowUp(
      new Request("http://localhost/api/reading/follow-up", {
        method: "POST",
        headers: {
          "content-type": "application/json",
        },
        body: JSON.stringify({
          sessionToken: "bad-token",
          topic: "love",
          question: "What is happening in love right now?",
          priorTurns: [],
        }),
      }),
    );

    expect(response.status).toBe(200);
    expect(await response.json()).toMatchObject({
      kind: "follow-up-unavailable",
      retryable: false,
    });
  });

  it("returns a ready reading when geonames and astrologer both succeed", async () => {
    process.env.GEONAMES_USERNAME = "new163";
    process.env.RAPIDAPI_KEY = "test-key";
    process.env.RAPIDAPI_HOST = "astrologer.p.rapidapi.com";

    const fetchMock = vi.fn(async (input: RequestInfo | URL) => {
      const url = input.toString();

      if (url.includes("searchJSON")) {
        return Response.json({
          totalResultsCount: 1,
          geonames: [
            {
              geonameId: 1785623,
              name: "Kunshan",
              adminName1: "Jiangsu",
              countryName: "China",
              countryCode: "CN",
              lat: "31.37762",
              lng: "120.95431",
              population: 2092496,
            },
          ],
        });
      }

      if (url.includes("timezoneJSON")) {
        return Response.json({
          timezoneId: "Asia/Shanghai",
          lat: 31.37762,
          lng: 120.95431,
        });
      }

      if (url.includes("/api/v5/chart-data/birth-chart")) {
        return Response.json({
          status: "OK",
          chart_data: {
            subject: {
              city: "Kunshan",
              nation: "CN",
              tz_str: "Asia/Shanghai",
              iso_formatted_local_datetime: "1990-06-15T14:30:00+08:00",
              iso_formatted_utc_datetime: "1990-06-15T06:30:00Z",
              sun: { sign: "Gem", house: "Ninth_House" },
              moon: { sign: "Pis", house: "Sixth_House" },
              mercury: { sign: "Gem", house: "Eighth_House" },
              venus: { sign: "Tau", house: "Eighth_House" },
              mars: { sign: "Ari", house: "Sixth_House" },
              ascendant: { sign: "Lib", house: "First_House" },
              medium_coeli: { sign: "Can", house: "Tenth_House" },
            },
          },
        });
      }

      throw new Error(`Unexpected URL: ${url}`);
    });

    vi.stubGlobal("fetch", fetchMock);

    const result = await resolveReadingFlowWithAi({
      year: "1990",
      month: "6",
      day: "15",
      hour: "14",
      minute: "30",
      city: "Kunshan",
      country: "China",
      birthTimePrecision: "exact",
    });

    expect(result.kind).toBe("ready");
    if (result.kind !== "ready") {
      throw new Error("Expected ready reading");
    }
    expect(result.reading.certaintyLabel).toBe("准确出生时间");
    expect(result.reading.evidence[0]?.value).toContain("Kunshan");
    expect(result.reading.evidence[1]?.value).toBe("Asia/Shanghai");
    expect(result.reading.title).toMatch(/双子座太阳/);
  });

  it("returns a ready reading through the local kerykeion provider by default without RapidAPI credentials", async () => {
    process.env.LOCAL_ASTROLOGY_API_URL = "http://127.0.0.1:8010";
    process.env.GEONAMES_USERNAME = "new163";

    const fetchMock = vi.fn(async (input: RequestInfo | URL) => {
      const url = input.toString();

      if (url.includes("postalCodeLookupJSON")) {
        return Response.json({
          postalcodes: [
            {
              postalCode: "215300",
              placeName: "Kunshan",
              adminName1: "Jiangsu",
              countryCode: "CN",
              lat: "31.37762",
              lng: "120.95431",
            },
          ],
        });
      }

      if (url.includes("timezoneJSON")) {
        return Response.json({
          timezoneId: "Asia/Shanghai",
          lat: 31.37762,
          lng: 120.95431,
        });
      }

      if (url === "http://127.0.0.1:8010/api/v5/chart-data/birth-chart") {
        return Response.json({
          status: "OK",
          chart_data: {
            subject: {
              city: "Kunshan",
              nation: "CN",
              tz_str: "Asia/Shanghai",
              iso_formatted_local_datetime: "1990-06-15T14:30:00+08:00",
              iso_formatted_utc_datetime: "1990-06-15T06:30:00Z",
              sun: { sign: "Gem", house: "Ninth_House" },
              moon: { sign: "Pis", house: "Fifth_House" },
              mercury: { sign: "Can", house: "Ninth_House" },
              venus: { sign: "Tau", house: "Eighth_House" },
              mars: { sign: "Ari", house: "Sixth_House" },
              ascendant: { sign: "Lib", house: "First_House" },
              medium_coeli: { sign: "Can", house: "Tenth_House" },
            },
          },
        });
      }

      throw new Error(`Unexpected URL: ${url}`);
    });

    vi.stubGlobal("fetch", fetchMock);

    const result = await resolveReadingFlowWithAi({
      year: "1990",
      month: "6",
      day: "15",
      hour: "14",
      minute: "30",
      postalCode: "215300",
      birthTimePrecision: "exact",
    });

    expect(result.kind).toBe("ready");
    if (result.kind !== "ready") {
      throw new Error("Expected ready reading");
    }

    expect(result.reading.evidence[0]?.value).toContain("Kunshan");
    expect(result.reading.evidence[1]?.value).toBe("Asia/Shanghai");
    expect(
      fetchMock.mock.calls.some(
        ([request]) =>
          request.toString() ===
          "http://127.0.0.1:8010/api/v5/chart-data/birth-chart",
      ),
    ).toBe(true);
    expect(
      fetchMock.mock.calls.some(([request]) =>
        request.toString().includes("rapidapi.com"),
      ),
    ).toBe(false);
  });

  it("preserves the full initial paragraph for the primary summary", () => {
    const longSummary =
      "之所以会得出你是一个外冷内热、表面直接但内在很复杂的类型，首先是因为本命盘里有几个很清楚的信号同时出现：太阳在水瓶座落第十二宫，说明你的核心驱动力并不喜欢一直摆在台面上，而是更习惯先在独处里消化感受，再决定要不要表达。";

    const result = sanitizeStructuredReading({
      initialParagraphs: [longSummary],
      chartPayload: {
        meta: {
          chartType: "natal",
          localDateTime: "1990-06-15T14:30:00-04:00",
          utcDateTime: "1990-06-15T18:30:00Z",
          timezone: "America/New_York",
          birthTimePrecision: "exact",
          locationLabel: "New York, United States",
        },
        points: {
          sun: {
            id: "sun",
            label: "Sun",
            sign: "Aqu",
            house: "Twelfth_House",
            position: 24.1,
            absPos: 324.1,
            retrograde: false,
          },
          moon: {
            id: "moon",
            label: "Moon",
            sign: "Cap",
            house: "Tenth_House",
            position: 11.2,
            absPos: 281.2,
            retrograde: false,
          },
          mercury: {
            id: "mercury",
            label: "Mercury",
            sign: "Pis",
            house: "Twelfth_House",
            position: 1.4,
            absPos: 331.4,
            retrograde: false,
          },
          venus: {
            id: "venus",
            label: "Venus",
            sign: "Ari",
            house: "First_House",
            position: 17.8,
            absPos: 17.8,
            retrograde: false,
          },
          mars: {
            id: "mars",
            label: "Mars",
            sign: "Vir",
            house: "Sixth_House",
            position: 4.3,
            absPos: 154.3,
            retrograde: false,
          },
          ascendant: {
            id: "ascendant",
            label: "Ascendant",
            sign: "Ari",
            house: "First_House",
            position: 13.6,
            absPos: 13.6,
            retrograde: false,
          },
          mediumCoeli: {
            id: "mediumCoeli",
            label: "Medium Coeli",
            sign: "Cap",
            house: "Tenth_House",
            position: 14.4,
            absPos: 284.4,
            retrograde: false,
          },
        },
        aspects: [],
        derivedSignals: {
          stelliums: [],
          repeatedHouseThemes: [],
          dominantElements: [],
          dominantModalities: [],
        },
      },
      explanation: {
        overview: "概览",
        keyPatterns: [
          {
            title: "模式一",
            explanation: "解释一",
            evidence: [{ label: "证据", refs: ["points.sun.sign=Aqu"] }],
          },
        ],
        terminologyNotes: ["说明"],
        caveats: ["提示"],
      },
      analysis: {
        sections: {
          personality: {
            summary: "你会先在内在世界里完成判断，再决定如何对外表达。",
            bullets: ["情绪处理偏向先沉淀后行动。"],
            evidence: [{ label: "太阳十二宫", refs: ["points.sun.house=Twelfth_House"] }],
            confidence: "high",
          },
          behaviorAndThinking: {
            summary: "思考方式更依赖感受整合。",
            bullets: ["表达前需要先确认自己的真实判断。"],
            evidence: [{ label: "水星双鱼", refs: ["points.mercury.sign=Pis"] }],
            confidence: "medium",
          },
          relationshipsAndEmotions: {
            summary: "靠近关系时速度快，但内在筛选并不慢。",
            bullets: ["外在直接，内在评估细。"],
            evidence: [{ label: "金星白羊", refs: ["points.venus.sign=Ari"] }],
            confidence: "high",
          },
          careerAndGrowth: {
            summary: "现实承担感会持续拉高你的自我要求。",
            bullets: ["做事会想把细节落稳。"],
            evidence: [{ label: "MC摩羯", refs: ["points.mediumCoeli.sign=Cap"] }],
            confidence: "medium",
          },
          strengthsAndRisks: {
            summary: "优势在于能同时保留敏感和执行力。",
            bullets: ["风险在于把压力长期留在自己体内。"],
            evidence: [{ label: "火星处女", refs: ["points.mars.sign=Vir"] }],
            confidence: "medium",
          },
          lifeThemes: {
            summary: "在独处沉淀与现实承担之间找到自己的位置",
            bullets: ["学会在内隐和行动之间切换节奏。"],
            evidence: [{ label: "太阳十二宫", refs: ["points.sun.house=Twelfth_House"] }],
            confidence: "high",
          },
          timeDimension: {
            summary: "当前更适合稳住节奏后再推进关键决定。",
            bullets: ["先整理内部感受，再处理外部动作。"],
            evidence: [{ label: "月亮摩羯", refs: ["points.moon.sign=Cap"] }],
            confidence: "medium",
          },
        },
      },
      forecast: {
        nearTerm: {
          love: {
            theme: "关系试探",
            forecast: "先看回应质量。",
            opportunities: ["辨认真正有行动的人"],
            risks: ["太快推进"],
            timingNotes: ["先慢后快"],
            evidence: [{ label: "金星白羊", refs: ["points.venus.sign=Ari"] }],
            confidence: "medium",
          },
          career: {
            theme: "节奏校准",
            forecast: "先把日常结构收紧。",
            opportunities: ["整理优先级"],
            risks: ["把压力堆成内耗"],
            timingNotes: ["先稳后扩"],
            evidence: [{ label: "火星处女", refs: ["points.mars.sign=Vir"] }],
            confidence: "medium",
          },
          emotion: {
            theme: "内在整理",
            forecast: "需要更多独处恢复。",
            opportunities: ["把感受说清楚"],
            risks: ["长期压着不说"],
            timingNotes: ["先沉淀再表达"],
            evidence: [{ label: "太阳十二宫", refs: ["points.sun.house=Twelfth_House"] }],
            confidence: "high",
          },
          social: {
            theme: "边界清理",
            forecast: "减少无效消耗。",
            opportunities: ["保留高质量连接"],
            risks: ["表面强硬被误读"],
            timingNotes: ["先筛再留"],
            evidence: [{ label: "上升白羊", refs: ["points.ascendant.sign=Ari"] }],
            confidence: "medium",
          },
          finance: {
            theme: "资源收拢",
            forecast: "更适合保守配置。",
            opportunities: ["优化预算"],
            risks: ["压力型消费"],
            timingNotes: ["先整理现状"],
            evidence: [{ label: "月亮摩羯", refs: ["points.moon.sign=Cap"] }],
            confidence: "low",
          },
        },
        yearAhead: {
          love: {
            theme: "关系定向",
            forecast: "会更明确自己要什么。",
            opportunities: ["减少模糊关系"],
            risks: ["用强硬掩盖脆弱"],
            timingNotes: ["后段更清楚"],
            evidence: [{ label: "金星白羊", refs: ["points.venus.sign=Ari"] }],
            confidence: "medium",
          },
          career: {
            theme: "长期承担",
            forecast: "现实责任感会变强。",
            opportunities: ["建立稳定产出"],
            risks: ["过度苛责自己"],
            timingNotes: ["循序加码"],
            evidence: [{ label: "MC摩羯", refs: ["points.mediumCoeli.sign=Cap"] }],
            confidence: "medium",
          },
          emotion: {
            theme: "情绪稳固",
            forecast: "更懂得安排恢复节奏。",
            opportunities: ["减少闷压"],
            risks: ["独自硬扛"],
            timingNotes: ["先识别后调整"],
            evidence: [{ label: "太阳十二宫", refs: ["points.sun.house=Twelfth_House"] }],
            confidence: "medium",
          },
          social: {
            theme: "关系筛选",
            forecast: "圈层会逐渐收敛。",
            opportunities: ["留下真正可靠的人"],
            risks: ["外冷感加强距离"],
            timingNotes: ["前紧后稳"],
            evidence: [{ label: "上升白羊", refs: ["points.ascendant.sign=Ari"] }],
            confidence: "medium",
          },
          finance: {
            theme: "结构整理",
            forecast: "更适合慢慢做长期安排。",
            opportunities: ["建立更稳的底盘"],
            risks: ["临时冲动破坏计划"],
            timingNotes: ["逐步调整"],
            evidence: [{ label: "火星处女", refs: ["points.mars.sign=Vir"] }],
            confidence: "low",
          },
        },
      },
    });

    expect(result.primary.summary).toBe(longSummary);
  });

  it("returns a location-match outcome when geonames remains ambiguous", async () => {
    process.env.GEONAMES_USERNAME = "new163";
    process.env.RAPIDAPI_KEY = "test-key";

    const fetchMock = vi.fn(async (input: RequestInfo | URL) => {
      const url = input.toString();

      if (url.includes("searchJSON")) {
        return Response.json({
          totalResultsCount: 2,
          geonames: [
            {
              geonameId: 1,
              name: "Springfield",
              adminName1: "Illinois",
              countryName: "United States",
              countryCode: "US",
              lat: "39.8017",
              lng: "-89.6436",
              population: 114394,
            },
            {
              geonameId: 2,
              name: "Springfield",
              adminName1: "Missouri",
              countryName: "United States",
              countryCode: "US",
              lat: "37.2153",
              lng: "-93.2982",
              population: 169176,
            },
          ],
        });
      }

      throw new Error(`Unexpected URL: ${url}`);
    });

    vi.stubGlobal("fetch", fetchMock);

    const result = await resolveReadingFlowWithAi({
      year: "1990",
      month: "6",
      day: "15",
      hour: "14",
      minute: "30",
      city: "Springfield",
      country: "United States",
      birthTimePrecision: "exact",
    });

    expect(result.kind).toBe("location-match");
    if (result.kind !== "location-match") {
      throw new Error("Expected location-match outcome");
    }
    expect(result.city).toBe("Springfield");
    expect(result.country).toBe("United States");
    expect(result.candidates).toEqual([
      {
        geonameId: 2,
        label: "Springfield, Missouri, United States",
      },
      {
        geonameId: 1,
        label: "Springfield, Illinois, United States",
      },
    ]);
  });

  it("prefers an exact city-name match over a suffixed administrative variant when only one exact same-country city exists", async () => {
    process.env.GEONAMES_USERNAME = "new163";
    process.env.RAPIDAPI_KEY = "test-key";
    process.env.RAPIDAPI_HOST = "astrologer.p.rapidapi.com";

    const fetchMock = vi.fn(async (input: RequestInfo | URL) => {
      const url = input.toString();

      if (url.includes("searchJSON")) {
        return Response.json({
          totalResultsCount: 2,
          geonames: [
            {
              geonameId: 1785623,
              name: "Kunshan",
              adminName1: "Jiangsu",
              countryName: "China",
              countryCode: "CN",
              lat: "31.37762",
              lng: "120.95431",
              population: 2092496,
            },
            {
              geonameId: 1804647,
              name: "kunshan shi",
              adminName1: "Jiangsu",
              countryName: "China",
              countryCode: "CN",
              lat: "31.38559",
              lng: "120.98074",
              population: 1600000,
            },
          ],
        });
      }

      if (url.includes("timezoneJSON")) {
        return Response.json({
          timezoneId: "Asia/Shanghai",
          lat: 31.37762,
          lng: 120.95431,
        });
      }

      if (url.includes("/api/v5/chart-data/birth-chart")) {
        return Response.json({
          status: "OK",
          chart_data: {
            subject: {
              city: "Kunshan",
              nation: "CN",
              tz_str: "Asia/Shanghai",
              iso_formatted_local_datetime: "1990-06-15T14:30:00+08:00",
              iso_formatted_utc_datetime: "1990-06-15T06:30:00Z",
              sun: { sign: "Gem", house: "Ninth_House" },
              moon: { sign: "Pis", house: "Sixth_House" },
              mercury: { sign: "Gem", house: "Eighth_House" },
              venus: { sign: "Tau", house: "Eighth_House" },
              mars: { sign: "Ari", house: "Sixth_House" },
              ascendant: { sign: "Lib", house: "First_House" },
              medium_coeli: { sign: "Can", house: "Tenth_House" },
            },
          },
        });
      }

      throw new Error(`Unexpected URL: ${url}`);
    });

    vi.stubGlobal("fetch", fetchMock);

    const result = await resolveReadingFlowWithAi({
      year: "1990",
      month: "6",
      day: "15",
      hour: "14",
      minute: "30",
      city: "Kunshan",
      country: "China",
      birthTimePrecision: "exact",
    });

    expect(result.kind).toBe("ready");
    expect(
      fetchMock.mock.calls.some(([request]) =>
        request
          .toString()
          .includes("timezoneJSON?lat=31.37762&lng=120.95431"),
      ),
    ).toBe(true);
  });

  it("returns location-match when multiple exact same-country city-name matches remain", async () => {
    process.env.GEONAMES_USERNAME = "new163";
    process.env.RAPIDAPI_KEY = "test-key";

    const fetchMock = vi.fn(async (input: RequestInfo | URL) => {
      const url = input.toString();

      if (url.includes("searchJSON")) {
        return Response.json({
          totalResultsCount: 3,
          geonames: [
            {
              geonameId: 1785623,
              name: "Kunshan",
              adminName1: "Jiangsu",
              countryName: "China",
              countryCode: "CN",
              lat: "31.37762",
              lng: "120.95431",
              population: 2092496,
            },
            {
              geonameId: 1804648,
              name: "Kunshan",
              adminName1: "Anhui",
              countryName: "China",
              countryCode: "CN",
              lat: "34.27852",
              lng: "116.59095",
              population: 1600000,
            },
            {
              geonameId: 1804647,
              name: "kunshan shi",
              adminName1: "Jiangsu",
              countryName: "China",
              countryCode: "CN",
              lat: "31.38559",
              lng: "120.98074",
              population: 2200000,
            },
          ],
        });
      }

      throw new Error(`Unexpected URL: ${url}`);
    });

    vi.stubGlobal("fetch", fetchMock);

    const result = await resolveReadingFlow({
      year: "1990",
      month: "6",
      day: "15",
      hour: "14",
      minute: "30",
      city: "Kunshan",
      country: "China",
      birthTimePrecision: "exact",
    });

    expect(result.kind).toBe("location-match");
    if (result.kind !== "location-match") {
      throw new Error("Expected location-match outcome");
    }

    expect(result.candidates).toEqual([
      {
        geonameId: 1785623,
        label: "Kunshan, Jiangsu, China",
      },
      {
        geonameId: 1804648,
        label: "Kunshan, Anhui, China",
      },
    ]);
  });

  it("returns reading-unavailable when no location can be resolved", async () => {
    process.env.GEONAMES_USERNAME = "new163";
    process.env.RAPIDAPI_KEY = "test-key";

    const fetchMock = vi.fn(async () =>
      Response.json({
        totalResultsCount: 0,
        geonames: [],
      }),
    );

    vi.stubGlobal("fetch", fetchMock);

    const result = await resolveReadingFlow({
      year: "1990",
      month: "6",
      day: "15",
      hour: "14",
      minute: "30",
      city: "NotARealPlace",
      country: "China",
      birthTimePrecision: "exact",
    });

    expect(result.kind).toBe("reading-unavailable");
  });
});
