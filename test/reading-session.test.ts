import {
  rotateSessionToken,
  signSessionToken,
  verifySessionToken,
} from "@/lib/reading-session";

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
  it("round-trips a session token without requiring a secret", () => {
    const token = signSessionToken(basePayload);
    const decoded = verifySessionToken(token);

    expect(decoded.followUpCount).toBe(0);
    expect(decoded.asOf).toBe("2026-04-05T12:00:00.000Z");
    expect(decoded.normalizedBirth.city).toBe("New York");
  });

  it("rotates the token and increments follow-up count", () => {
    const firstToken = signSessionToken(basePayload);
    const secondToken = rotateSessionToken(firstToken);
    const decoded = verifySessionToken(secondToken);

    expect(decoded.followUpCount).toBe(1);
  });

  it("rejects malformed token structure", () => {
    expect(() => verifySessionToken("not-a-token")).toThrow(
      /invalid session token/i,
    );
  });

  it("rejects a malformed encoded payload", () => {
    const token = Buffer.from("not-json", "utf8").toString("base64url");

    expect(() => verifySessionToken(token)).toThrow(/invalid session token/i);
  });
});
