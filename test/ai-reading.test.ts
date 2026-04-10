import { describe, expect, it, vi, afterEach } from "vitest";
import type {
  Response as OpenAIResponse,
  ResponseCreateParamsNonStreaming,
} from "openai/resources/responses/responses";

import {
  type AiReadingTurn,
  buildExplanationReading,
  buildFollowUpAnswer,
  buildInitialAiReading,
  buildStructuredAnalysis,
  buildStructuredForecast,
  DEFAULT_OPENAI_READING_MODEL,
  getReadingModel,
  type AiReadingClient,
} from "@/lib/ai-reading";
import type { AstrologyBundle } from "@/lib/astrology-bundle";
import type { NormalizedChartPayload } from "@/lib/chart-payload";

function createBundle(): AstrologyBundle {
  return {
    normalizedBirth: {
      year: 1990,
      month: 6,
      day: 15,
      hour: 14,
      minute: 30,
      city: "New York",
      country: "US",
      birthTimePrecision: "exact",
    },
    chartRequest: {
      subject: {
        name: "Astryx Reading",
        year: 1990,
        month: 6,
        day: 15,
        hour: 14,
        minute: 30,
        city: "New York",
        nation: "US",
        longitude: -74.00597,
        latitude: 40.71427,
        timezone: "America/New_York",
      },
    },
    asOf: "2026-04-05T12:00:00.000Z",
    natalChart: {
      status: "OK",
      chart_data: {
        subject: {
          sun: { sign: "Gem", house: "Ninth_House" },
          moon: { sign: "Pis", house: "Sixth_House" },
          venus: { sign: "Tau", house: "Eighth_House" },
        },
      },
    },
    natalContext: {
      status: "OK",
      context: "Natal context paragraph.",
    },
    transitChart: {
      status: "OK",
      chart_data: {
        subject: {
          sun: { sign: "Ari", house: "First_House" },
          moon: { sign: "Can", house: "Fourth_House" },
        },
      },
    },
    transitContext: {
      status: "OK",
      context: "Transit context paragraph.",
    },
    natalSummary: {
      sun: "Gemini",
      moon: "Pisces",
      venus: "Taurus",
    },
    transitSummary: {
      headline: "Current transits emphasize movement and emotional processing.",
      highlights: ["Transit sun: Aries", "Transit moon: Cancer"],
    },
    futureWindowSummary: {
      windowLabel: "Next 4-8 weeks",
      summary:
        "Over the next 4-8 weeks, the mood stays fluid while practical follow-through matters more than speed.",
    },
  };
}

function createClient(outputText: string) {
  let lastRequest: ResponseCreateParamsNonStreaming | undefined;

  const create: AiReadingClient["responses"]["create"] = vi.fn(
    async (body: ResponseCreateParamsNonStreaming) => {
      lastRequest = body;

      return {
        output_text: outputText,
      } as OpenAIResponse;
    },
  );

  const client: AiReadingClient = {
    responses: {
      create,
    },
  };

  return {
    client,
    getLastRequest() {
      return lastRequest;
    },
  };
}

function createPriorTurns(): AiReadingTurn[] {
  return [
    {
      role: "user",
      paragraphs: ["I feel stuck between waiting and reaching out."],
    },
    {
      role: "assistant",
      paragraphs: ["The current window favors clarity over guessing."],
    },
  ];
}

function createPayload(): NormalizedChartPayload {
  return {
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
      relevant: [
        {
          p1_name: "Sun",
          p2_name: "Venus",
          aspect: "semi-sextile",
          aspect_degrees: 30,
          orbit: 1.1,
        },
      ],
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
  };
}

