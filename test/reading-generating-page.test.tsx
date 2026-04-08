import { render, screen } from "@testing-library/react";

import ReadingStartPage from "@/app/reading-start-page";

describe("Reading generating state", () => {
  it("shows staged progress inline under the form while submitting", () => {
    render(
      <ReadingStartPage onSubmit={() => undefined} isSubmitting result={null} />,
    );

    expect(
      screen.getByRole("heading", {
        name: /开始你的解读/i,
      }),
    ).toBeInTheDocument();
    expect(
      screen.getByRole("heading", {
        name: /正在生成你的解读/i,
      }),
    ).toBeInTheDocument();
    expect(screen.getByText(/锁定出生信息/i)).toBeInTheDocument();
    expect(screen.getByText(/校准时间精度/i)).toBeInTheDocument();
    expect(screen.getByText(/整理本次解读/i)).toBeInTheDocument();

    const form = document.getElementById("reading-start-form");
    const loadingHeading = screen.getByRole("heading", {
      name: /正在生成你的解读/i,
    });

    expect(form).not.toBeNull();
    expect(
      form!.compareDocumentPosition(loadingHeading) &
        Node.DOCUMENT_POSITION_FOLLOWING,
    ).not.toBe(0);
  });
});
