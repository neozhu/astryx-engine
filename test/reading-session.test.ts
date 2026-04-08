import {
  rotateSessionToken,
  signSessionToken,
  verifySessionToken,
} from "@/lib/reading-session";
import { createHmac } from "node:crypto";

const basePayload = {
  normalizedBirth: {
    year: 1990,
    month: 6,
    day: 15,
    hour: 14,
    minute: 30,
    city: "New York",
    country: "US",
    birthTimePrecision: "exact" as const,
  },
  natalSummary: {
    sun: "Gemini",
    moon: "Pisces",
  },
  transitSummary: {
    headline: "Current transits emphasize movement and emotional sensitivity.",
  },
  asOf: "2026-04-05T12:00:00.000Z",
  followUpCount: 0,
};

describe("reading-session", () => {
  const originalSecret = process.env.READING_SESSION_SECRET;

  afterEach(() => {
    if (originalSecret === undefined) {
      delete process.env.READING_SESSION_SECRET;
    } else {
      process.env.READING_SESSION_SECRET = originalSecret;
    }
  });

  it("round-trips a signed session token", () => {
    process.env.READING_SESSION_SECRET = "test-secret";

    const token = signSessionToken(basePayload);
    const decoded = verifySessionToken(token);

    expect(decoded.followUpCount).toBe(0);
    expect(decoded.asOf).toBe("2026-04-05T12:00:00.000Z");
    expect(decoded.normalizedBirth.city).toBe("New York");
  });

  it("rotates the token and increments follow-up count", () => {
    process.env.READING_SESSION_SECRET = "test-secret";

    const firstToken = signSessionToken(basePayload);
    const secondToken = rotateSessionToken(firstToken);
    const decoded = verifySessionToken(secondToken);

    expect(decoded.followUpCount).toBe(1);
  });

  it("rejects a tampered token", () => {
    process.env.READING_SESSION_SECRET = "test-secret";

    const token = signSessionToken(basePayload);
    const tampered = `${token.slice(0, -2)}xx`;

    expect(() => verifySessionToken(tampered)).toThrow(/invalid session token/i);
  });

  it("rejects malformed token structure", () => {
    process.env.READING_SESSION_SECRET = "test-secret";

    expect(() => verifySessionToken("not-a-token")).toThrow(
      /invalid session token/i,
    );
  });

  it("rejects a malformed but signed payload", () => {
    process.env.READING_SESSION_SECRET = "test-secret";

    const encodedPayload = Buffer.from("not-json", "utf8").toString("base64url");
    const signature = createHmac("sha256", "test-secret")
      .update(encodedPayload)
      .digest("base64url");

    const token = `${encodedPayload}.${signature}`;

    expect(() => verifySessionToken(token)).toThrow(/invalid session token/i);
  });

  it("throws when the secret is missing", () => {
    delete process.env.READING_SESSION_SECRET;

    expect(() => signSessionToken(basePayload)).toThrow(
      /missing READING_SESSION_SECRET/i,
    );
  });
});
