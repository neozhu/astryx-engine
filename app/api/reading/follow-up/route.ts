import {
  parseFollowUpRequestBody,
  resolveReadingFollowUp,
} from "@/lib/reading";

async function readFollowUpRequest(request: Request) {
  return parseFollowUpRequestBody(await request.json());
}

export async function POST(request: Request) {
  try {
    const result = await resolveReadingFollowUp(await readFollowUpRequest(request));
    return Response.json(result);
  } catch {
    return Response.json({
      kind: "follow-up-unavailable",
      message: "暂时无法生成追问解读。",
      retryable: false,
      remainingFollowUps: 0,
    });
  }
}
