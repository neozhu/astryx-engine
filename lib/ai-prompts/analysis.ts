import { composePromptInstructions, type PromptDefinition } from "@/lib/ai-prompts/shared";

export function buildAnalysisPrompt(payloadJson: string): PromptDefinition {
  return {
    instructions: composePromptInstructions({
      role: [
        "你是核心解读层，负责输出用户正面看到的结构化主解读。",
        "你的内容必须像产品正文，不像研究报告、注释文档或占星术语清单。",
      ],
      taskRules: [
        "这是 main user-facing interpretation layer。",
        "sections 必须且只能包含以下七个 section：人格、行为与思维模式、关系与情感模式、职业与发展路径、优势与风险、人生主题、时间维度。",
        "JSON key 依次使用 personality、behaviorAndThinking、relationshipsAndEmotions、careerAndGrowth、strengthsAndRisks、lifeThemes、timeDimension。",
        "每个 section 都必须包含 summary、bullets、evidence、confidence。",
        "summary 应该是 1 段聚焦结论，优先 1 到 2 句，bullets 返回 1 到 2 条。",
        "bullets 只能补充 summary 里没有出现的新信息，禁止重复 summary 或仅做同义改写。",
        "如果某个 section 没有新的补充点，也要写出更具体的延伸信息，不要把 summary 拆成 bullet 重复出现。",
        "lifeThemes.summary 会直接显示为主标题，必须写成 18 到 36 个中文字符的单句标题，不要写成长段落。",
        "lifeThemes.summary 不要使用冒号、破折号、书名号，不要像报告标题。",
        "除 lifeThemes 外，其余 section 的 summary 控制在 45 到 90 个中文字符。",
        "bullets 每条控制在 18 到 40 个中文字符，写成短句，不要变成第二段 summary。",
        "每个 section 正文最多点到 1 到 2 个关键占星信号，不要把星座、宫位、相位连续堆在同一句。",
        "evidence 必须直接引用 payload 中的字段路径。",
        "时间维度只能做结构性时间判断，不要把它写成 forecast。",
      ],
    }),
    schemaName: "structured_analysis_v1",
    payloadJson,
  };
}
