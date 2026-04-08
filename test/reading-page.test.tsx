import { fireEvent, render, screen } from "@testing-library/react";

import ReadingStartPage from "@/app/reading-start-page";
import type { ReadingOutcome } from "@/lib/reading";

function createReadyResult(): Extract<ReadingOutcome, { kind: "ready" }> {
  return {
    kind: "ready",
    primary: {
      title: "理解世界，也要筛选真正可信的连接",
      summary: "你的人格重心在好奇心和关系分辨力之间摆动。",
      highlights: [
        "先通过交流建立连接，再决定是否真正投入。",
        "职业路径适合兼顾表达、判断和长期积累。",
        "关系筛选期",
        "路径校准",
      ],
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
          summary: "你的人格重心在好奇心和关系分辨力之间摆动。",
          bullets: ["先通过交流建立连接，再决定是否真正投入。"],
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
      body: ["legacy fallback body"],
    },
    sessionToken: "token-1",
    followUpOptions: ["love", "career-change", "anxiety"],
    remainingFollowUps: 3,
  };
}

describe("Reading result state", () => {
  it("renders a primary reading layer first and keeps explanation subordinate", () => {
    render(
      <ReadingStartPage
        onSubmit={() => undefined}
        isSubmitting={false}
        result={createReadyResult()}
      />,
    );

    expect(screen.getByText("核心解读")).toBeInTheDocument();
    expect(screen.getByText("展开看星盘依据")).toBeInTheDocument();
    expect(screen.getByText("展开看近期与年度预测")).toBeInTheDocument();
  });

  it("shows only the first few analysis sections and keeps the rest collapsed", () => {
    render(
      <ReadingStartPage
        onSubmit={() => undefined}
        isSubmitting={false}
        result={createReadyResult()}
      />,
    );

    expect(screen.getByText("人格")).toBeVisible();
    expect(screen.queryByText("人生主题")).not.toBeInTheDocument();
    expect(
      screen.getByRole("button", { name: /展开更多分析/i }),
    ).toBeInTheDocument();

    fireEvent.click(screen.getByRole("button", { name: /展开更多分析/i }));
    expect(screen.getByText("人生主题")).toBeInTheDocument();
  });

  it("renders guided follow-up controls beneath the layered reading", () => {
    render(
      <ReadingStartPage
        onSubmit={() => undefined}
        isSubmitting={false}
        result={createReadyResult()}
      />,
    );

    expect(screen.getByRole("button", { name: /感情/i })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /工作变动/i })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /焦虑与情绪/i })).toBeInTheDocument();
    expect(
      screen.getByPlaceholderText(/可以继续问感情、工作变动、焦虑与情绪/i),
    ).toBeInTheDocument();
  });
});
