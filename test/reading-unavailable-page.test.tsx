import { fireEvent, render, screen } from "@testing-library/react";

import ReadingStartPage from "@/app/reading-start-page";
import type { ReadingOutcome } from "@/lib/reading";

const unavailableOutcome: ReadingOutcome = {
  kind: "reading-unavailable",
};

const unavailableWithMessage: ReadingOutcome = {
  kind: "reading-unavailable",
  message: "当前星盘服务请求过多，请稍后再试。",
  retryable: true,
};

describe("Reading unavailable state", () => {
  it("renders the unavailable message inline under the form", () => {
    render(
      <ReadingStartPage
        onSubmit={() => undefined}
        isSubmitting={false}
        result={unavailableOutcome}
      />,
    );

    expect(
      screen.getByRole("heading", {
        name: /暂时无法生成解读/i,
      }),
    ).toBeInTheDocument();
    expect(
      screen.getByText(/请检查邮编或出生时间后再试一次/i),
    ).toBeInTheDocument();
    expect(
      screen.getByRole("button", { name: /重新生成/i }),
    ).toBeInTheDocument();

    const form = document.getElementById("reading-start-form");
    const unavailableHeading = screen.getByRole("heading", {
      name: /暂时无法生成解读/i,
    });

    expect(form).not.toBeNull();
    expect(
      form!.compareDocumentPosition(unavailableHeading) &
        Node.DOCUMENT_POSITION_FOLLOWING,
    ).not.toBe(0);
  });

  it("returns focus to the intake form when retry is used", () => {
    render(
      <ReadingStartPage
        onSubmit={() => undefined}
        isSubmitting={false}
        result={unavailableOutcome}
      />,
    );

    const form = document.getElementById("reading-start-form") as HTMLFormElement;
    const postalCodeInput = screen.getByLabelText(/邮编/i);

    fireEvent.click(screen.getByRole("button", { name: /重新生成/i }));

    expect(document.activeElement).toBe(postalCodeInput);
    expect(form.contains(document.activeElement)).toBe(true);
  });

  it("renders a specific unavailable message when one is provided", () => {
    render(
      <ReadingStartPage
        onSubmit={() => undefined}
        isSubmitting={false}
        result={unavailableWithMessage}
      />,
    );

    expect(
      screen.getByText(/当前星盘服务请求过多，请稍后再试。/i),
    ).toBeInTheDocument();
  });
});
