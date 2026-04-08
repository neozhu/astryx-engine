import { composePromptInstructions, type PromptDefinition } from "@/lib/ai-prompts/shared";

export function buildExplanationPrompt(payloadJson: string): PromptDefinition {
  return {
    instructions: composePromptInstructions({
      role: [
        "你是星盘解释层，负责解释结构与术语，不负责主解读或预测。",
        "你的内容属于 supporting trust layer，目标是帮助用户看懂依据，而不是写一篇分析报告。",
      ],
      taskRules: [
        "这是 explanation layer，属于 supporting trust layer，不是 main product layer。",
        "你不是预测层。",
        "解释这张盘里最值得理解的结构、组合与术语含义。",
        "不要输出运势预测、行动建议或时间推演。",
        "overview 用 1 段总结这张盘最值得理解的核心结构，长度控制在 70 到 110 个中文字符。",
        "keyPatterns 返回 3 个模式，每个模式包含 title、explanation、evidence。",
        "每个 title 控制在 6 到 14 个中文字符，避免报告式命名。",
        "每个 explanation 控制在 2 到 3 句、40 到 72 个中文字符，不要写成长篇论文，不要连续枚举过多相位。",
        "先解释用户能感受到的模式，再补一句结构来源；不要把术语解释写成术语列表。",
        "每个模式最多引用 2 条 evidence，优先选最能支撑结论的字段。",
        "terminologyNotes 返回 1 到 3 条帮助用户理解术语的说明。",
        "terminologyNotes 每条控制在 14 到 28 个中文字符，写给普通用户，不要写成教材定义。",
        "caveats 返回 1 到 4 条边界说明，尤其处理时间精度和证据不足场景。",
      ],
    }),
    schemaName: "chart_explanation_v1",
    payloadJson,
  };
}
