import { fireEvent, render, screen } from "@testing-library/react";

import ReadingStartPage from "@/app/reading-start-page";
import type { ReadingOutcome } from "@/lib/reading";

const locationMatchOutcome: ReadingOutcome = {
  kind: "location-match",
  city: "",
  country: "China",
  postalCode: "215300",
  candidates: [
    { geonameId: 1, label: "昆山, 江苏, 中国" },
    { geonameId: 2, label: "昆山, 安徽, 中国" },
  ],
};

describe("Location match state", () => {
  it("renders the location match prompt inline under the form", () => {
    render(
      <ReadingStartPage
        onSubmit={() => undefined}
        isSubmitting={false}
        result={locationMatchOutcome}
      />,
    );

    expect(
      screen.getByRole("heading", {
        name: /确认出生地/i,
      }),
    ).toBeInTheDocument();
    expect(
      screen.getByText(/这个邮编 215300 对应多个中国地点/i),
    ).toBeInTheDocument();
    expect(
      screen.getByText(/昆山, 江苏, 中国/i),
    ).toBeInTheDocument();
    expect(
      screen.getByText(/昆山, 安徽, 中国/i),
    ).toBeInTheDocument();
    expect(
      screen.getByRole("button", { name: /返回表单/i }),
    ).toBeInTheDocument();

    const form = document.getElementById("reading-start-form");
    const matchHeading = screen.getByRole("heading", {
      name: /确认出生地/i,
    });

    expect(form).not.toBeNull();
    expect(
      form!.compareDocumentPosition(matchHeading) &
        Node.DOCUMENT_POSITION_FOLLOWING,
    ).not.toBe(0);
  });

  it("returns focus to the intake form when the back affordance is used", () => {
    render(
      <ReadingStartPage
        onSubmit={() => undefined}
        isSubmitting={false}
        result={locationMatchOutcome}
      />,
    );

    const form = document.getElementById("reading-start-form") as HTMLFormElement;
    const postalCodeInput = screen.getByLabelText(/邮编/i);

    fireEvent.click(screen.getByRole("button", { name: /返回表单/i }));

    expect(document.activeElement).toBe(postalCodeInput);
    expect(form.contains(document.activeElement)).toBe(true);
  });
});
