import { readFileSync } from "node:fs";
import path from "node:path";

describe("global anchor styles", () => {
  it("do not force all links to inherit body text color", () => {
    const css = readFileSync(
      path.join(process.cwd(), "app", "globals.css"),
      "utf8",
    );

    expect(css).not.toMatch(/a\s*\{[^}]*color:\s*inherit;/s);
  });

  it("defines the midnight astrology color tokens", () => {
    const css = readFileSync(
      path.join(process.cwd(), "app", "globals.css"),
      "utf8",
    );

    expect(css).toContain("--background: #0d1020;");
    expect(css).toContain("--foreground: #f3ecdf;");
    expect(css).toContain("--accent: #d8b975;");
    expect(css).not.toContain("--background: #f6efe5;");
  });
});
