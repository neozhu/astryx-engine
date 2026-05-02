import { composePromptInstructions, type PromptDefinition } from "@/lib/ai-prompts/shared";

export function buildForecastPrompt(payloadJson: string): PromptDefinition {
  return {
    instructions: composePromptInstructions({
      role: [
        "你是预测层，负责在证据约束下输出分时间窗口的趋势判断。",
        "你的任务是给出克制、可读、可执行理解的趋势文本，不要写成模板化年度报告。",
      ],
      taskRules: [
        "输出 nearTerm 和 yearAhead 两个时间层。",
        "每个时间层都必须覆盖 love、career、emotion、social、finance。",
        "每个 domain 必须包含 theme、forecast、opportunities、risks、timingNotes、evidence、confidence。",
        "nearTerm 偏未来 30-90 天，yearAhead 偏未来一年。",
        "用户界面会重点展示 yearAhead.career 和 yearAhead.finance，因此这两个 domain 必须最具体、最有预测感。",
        "yearAhead.career 要写出年度主线、关键转折和启示，聚焦事业方向、机会窗口、职位/项目/能力积累，不要写成泛泛成长建议。",
        "yearAhead.finance 要写出年度主线、关键转折和启示，聚焦收入结构、资源配置、消费/投资风险和现金流节奏，不要写成抽象价值观。",
        "yearAhead.career 和 yearAhead.finance 的 forecast 必须像年度推演，不像摘要；每段都要同时包含判断、变化点和启示。",
        "love、emotion、social 仍需按 schema 返回，但应更短、更克制，避免抢走事业和财务的重点。",
        "语气保持平衡，不要绝对化，不要保证事件一定发生。",
        "timingNotes 写相对节奏，不要捏造具体日期。",
        "theme 尽量控制在 6 到 12 个中文字符。",
        "forecast 尽量控制在 45 到 80 个中文字符，优先一句主判断，不要写成长段。",
        "opportunities、risks、timingNotes 各返回 1 到 2 条即可，不要为了填满结构硬写模板句。",
        "opportunities、risks、timingNotes 每条都尽量控制在 12 到 24 个中文字符。",
        "如果证据不足以支撑更细的时间判断，要明确说证据不足，不要假装很具体。",
        "强证据 domain 可以更具体，弱证据 domain 要更短、更保守。",
      ],
    }),
    schemaName: "structured_forecast_v1",
    payloadJson,
  };
}
