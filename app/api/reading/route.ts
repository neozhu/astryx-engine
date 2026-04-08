import {
  buildReadingUnavailableFromError,
  getReadingOutcomeStatus,
  parseReadingRequestBody,
  resolveReadingFlow,
} from "@/lib/reading";

async function readReadingRequest(request: Request) {
  return parseReadingRequestBody(await request.json());
}

export async function POST(request: Request) {
  try {
    const result = await resolveReadingFlow(await readReadingRequest(request));
    return Response.json(result, {
      status: getReadingOutcomeStatus(result),
    });
  } catch (error) {
    const unavailable = buildReadingUnavailableFromError(error);

    return Response.json(unavailable, {
      status: getReadingOutcomeStatus(unavailable),
    });
  }
}
