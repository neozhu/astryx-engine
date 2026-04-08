"use client";

import { useRef, useState, type FormEvent } from "react";

import ReadingStartPage from "@/app/reading-start-page";
import {
  isFollowUpOutcome,
  isReadingOutcome,
  type FollowUpTopic,
  type FollowUpTurn,
  type ReadingOutcome,
} from "@/lib/reading";

function getField(formData: FormData, name: string) {
  const value = formData.get(name);

  return typeof value === "string" ? value : "";
}

export default function Home() {
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isSubmittingFollowUp, setIsSubmittingFollowUp] = useState(false);
  const [result, setResult] = useState<ReadingOutcome | null>(null);
  const [followUpTurns, setFollowUpTurns] = useState<FollowUpTurn[]>([]);
  const [followUpError, setFollowUpError] = useState<string | null>(null);
  const latestRequestIdRef = useRef(0);
  const latestFollowUpRequestIdRef = useRef(0);

  function getDisplayedQuestion(topic: FollowUpTopic, question: string) {
    if (topic === "love") {
      return "感情";
    }

    if (topic === "career-change") {
      return "工作变动";
    }

    if (topic === "anxiety") {
      return "焦虑与情绪";
    }

    return question;
  }

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    const form = event.currentTarget;
    const formData = new FormData(form);

    setIsSubmitting(true);
    setResult(null);
    setFollowUpTurns([]);
    setFollowUpError(null);
    const requestId = latestRequestIdRef.current + 1;
    latestRequestIdRef.current = requestId;

    try {
      const payload = {
        year: getField(formData, "year"),
        month: getField(formData, "month"),
        day: getField(formData, "day"),
        hour: getField(formData, "hour"),
        minute: getField(formData, "minute"),
        postalCode: getField(formData, "postalCode"),
      };

      const response = await fetch("/api/reading", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(payload),
      });

      const responsePayload = (await response.json()) as unknown;

      if (latestRequestIdRef.current !== requestId) {
        return;
      }

      if (isReadingOutcome(responsePayload)) {
        setResult(responsePayload);
        return;
      }

      setResult({ kind: "reading-unavailable" });
    } catch {
      if (latestRequestIdRef.current !== requestId) {
        return;
      }

      setResult({ kind: "reading-unavailable" });
    } finally {
      if (latestRequestIdRef.current === requestId) {
        setIsSubmitting(false);
      }
    }
  }

  async function handleFollowUp(topic: FollowUpTopic, question: string) {
    if (
      result?.kind !== "ready" ||
      result.remainingFollowUps <= 0 ||
      isSubmittingFollowUp
    ) {
      return;
    }

    setIsSubmittingFollowUp(true);
    setFollowUpError(null);
    const requestId = latestFollowUpRequestIdRef.current + 1;
    latestFollowUpRequestIdRef.current = requestId;

    try {
      const response = await fetch("/api/reading/follow-up", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          sessionToken: result.sessionToken,
          topic,
          question,
          priorTurns: followUpTurns,
        }),
      });

      const payload = (await response.json()) as unknown;

      if (
        latestFollowUpRequestIdRef.current !== requestId ||
        !isFollowUpOutcome(payload)
      ) {
        return;
      }

      if (payload.kind === "follow-up-ready") {
        const displayedQuestion = getDisplayedQuestion(topic, question);

        setResult((current) =>
          current?.kind === "ready"
            ? {
                ...current,
                sessionToken: payload.sessionToken,
                remainingFollowUps: payload.remainingFollowUps,
              }
            : current,
        );
        setFollowUpTurns((current) => [
          ...current,
          { role: "user", paragraphs: [displayedQuestion] },
          { role: "assistant", paragraphs: payload.answer.paragraphs },
        ]);
        return;
      }

      setResult((current) =>
        current?.kind === "ready"
          ? {
              ...current,
              remainingFollowUps: payload.remainingFollowUps,
            }
          : current,
      );
      setFollowUpError(payload.message);
    } catch {
      if (latestFollowUpRequestIdRef.current !== requestId) {
        return;
      }

      setFollowUpError("暂时无法生成追问解读。");
    } finally {
      if (latestFollowUpRequestIdRef.current === requestId) {
        setIsSubmittingFollowUp(false);
      }
    }
  }

  return (
    <ReadingStartPage
      onSubmit={handleSubmit}
      isSubmitting={isSubmitting}
      result={result}
      followUpTurns={followUpTurns}
      isSubmittingFollowUp={isSubmittingFollowUp}
      followUpError={followUpError}
      onSelectFollowUp={(topic) => {
        void handleFollowUp(topic, "");
      }}
      onSubmitCustomQuestion={(question) => {
        void handleFollowUp("custom", question);
      }}
    />
  );
}
