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