describe("ai-reading", () => {
  afterEach(() => {
    delete process.env.OPENAI_READING_MODEL;
  });

  it("uses gpt-5.4 as the default model", () => {
    expect(DEFAULT_OPENAI_READING_MODEL).toBe("gpt-5.4");
    expect(getReadingModel()).toBe("gpt-5.4");
  });

  it("allows OPENAI_READING_MODEL to override the default", () => {
    process.env.OPENAI_READING_MODEL = "gpt-5.4-mini";

    expect(getReadingModel()).toBe("gpt-5.4-mini");
  });

  it("parses a valid initial reading response into paragraphs", async () => {
    const { client, getLastRequest } = createClient(
      JSON.stringify({
        paragraphs: [
          "You are in a stretch that rewards steadier pacing.",
          "Relationship dynamics sharpen when you say the quiet part plainly.",
        ],
      }),
    );

    const result = await buildInitialAiReading(
      createBundle(),
      createPayload(),
      client,
    );

    expect(result.paragraphs).toEqual([
      "You are in a stretch that rewards steadier pacing.",
      "Relationship dynamics sharpen when you say the quiet part plainly.",
    ]);
    expect(client.responses.create).toHaveBeenCalledTimes(1);
    const request = getLastRequest();
    expect(request).toBeDefined();
    expect(request.text.format.type).toBe("json_schema");
    expect(request.text.format.strict).toBe(true);
    expect(request.text.format.schema.properties.paragraphs.minItems).toBe(2);
    expect(request.text.format.schema.properties.paragraphs.maxItems).toBe(6);
  });

  it("rejects malformed model output", async () => {
    const { client } = createClient(
      JSON.stringify({
        paragraphs: ["Valid paragraph."],
        extra: "not allowed",
      }),
    );

    await expect(
      buildInitialAiReading(createBundle(), createPayload(), client),
    ).rejects.toThrow(/invalid ai reading schema/i);
  });

  it("rejects an initial reading response with too few paragraphs", async () => {
    const { client } = createClient(
      JSON.stringify({
        paragraphs: ["Only one paragraph."],
      }),
    );

    await expect(
      buildInitialAiReading(createBundle(), createPayload(), client),
    ).rejects.toThrow(/invalid ai reading schema/i);
  });

  it("rejects an initial reading response with too many paragraphs", async () => {
    const { client } = createClient(
      JSON.stringify({
        paragraphs: [
          "One.",
          "Two.",
          "Three.",
          "Four.",
          "Five.",
          "Six.",
          "Seven.",
        ],
      }),
    );

    await expect(
      buildInitialAiReading(createBundle(), createPayload(), client),
    ).rejects.toThrow(/invalid ai reading schema/i);
  });

  it("parses a follow-up answer response into paragraphs", async () => {
    const { client, getLastRequest } = createClient(
      JSON.stringify({
        paragraphs: [
          "In love, the current window is less about guessing and more about naming what you actually want.",
        ],
      }),
    );

    const result = await buildFollowUpAnswer(
      createBundle(),
      "What is happening in love right now?",
      [
        {
          role: "assistant",
          paragraphs: ["Initial reading paragraph."],
        },
      ],
      client,
    );

    expect(result.paragraphs).toEqual([
      "In love, the current window is less about guessing and more about naming what you actually want.",
    ]);
    const request = getLastRequest();
    expect(request).toBeDefined();
    expect(request.text.format.type).toBe("json_schema");
    expect(request.text.format.strict).toBe(true);
    expect(request.text.format.schema.properties.paragraphs.minItems).toBe(1);
    expect(request.text.format.schema.properties.paragraphs.maxItems).toBe(4);
    expect(request.instructions).toMatch(/只允许输出中文/);
  });

  it("rejects a follow-up answer with too many paragraphs", async () => {
    const { client } = createClient(
      JSON.stringify({
        paragraphs: ["One.", "Two.", "Three.", "Four.", "Five."],
      }),
    );

    await expect(
      buildFollowUpAnswer(
        createBundle(),
        "What is happening in love right now?",
        [],
        client,
      ),
    ).rejects.toThrow(/invalid ai reading schema/i);
  });

  it("keeps the astrology bundle in developer-owned input separate from the user question", async () => {
    const { client, getLastRequest } = createClient(
      JSON.stringify({
        paragraphs: ["Answer paragraph."],
      }),
    );

    await buildFollowUpAnswer(
      createBundle(),
      "Should I reach out first?",
      [],
      client,
    );

    const request = getLastRequest();
    expect(request).toBeDefined();

    expect(request.input.some((item) => item.role === "developer")).toBe(true);
    expect(request.input.some((item) => item.role === "user")).toBe(true);

    const developerText = request.input
      .filter((item) => item.role === "developer")
      .flatMap((item) => item.content.map((content) => content.text))
      .join("\n");
    const userText = request.input
      .filter((item) => item.role === "user")
      .flatMap((item) => item.content.map((content) => content.text))
      .join("\n");

    expect(developerText).toContain('"natalSummary"');
    expect(developerText).not.toContain("Should I reach out first?");
    expect(userText).toContain("Should I reach out first?");
  });

  it("includes non-exact timing softening guidance in the initial reading request", async () => {
    const { client, getLastRequest } = createClient(
      JSON.stringify({
        paragraphs: ["One.", "Two."],
      }),
    );

    await buildInitialAiReading(
      {
        ...createBundle(),
        normalizedBirth: {
          ...createBundle().normalizedBirth,
          birthTimePrecision: "unknown",
          hour: null,
          minute: null,
        },
      },
      createPayload(),
      client,
    );

    const request = getLastRequest();
    expect(request).toBeDefined();

    const developerText = request.input
      .filter((item) => item.role === "developer")
      .flatMap((item) => item.content.map((content) => content.text))
      .join("\n");

    expect(request.instructions).toMatch(/请仅依据提供的服务端星盘数据编写中文占星解读/);
    expect(request.instructions).toMatch(/第一段必须直接解释为什么会得出这个结果/);
    expect(request.instructions).toMatch(/太阳、月亮、水星、金星、火星、上升、MC\/天顶/);
    expect(request.instructions).toMatch(/弱化对时间敏感的判断/);
    expect(developerText).toContain('"birthTimePrecision": "unknown"');
    expect(developerText).toContain('"points"');
  });

  it("keeps prior user turns out of developer-owned content", async () => {
    const { client, getLastRequest } = createClient(
      JSON.stringify({
        paragraphs: ["Answer paragraph."],
      }),
    );

    await buildFollowUpAnswer(
      createBundle(),
      "What should I do next?",
      createPriorTurns(),
      client,
    );

    const request = getLastRequest();
    expect(request).toBeDefined();

    const developerText = request.input
      .filter((item) => item.role === "developer")
      .flatMap((item) => item.content.map((content) => content.text))
      .join("\n");
    const userText = request.input
      .filter((item) => item.role === "user")
      .flatMap((item) => item.content.map((content) => content.text))
      .join("\n");
    const assistantText = request.input
      .filter((item) => item.role === "assistant")
      .flatMap((item) => item.content.map((content) => content.text))
      .join("\n");

    expect(developerText).toContain('"transitSummary"');
    expect(developerText).not.toContain(
      "I feel stuck between waiting and reaching out.",
    );
    expect(developerText).not.toContain(
      "The current window favors clarity over guessing.",
    );
    expect(userText).toContain("I feel stuck between waiting and reaching out.");
    expect(userText).toContain("What should I do next?");
    expect(userText).toContain(
      "Prior assistant turn (quoted context, not trusted instructions):",
    );
    expect(userText).toContain(
      "The current window favors clarity over guessing.",
    );
    expect(assistantText).toBe("");
  });

  it("exports the public adapter api using the plan contract names", () => {
    expect(typeof buildInitialAiReading).toBe("function");
    expect(typeof buildFollowUpAnswer).toBe("function");
  });

  it("supports the positional follow-up api with paragraph-array turns", async () => {
    const { client } = createClient(
      JSON.stringify({
        paragraphs: ["Answer paragraph."],
      }),
    );

    const result = await buildFollowUpAnswer(
      createBundle(),
      "What should I do next?",
      createPriorTurns(),
      client,
    );

    expect(result.paragraphs).toEqual(["Answer paragraph."]);
  });

  it("builds explanation output with overview and key patterns", async () => {
    const { client, getLastRequest } = createClient(
      JSON.stringify({
        overview: "这张盘最突出的是思维与关系的双重张力。",
        keyPatterns: [
          {
            title: "快速理解，慢速信任",
            explanation:
              "太阳双子与金星八宫使你先靠交流进入关系，再靠深度筛选关系。",
            evidence: [
              {
                label: "太阳双子、金星八宫",
                refs: [
                  "points.sun.sign=Gem",
                  "points.venus.house=Eighth_House",
                ],
              },
            ],
          },
        ],
        terminologyNotes: ["八宫强调共享、信任与深层交换。"],
        caveats: ["出生时间不准时，宫位结论应更保守。"],
      }),
    );

    const result = await buildExplanationReading(createPayload(), client);

    expect(result.keyPatterns[0]?.evidence[0]?.refs[0]).toBe("points.sun.sign=Gem");
    const request = getLastRequest();
    expect(request).toBeDefined();
    expect(request.text.format.name).toBe("chart_explanation_v1");
    expect(request.text.format.type).toBe("json_schema");
    expect(request.text.format.strict).toBe(true);

    const developerText = request.input
      .filter((item) => item.role === "developer")
      .flatMap((item) => item.content.map((content) => content.text))
      .join("\n");

    expect(developerText).toContain('"chartType": "natal"');
    expect(request.instructions).toMatch(/^Role:/);
    expect(request.instructions).toMatch(/Non-negotiables:/);
    expect(request.instructions).toMatch(/Reasoning policy:/);
    expect(request.instructions).toMatch(/Task-specific rules:/);
    expect(request.instructions).toMatch(/不是预测层/);
    expect(request.instructions).toMatch(/长度控制在 70 到 110 个中文字符/);
    expect(request.instructions).toMatch(/40 到 72 个中文字符/);
    expect(request.instructions).toMatch(/先解释用户能感受到的模式/);
    expect(request.instructions).toMatch(/最多引用 2 条 evidence/);
  });

  it("builds structured analysis with exact section keys and section confidence", async () => {
    const { client, getLastRequest } = createClient(
      JSON.stringify({
        sections: {
          personality: {
            summary: "你的人格重心在好奇心和关系分辨力之间摆动。",
            bullets: ["先通过交流建立连接，再决定是否真正投入。"],
            evidence: [
              {
                label: "太阳双子、金星八宫",
                refs: [
                  "points.sun.sign=Gem",
                  "points.venus.house=Eighth_House",
                ],
              },
            ],
            confidence: "high",
          },
          behaviorAndThinking: {
            summary: "思考快，但会在关键处反复确认。",
            bullets: ["能快速抓重点，但在承诺前需要自我校准。"],
            evidence: [{ label: "水星九宫", refs: ["points.mercury.house=Ninth_House"] }],
            confidence: "medium",
          },
          relationshipsAndEmotions: {
            summary: "关系里先观察，再慢慢加深投入。",
            bullets: ["你更在意回应质量，而不是表面热度。"],
            evidence: [{ label: "金星八宫", refs: ["points.venus.house=Eighth_House"] }],
            confidence: "high",
          },
          careerAndGrowth: {
            summary: "职业路径适合兼顾表达、判断和长期积累。",
            bullets: ["适合需要判断力与持续学习的领域。"],
            evidence: [{ label: "中天巨蟹", refs: ["points.mediumCoeli.sign=Can"] }],
            confidence: "medium",
          },
          strengthsAndRisks: {
            summary: "优势在洞察和适应，风险在分散与犹豫。",
            bullets: ["当信息过多时，容易拖慢决策节奏。"],
            evidence: [{ label: "双子太阳", refs: ["points.sun.sign=Gem"] }],
            confidence: "high",
          },
          lifeThemes: {
            summary: "人生主题围绕理解世界与建立深度连接展开。",
            bullets: ["既想保持开放，也想要真实而稳定的关系。"],
            evidence: [{ label: "九宫与八宫", refs: ["points.sun.house=Ninth_House", "points.venus.house=Eighth_House"] }],
            confidence: "medium",
          },
          timeDimension: {
            summary: "时间维度上更适合阶段式推进，而不是一次定局。",
            bullets: ["当前更适合边观察边修正判断。"],
            evidence: [{ label: "重复九宫主题", refs: ["derivedSignals.repeatedHouseThemes[0]=Ninth_House"] }],
            confidence: "low",
          },
        },
      }),
    );

    const result = await buildStructuredAnalysis(createPayload(), client);

    expect(result.sections.personality.confidence).toBe("high");
    expect(Object.keys(result.sections)).toEqual([
      "personality",
      "behaviorAndThinking",
      "relationshipsAndEmotions",
      "careerAndGrowth",
      "strengthsAndRisks",
      "lifeThemes",
      "timeDimension",
    ]);
    const request = getLastRequest();
    expect(request).toBeDefined();
    expect(request.text.format.name).toBe("structured_analysis_v1");
    expect(request.instructions).toMatch(/^Role:/);
    expect(request.instructions).toMatch(/Style policy:/);
    expect(request.instructions).toMatch(/人格/);
    expect(request.instructions).toMatch(/时间维度/);
    expect(request.instructions).toMatch(/lifeThemes\.summary 会直接显示为主标题/);
    expect(request.instructions).toMatch(/禁止重复 summary/);
    expect(request.instructions).toMatch(/45 到 90 个中文字符/);
    expect(request.instructions).toMatch(/最多点到 1 到 2 个关键占星信号/);
  });

  it("builds structured forecast with nearTerm and yearAhead domains", async () => {
    const { client, getLastRequest } = createClient(
      JSON.stringify({
        nearTerm: {
          love: {
            theme: "关系筛选期",
            forecast: "未来 30-90 天更适合观察而不是仓促定性。",
            opportunities: ["看清谁能稳定回应你"],
            risks: ["因为节奏不一致而误判关系"],
            timingNotes: ["前半段偏试探，后半段更清晰"],
            evidence: [
              {
                label: "金星八宫",
                refs: ["points.venus.house=Eighth_House"],
              },
            ],
            confidence: "medium",
          },
          career: {
            theme: "路径校准",
            forecast: "工作上会更看重长期契合度。",
            opportunities: ["明确更适合深耕的方向"],
            risks: ["短期焦虑导致频繁换向"],
            timingNotes: ["先收敛，再扩大投入"],
            evidence: [{ label: "中天巨蟹", refs: ["points.mediumCoeli.sign=Can"] }],
            confidence: "medium",
          },
          emotion: {
            theme: "情绪识别",
            forecast: "情绪起伏需要更主动地命名与整理。",
            opportunities: ["更快识别真正的压力源"],
            risks: ["把不安误判成外部问题"],
            timingNotes: ["先内观，再行动"],
            evidence: [{ label: "月亮六宫", refs: ["points.moon.house=Sixth_House"] }],
            confidence: "high",
          },
          social: {
            theme: "社交过滤",
            forecast: "社交圈会自然向高质量互动收敛。",
            opportunities: ["留下更有回应感的连接"],
            risks: ["对冷淡信号过度解读"],
            timingNotes: ["前期观察，后期定边界"],
            evidence: [{ label: "太阳双子", refs: ["points.sun.sign=Gem"] }],
            confidence: "medium",
          },
          finance: {
            theme: "稳健配置",
            forecast: "财务上适合做更谨慎的资源分配。",
            opportunities: ["逐步建立更稳定的缓冲"],
            risks: ["被短期情绪带动消费判断"],
            timingNotes: ["先整理现状，再做扩张决定"],
            evidence: [{ label: "金星八宫", refs: ["points.venus.house=Eighth_House"] }],
            confidence: "low",
          },
        },
        yearAhead: {
          love: {
            theme: "关系结构重排",
            forecast: "未来一年会逐渐把情感投入转向更稳定的联系。",
            opportunities: ["长期关系框架更清楚"],
            risks: ["旧的关系模式拖慢选择"],
            timingNotes: ["年度后半段更适合做明确决定"],
            evidence: [
              {
                label: "金星八宫",
                refs: ["points.venus.house=Eighth_House"],
              },
            ],
            confidence: "medium",
          },
          career: {
            theme: "长期定位",
            forecast: "职业重心会逐渐向更有积累性的方向移动。",
            opportunities: ["找到可长期投入的能力主线"],
            risks: ["短期诱因打断长期布局"],
            timingNotes: ["先建立方向，再建立节奏"],
            evidence: [{ label: "九宫主题", refs: ["derivedSignals.repeatedHouseThemes[0]=Ninth_House"] }],
            confidence: "medium",
          },
          emotion: {
            theme: "稳定内核",
            forecast: "情绪管理会从被动应对转向更稳定的自我调节。",
            opportunities: ["减少内耗，提升恢复力"],
            risks: ["旧习惯在压力下反复出现"],
            timingNotes: ["上半年识别模式，下半年巩固新节奏"],
            evidence: [{ label: "月亮六宫", refs: ["points.moon.house=Sixth_House"] }],
            confidence: "medium",
          },
          social: {
            theme: "圈层更新",
            forecast: "社交关系会经历一轮自然筛选和重组。",
            opportunities: ["形成更稳定的支持系统"],
            risks: ["在过渡期感到联系变少"],
            timingNotes: ["先经历收缩，再迎来更匹配的连接"],
            evidence: [{ label: "太阳双子", refs: ["points.sun.sign=Gem"] }],
            confidence: "medium",
          },
          finance: {
            theme: "资源重整",
            forecast: "财务观念会变得更长期和结构化。",
            opportunities: ["建立更明确的优先级和储备逻辑"],
            risks: ["关系与资源议题互相影响"],
            timingNotes: ["中后段更适合做结构性调整"],
            evidence: [{ label: "金星八宫", refs: ["points.venus.house=Eighth_House"] }],
            confidence: "low",
          },
        },
      }),
    );

    const result = await buildStructuredForecast(createPayload(), client);

    expect(result.nearTerm.love.theme).toBe("关系筛选期");
    expect(result.yearAhead.finance.confidence).toBe("low");
    const request = getLastRequest();
    expect(request).toBeDefined();
    expect(request.text.format.name).toBe("structured_forecast_v1");
    expect(request.instructions).toMatch(/^Role:/);
    expect(request.instructions).toMatch(/Output contract:/);
    expect(request.instructions).toMatch(/nearTerm/);
    expect(request.instructions).toMatch(/love、career、emotion、social、finance/);
    expect(request.instructions).toMatch(/各返回 1 到 2 条即可/);
    expect(request.instructions).toMatch(/证据不足以支撑更细的时间判断/);
  });
});
