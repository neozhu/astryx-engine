import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { afterEach, vi } from "vitest";

import Home from "@/app/page";
import type { ReadingOutcome } from "@/lib/reading";

function createDeferred<T>() {
  let resolve!: (value: T) => void;
  const promise = new Promise<T>((promiseResolve) => {
    resolve = promiseResolve;
  });

  return { promise, resolve };
}

afterEach(() => {
  vi.unstubAllGlobals();
  vi.restoreAllMocks();
});

function createReadyPayload(
  overrides: Partial<Extract<ReadingOutcome, { kind: "ready" }>> = {},
): Extract<ReadingOutcome, { kind: "ready" }> {
  return {
    kind: "ready",
    primary: {
      title: "理解世界，也要筛选真正可信的连接",
      summary: "解读会直接落在判断和解释上，而不是停留在结果状态页。",
      highlights: ["这是第一段 AI 解读。"],
    },
    explanation: {
      overview: "这张盘最突出的是思维与关系的双重张力。",
      keyPatterns: [
        {
          title: "快速理解，慢速信任",
          explanation: "你往往先靠交流进入关系，再靠深度筛选关系。",
          evidence: [{ label: "太阳双子", refs: ["points.sun.sign=Gem"] }],
        },
      ],
      terminologyNotes: ["八宫强调共享、信任与深层交换。"],
      caveats: ["出生时间不准时，宫位结论应更保守。"],
    },
    analysis: {
      sections: {
        personality: {
          summary: "解读会直接落在判断和解释上，而不是停留在结果状态页。",
          bullets: ["这是第一段 AI 解读。"],
          evidence: [{ label: "太阳双子", refs: ["points.sun.sign=Gem"] }],
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
          summary: "理解世界，也要筛选真正可信的连接。",
          bullets: ["既想保持开放，也想要真实而稳定的关系。"],
          evidence: [{ label: "九宫与八宫", refs: ["points.sun.house=Ninth_House"] }],
          confidence: "medium",
        },
        timeDimension: {
          summary: "时间维度上更适合阶段式推进，而不是一次定局。",
          bullets: ["当前更适合边观察边修正判断。"],
          evidence: [{ label: "重复九宫主题", refs: ["derivedSignals.repeatedHouseThemes[0]=Ninth_House"] }],
          confidence: "low",
        },
      },
    },
    forecast: {
      nearTerm: {
        love: {
          theme: "关系筛选期",
          forecast: "未来 30-90 天更适合观察而不是仓促定性。",
          opportunities: ["看清谁能稳定回应你"],
          risks: ["因为节奏不一致而误判关系"],
          timingNotes: ["前半段偏试探，后半段更清晰"],
          evidence: [{ label: "金星八宫", refs: ["points.venus.house=Eighth_House"] }],
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
          evidence: [{ label: "金星八宫", refs: ["points.venus.house=Eighth_House"] }],
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
    },
    reading: {
      body: ["这是第一段 AI 解读。"],
    },
    sessionToken: "token-1",
    followUpOptions: ["love", "career-change", "anxiety"],
    remainingFollowUps: 3,
    ...overrides,
  };
}

describe("Home page", () => {
  it("renders the same-page reading intake shell", () => {
    render(<Home />);

    expect(
      screen.getByRole("heading", {
        name: /开始你的解读/i,
      }),
    ).toBeInTheDocument();

    expect(screen.getByText(/精准星盘设定/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/出生年/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/出生月/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/出生日/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/小时/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/分钟/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/邮编/i)).toBeInTheDocument();
    expect(
      screen.queryByText(/你对出生时间的把握程度/i),
    ).not.toBeInTheDocument();
    expect(
      screen.queryByRole("radio", { name: /我知道准确时间/i }),
    ).not.toBeInTheDocument();
    expect(
      screen.queryByRole("radio", { name: /我知道大概时间/i }),
    ).not.toBeInTheDocument();
    expect(
      screen.queryByRole("radio", { name: /我不知道出生时间/i }),
    ).not.toBeInTheDocument();

    expect(
      screen.queryByText(/premium chart reading/i),
    ).not.toBeInTheDocument();
    expect(
      screen.queryByRole("link", {
        name: /开始你的解读/i,
      }),
    ).not.toBeInTheDocument();

    expect(
      document.getElementById("reading-start-form"),
    ).not.toHaveAttribute("action", "/reading/generating");
    expect(screen.queryByText(/解读已生成/i)).not.toBeInTheDocument();
    expect(screen.queryByRole("heading", { name: /你的解读已生成/i })).not.toBeInTheDocument();
    expect(
      screen.queryByRole("heading", { name: /确认出生地/i }),
    ).not.toBeInTheDocument();
    expect(
      screen.queryByRole("heading", {
        name: /暂时无法生成解读/i,
      }),
    ).not.toBeInTheDocument();
  });

  it("shows loading while the reading request is in flight and renders ready payloads", async () => {
    const pendingJson = createDeferred<Extract<ReadingOutcome, { kind: "ready" }>>();

    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue({
        json: () => pendingJson.promise,
      }),
    );

    render(<Home />);

    fireEvent.submit(
      document.getElementById("reading-start-form") as HTMLFormElement,
    );

    const fetchMock = vi.mocked(fetch);
    const requestInit = fetchMock.mock.calls[0]?.[1];
    expect(requestInit).toBeDefined();
    expect(JSON.parse(String(requestInit?.body))).not.toHaveProperty(
      "birthTimePrecision",
    );

    expect(
      screen.getAllByRole("button", { name: /正在生成\.\.\./i }).every(
        (button) => button.disabled,
      ),
    ).toBe(true);

    pendingJson.resolve(createReadyPayload());

    expect(
      await screen.findByText(/理解世界，也要筛选真正可信的连接/i),
    ).toBeInTheDocument();
    expect(screen.queryByText(/你的解读已生成/i)).not.toBeInTheDocument();
    expect(screen.queryByText(/解读已生成/i)).not.toBeInTheDocument();
    expect(screen.getByRole("button", { name: /感情/i })).toBeInTheDocument();
  });

  it("falls back to unavailable when the reading request fails", async () => {
    vi.stubGlobal("fetch", vi.fn().mockRejectedValue(new Error("network down")));

    render(<Home />);

    fireEvent.submit(
      document.getElementById("reading-start-form") as HTMLFormElement,
    );

    expect(
      await screen.findByRole("heading", {
        name: /暂时无法生成解读/i,
      }),
    ).toBeInTheDocument();
    expect(
      screen.getByRole("button", { name: /重新生成/i }),
    ).toBeInTheDocument();
  });

  it("falls back to unavailable when the response payload is malformed", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue({
        json: () =>
          Promise.resolve({
            kind: "ready",
          }),
      }),
    );

    render(<Home />);

    fireEvent.submit(
      document.getElementById("reading-start-form") as HTMLFormElement,
    );

    expect(
      await screen.findByRole("heading", {
        name: /暂时无法生成解读/i,
      }),
    ).toBeInTheDocument();
  });

  it("renders the location-match confirmation branch", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue({
          json: () =>
            Promise.resolve({
              kind: "location-match",
              postalCode: "215300",
              candidates: [
                {
                  geonameId: 123,
                  label: "昆山, 江苏, 中国",
                },
              ],
            }),
      }),
    );

    render(<Home />);

    fireEvent.submit(
      document.getElementById("reading-start-form") as HTMLFormElement,
    );

    expect(
      await screen.findByRole("heading", { name: /确认出生地/i }),
    ).toBeInTheDocument();
    expect(
      screen.getByText(/昆山, 江苏, 中国/i),
    ).toBeInTheDocument();
    expect(
      screen.getByRole("button", { name: /返回表单/i }),
    ).toBeInTheDocument();
  });

  it("keeps the latest submission result when an older request resolves last", async () => {
    const firstResponse = createDeferred<Extract<ReadingOutcome, { kind: "ready" }>>();
    const secondResponse = createDeferred<{
      kind: "reading-unavailable";
    }>();

    vi.stubGlobal(
      "fetch",
      vi
        .fn()
        .mockResolvedValueOnce({ json: () => firstResponse.promise })
        .mockResolvedValueOnce({ json: () => secondResponse.promise }),
    );

    render(<Home />);

    const form = document.getElementById("reading-start-form") as HTMLFormElement;

    fireEvent.submit(form);
    fireEvent.submit(form);

    secondResponse.resolve({ kind: "reading-unavailable" });

    expect(
      await screen.findByRole("heading", {
        name: /暂时无法生成解读/i,
      }),
    ).toBeInTheDocument();

    firstResponse.resolve(
      createReadyPayload({
        primary: {
          title: "旧响应",
          summary: "这个较早返回的响应不应该覆盖更新的结果。",
          highlights: ["old"],
        },
      }),
    );

    await waitFor(() => {
      expect(
        screen.queryByText(/这个较早返回的响应不应该覆盖更新的结果/i),
      ).not.toBeInTheDocument();
      expect(
        screen.getByRole("heading", {
          name: /暂时无法生成解读/i,
        }),
      ).toBeInTheDocument();
    });
  });

  it("submits a fixed follow-up chip and appends the answer inline", async () => {
    vi.stubGlobal(
      "fetch",
      vi
        .fn()
        .mockResolvedValueOnce({
          json: () =>
            Promise.resolve({
              ...createReadyPayload(),
            }),
        })
        .mockResolvedValueOnce({
          json: () =>
            Promise.resolve({
              kind: "follow-up-ready",
              sessionToken: "token-2",
              answer: {
                paragraphs: [
                  "感情线正在变得更直接，也更清晰。",
                ],
              },
              remainingFollowUps: 2,
              topic: "love",
            }),
        }),
    );

    render(<Home />);

    fireEvent.submit(
      document.getElementById("reading-start-form") as HTMLFormElement,
    );
    fireEvent.click(await screen.findByRole("button", { name: /感情/i }));

    expect(
      await screen.findByText(/感情线正在变得更直接，也更清晰。/i),
    ).toBeInTheDocument();
  });

  it("submits a custom follow-up question and appends the answer inline", async () => {
    vi.stubGlobal(
      "fetch",
      vi
        .fn()
        .mockResolvedValueOnce({
          json: () =>
            Promise.resolve({
              ...createReadyPayload(),
            }),
        })
        .mockResolvedValueOnce({
          json: () =>
            Promise.resolve({
              kind: "follow-up-ready",
              sessionToken: "token-2",
              answer: {
                paragraphs: [
                  "This is less about speed than clarity over the next few weeks.",
                ],
              },
              remainingFollowUps: 2,
              topic: "custom",
            }),
        }),
    );

    render(<Home />);

    fireEvent.submit(
      document.getElementById("reading-start-form") as HTMLFormElement,
    );

    fireEvent.change(
      await screen.findByPlaceholderText(
        /可以继续问感情、工作变动、焦虑与情绪/i,
      ),
      {
        target: {
          value: "最近适合换工作吗？",
        },
      },
    );
    fireEvent.submit(
      screen
        .getByPlaceholderText(/可以继续问感情、工作变动、焦虑与情绪/i)
        .closest("form") as HTMLFormElement,
    );

    expect(
      await screen.findByText(
        /this is less about speed than clarity over the next few weeks/i,
      ),
    ).toBeInTheDocument();
  });

  it("disables follow-up controls after three successful answers", async () => {
    vi.stubGlobal(
      "fetch",
      vi
        .fn()
        .mockResolvedValueOnce({
          json: () =>
            Promise.resolve({
              ...createReadyPayload(),
            }),
        })
        .mockResolvedValueOnce({
          json: () =>
            Promise.resolve({
              kind: "follow-up-ready",
              sessionToken: "token-2",
              answer: { paragraphs: ["Follow-up one."] },
              remainingFollowUps: 2,
              topic: "love",
            }),
        })
        .mockResolvedValueOnce({
          json: () =>
            Promise.resolve({
              kind: "follow-up-ready",
              sessionToken: "token-3",
              answer: { paragraphs: ["Follow-up two."] },
              remainingFollowUps: 1,
              topic: "career-change",
            }),
        })
        .mockResolvedValueOnce({
          json: () =>
            Promise.resolve({
              kind: "follow-up-ready",
              sessionToken: "token-4",
              answer: { paragraphs: ["Follow-up three."] },
              remainingFollowUps: 0,
              topic: "anxiety",
            }),
        }),
    );

    render(<Home />);

    fireEvent.submit(
      document.getElementById("reading-start-form") as HTMLFormElement,
    );
    fireEvent.click(await screen.findByRole("button", { name: /感情/i }));
    fireEvent.click(await screen.findByRole("button", { name: /工作变动/i }));
    fireEvent.click(await screen.findByRole("button", { name: /焦虑与情绪/i }));

    expect(await screen.findByRole("button", { name: /感情/i })).toBeDisabled();
    expect(screen.getByRole("button", { name: /工作变动/i })).toBeDisabled();
    expect(screen.getByRole("button", { name: /焦虑与情绪/i })).toBeDisabled();
  });

  it("submits reading requests without birthTimePrecision", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue({
        json: () => Promise.resolve(createReadyPayload()),
      }),
    );

    render(<Home />);

    fireEvent.submit(
      document.getElementById("reading-start-form") as HTMLFormElement,
    );

    const fetchMock = vi.mocked(fetch);
    const requestInit = fetchMock.mock.calls[0]?.[1];
    expect(requestInit).toBeDefined();
    expect(JSON.parse(String(requestInit?.body))).not.toHaveProperty(
      "birthTimePrecision",
    );
  });
});
