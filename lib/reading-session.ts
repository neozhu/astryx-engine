export type NormalizedBirth = {
  year: number;
  month: number;
  day: number;
  hour: number | null;
  minute: number | null;
  postalCode?: string;
  city: string;
  country: string;
  birthTimePrecision: "exact" | "approximate" | "unknown";
};

export type ReadingSessionPayload = {
  normalizedBirth: NormalizedBirth;
  natalSummary: Record<string, string>;
  transitSummary: Record<string, string>;
  asOf: string;
  followUpCount: number;
};

function isRecord(value: unknown): value is Record<string, unknown> {
  return !!value && typeof value === "object" && !Array.isArray(value);
}

function isNormalizedBirth(value: unknown): value is NormalizedBirth {
  return (
    isRecord(value) &&
    typeof value.year === "number" &&
    typeof value.month === "number" &&
    typeof value.day === "number" &&
    (value.hour === null || typeof value.hour === "number") &&
    (value.minute === null || typeof value.minute === "number") &&
    (value.postalCode === undefined || typeof value.postalCode === "string") &&
    typeof value.city === "string" &&
    typeof value.country === "string" &&
    (value.birthTimePrecision === "exact" ||
      value.birthTimePrecision === "approximate" ||
      value.birthTimePrecision === "unknown")
  );
}

function isStringRecord(value: unknown): value is Record<string, string> {
  return (
    isRecord(value) &&
    Object.values(value).every((entry) => typeof entry === "string")
  );
}

function isReadingSessionPayload(value: unknown): value is ReadingSessionPayload {
  return (
    isRecord(value) &&
    isNormalizedBirth(value.normalizedBirth) &&
    isStringRecord(value.natalSummary) &&
    isStringRecord(value.transitSummary) &&
    typeof value.asOf === "string" &&
    typeof value.followUpCount === "number"
  );
}

function encodePayload(payload: ReadingSessionPayload) {
  return Buffer.from(JSON.stringify(payload), "utf8").toString("base64url");
}

function decodePayload(token: string) {
  let parsed: unknown;

  try {
    parsed = JSON.parse(Buffer.from(token, "base64url").toString("utf8"));
  } catch {
    throw new Error("Invalid session token");
  }

  if (!isReadingSessionPayload(parsed)) {
    throw new Error("Invalid session token");
  }

  return parsed;
}

export function signSessionToken(payload: ReadingSessionPayload) {
  return encodePayload(payload);
}

export function verifySessionToken(token: string): ReadingSessionPayload {
  if (!token.trim()) {
    throw new Error("Invalid session token");
  }

  return decodePayload(token);
}

export function rotateSessionToken(token: string) {
  const payload = verifySessionToken(token);

  return signSessionToken({
    ...payload,
    followUpCount: payload.followUpCount + 1,
  });
}
