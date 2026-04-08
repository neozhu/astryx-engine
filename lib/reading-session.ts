import { createHmac, timingSafeEqual } from "node:crypto";

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

const TOKEN_SEPARATOR = ".";

function getSecret() {
  const secret = process.env.READING_SESSION_SECRET;

  if (!secret) {
    throw new Error("Missing READING_SESSION_SECRET");
  }

  return secret;
}

function encodePayload(payload: ReadingSessionPayload) {
  return Buffer.from(JSON.stringify(payload), "utf8").toString("base64url");
}

function decodePayload(encodedPayload: string) {
  return JSON.parse(
    Buffer.from(encodedPayload, "base64url").toString("utf8"),
  ) as ReadingSessionPayload;
}

function signEncodedPayload(encodedPayload: string) {
  return createHmac("sha256", getSecret())
    .update(encodedPayload)
    .digest("base64url");
}

function isValidSignature(expected: string, actual: string) {
  const expectedBytes = Buffer.from(expected, "utf8");
  const actualBytes = Buffer.from(actual, "utf8");

  if (expectedBytes.length !== actualBytes.length) {
    return false;
  }

  return timingSafeEqual(expectedBytes, actualBytes);
}

export function signSessionToken(payload: ReadingSessionPayload) {
  const encodedPayload = encodePayload(payload);
  const signature = signEncodedPayload(encodedPayload);

  return `${encodedPayload}${TOKEN_SEPARATOR}${signature}`;
}

export function verifySessionToken(token: string): ReadingSessionPayload {
  const separatorIndex = token.lastIndexOf(TOKEN_SEPARATOR);

  if (separatorIndex <= 0 || separatorIndex === token.length - 1) {
    throw new Error("Invalid session token");
  }

  const encodedPayload = token.slice(0, separatorIndex);
  const signature = token.slice(separatorIndex + 1);
  const expectedSignature = signEncodedPayload(encodedPayload);

  if (!isValidSignature(expectedSignature, signature)) {
    throw new Error("Invalid session token");
  }

  try {
    return decodePayload(encodedPayload);
  } catch {
    throw new Error("Invalid session token");
  }
}

export function rotateSessionToken(token: string) {
  const payload = verifySessionToken(token);

  return signSessionToken({
    ...payload,
    followUpCount: payload.followUpCount + 1,
  });
}
