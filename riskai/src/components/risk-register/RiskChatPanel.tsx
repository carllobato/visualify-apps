"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { intelligentDraftToRisk } from "@/domain/risk/risk.mapper";
import { useRiskRegister } from "@/store/risk-register.store";
import { Callout } from "@visualify/design-system";

type ChatMessage = { role: "user" | "assistant"; content: string };

const INITIAL_ASSISTANT: ChatMessage = {
  role: "assistant",
  content:
    "Describe the risk you are worried about—what could go wrong, what it would cost or delay, and any mitigation you already have in mind. I will ask follow-up questions if needed.",
};

function SendIcon({ className }: { className?: string }) {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      viewBox="0 0 24 24"
      fill="currentColor"
      className={className}
      aria-hidden
    >
      <path d="M2.01 21L23 12 2.01 3 2 10l15 2-15 2z" />
    </svg>
  );
}

function transcriptForExtract(messages: ChatMessage[]): string {
  return messages
    .map((m) => `${m.role === "user" ? "User" : "Assistant"}: ${m.content}`)
    .join("\n\n");
}

/** Local, conservative: user wants to create from chat instead of continuing Q&A. */
function isConfirmationIntent(raw: string): boolean {
  const t = raw.trim().toLowerCase().replace(/\s+/g, " ");
  if (!t) return false;
  const exact = new Set([
    "create",
    "yes",
    "y",
    "ok",
    "okay",
    "sure",
    "go ahead",
    "proceed",
    "confirm",
    "do it",
    "yes create it",
    "create it",
    "please create",
    "create the risk",
    "create risk",
  ]);
  if (exact.has(t)) return true;
  if (t.startsWith("yes ") && t.length <= 48) return true;
  if (t.includes("go ahead") && t.length <= 64) return true;
  if (t.includes("create") && t.length <= 64 && !/\b(no|not|don't|dont|wait|stop)\b/.test(t)) {
    return true;
  }
  return false;
}

function TypingIndicator() {
  return (
    <div className="flex justify-start">
      <div
        className="inline-flex items-center gap-1 rounded-2xl rounded-bl-md bg-[var(--ds-surface-muted)] px-4 py-3"
        aria-hidden
      >
        <span className="h-1.5 w-1.5 animate-bounce rounded-full bg-[var(--ds-text-muted)] [animation-delay:-0.3s]" />
        <span className="h-1.5 w-1.5 animate-bounce rounded-full bg-[var(--ds-text-muted)] [animation-delay:-0.15s]" />
        <span className="h-1.5 w-1.5 animate-bounce rounded-full bg-[var(--ds-text-muted)]" />
      </div>
    </div>
  );
}

export function RiskChatPanel({
  projectId,
  onRiskCreated,
}: {
  projectId?: string | null;
  onRiskCreated?: (riskId: string) => void;
} = {}) {
  const { appendRisks } = useRiskRegister();
  const [messages, setMessages] = useState<ChatMessage[]>([INITIAL_ASSISTANT]);
  const [input, setInput] = useState("");
  const [sendStatus, setSendStatus] = useState<"idle" | "loading" | "error">("idle");
  const [sendError, setSendError] = useState<string | null>(null);
  const [lastTurnBooleans, setLastTurnBooleans] = useState<{
    readyToCreate: boolean;
    needsFollowUp: boolean;
  }>({ readyToCreate: false, needsFollowUp: true });
  /** When true, we show the typing dots only for normal chat, not for inline extract. */
  const [extractInlineActive, setExtractInlineActive] = useState(false);
  const scrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight, behavior: "smooth" });
  }, [messages, sendStatus]);

  const sendUserMessage = useCallback(async () => {
    const text = input.trim();
    if (!text || sendStatus === "loading") return;
    setSendError(null);
    const userMsg: ChatMessage = { role: "user", content: text };
    const next = [...messages, userMsg];
    setInput("");

    if (lastTurnBooleans.readyToCreate && isConfirmationIntent(text)) {
      setMessages([...next, { role: "assistant", content: "Creating the risk now…" }]);
      setExtractInlineActive(true);
      setSendStatus("loading");
      try {
        const doc = transcriptForExtract(next).trim();
        if (doc.length < 20) {
          setMessages((prev) => [
            ...prev.slice(0, -1),
            {
              role: "assistant",
              content: "Need a bit more detail in the conversation before creating a risk.",
            },
          ]);
          setSendStatus("idle");
          setExtractInlineActive(false);
          return;
        }
        const res = await fetch("/api/ai/extract-risk", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            documentText: doc,
            ...(projectId != null && projectId.trim() !== "" ? { projectId: projectId.trim() } : {}),
          }),
        });
        const data = await res.json().catch(() => ({}));
        if (!res.ok) {
          const msg = typeof data?.error === "string" ? data.error : "Could not create the risk.";
          setMessages((prev) => [
            ...prev.slice(0, -1),
            { role: "assistant", content: `Couldn't create the risk: ${msg}` },
          ]);
          setSendStatus("idle");
          setExtractInlineActive(false);
          return;
        }
        const draft = data?.risk;
        if (!draft) {
          setMessages((prev) => [
            ...prev.slice(0, -1),
            { role: "assistant", content: "Couldn't create the risk: invalid response from server." },
          ]);
          setSendStatus("idle");
          setExtractInlineActive(false);
          return;
        }
        const risk = intelligentDraftToRisk(draft);
        appendRisks([risk]);
        onRiskCreated?.(risk.id);
        setMessages((prev) => [
          ...prev.slice(0, -1),
          { role: "assistant", content: "Risk added to the register." },
        ]);
        setSendStatus("idle");
        setExtractInlineActive(false);
      } catch (e) {
        const msg = e instanceof Error ? e.message : "Network error";
        setMessages((prev) => [
          ...prev.slice(0, -1),
          { role: "assistant", content: `Couldn't create the risk: ${msg}` },
        ]);
        setSendStatus("idle");
        setExtractInlineActive(false);
      }
      return;
    }

    setMessages(next);
    setSendStatus("loading");
    try {
      const res = await fetch("/api/ai/risk-chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ messages: next }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        const msg = typeof data?.error === "string" ? data.error : "Chat request failed";
        setSendError(msg);
        setSendStatus("error");
        return;
      }
      const assistantTextRaw =
        typeof data.assistantMessage === "string" ? data.assistantMessage : data.reply;
      const assistantText =
        typeof assistantTextRaw === "string" ? assistantTextRaw.trim() : "";
      if (!assistantText) {
        setSendError("Empty reply from assistant");
        setSendStatus("error");
        return;
      }
      const readyToCreate =
        typeof data.readyToCreate === "boolean" ? data.readyToCreate : false;
      const needsFollowUp =
        typeof data.needsFollowUp === "boolean" ? data.needsFollowUp : !readyToCreate;
      setLastTurnBooleans({ readyToCreate, needsFollowUp });
      setMessages((prev) => [...prev, { role: "assistant", content: assistantText }]);
      setSendStatus("idle");
    } catch (e) {
      setSendError(e instanceof Error ? e.message : "Network error");
      setSendStatus("error");
    }
  }, [
    input,
    messages,
    sendStatus,
    lastTurnBooleans.readyToCreate,
    projectId,
    appendRisks,
    onRiskCreated,
  ]);

  const canSend = input.trim().length > 0 && sendStatus !== "loading";

  return (
    <div className="flex flex-col flex-1 min-h-0">
      <div
        ref={scrollRef}
        className="flex-1 min-h-[200px] space-y-4 overflow-y-auto bg-[var(--ds-app-document-bg)] px-4 py-4 sm:px-6"
      >
        <div className="mx-auto max-w-3xl space-y-4">
          {messages.map((m, i) => (
            <div
              key={`${m.role}-${i}`}
              className={m.role === "user" ? "flex justify-end" : "flex justify-start"}
            >
              <div
                className={
                  m.role === "user"
                    ? "max-w-[min(100%,85%)] rounded-2xl rounded-br-md bg-[var(--ds-primary)] px-4 py-3 text-sm leading-relaxed text-[var(--ds-primary-text)] whitespace-pre-wrap"
                    : "max-w-[min(100%,85%)] rounded-2xl rounded-bl-md bg-[var(--ds-surface-muted)] px-4 py-3 text-sm leading-relaxed text-[var(--ds-text-primary)] whitespace-pre-wrap"
                }
              >
                {m.content}
              </div>
            </div>
          ))}
          {sendStatus === "loading" && !extractInlineActive && <TypingIndicator />}
        </div>
      </div>

      <div className="shrink-0 space-y-3 bg-[var(--ds-surface-muted)] px-4 pt-3 pb-4 sm:px-6">
        <div className="mx-auto max-w-3xl space-y-3">
          {sendError && (
            <Callout status="danger" role="alert" className="!m-0 text-[length:var(--ds-text-sm)]">
              {sendError}
            </Callout>
          )}

          <div className="flex items-end gap-2 rounded-[var(--ds-radius-lg)] bg-[var(--ds-surface-inset)] px-3 py-2 transition-shadow focus-within:shadow-[var(--ds-elevation-button-secondary)]">
            <textarea
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter" && !e.shiftKey) {
                  e.preventDefault();
                  void sendUserMessage();
                }
              }}
              placeholder="Message…"
              rows={1}
              className="max-h-32 min-h-[44px] flex-1 resize-none bg-transparent px-1 py-2.5 text-sm text-[var(--ds-text-primary)] placeholder:text-[var(--ds-text-muted)] focus:outline-none"
              aria-label="Message"
            />
            <button
              type="button"
              onClick={() => void sendUserMessage()}
              disabled={!canSend}
              className="mb-0.5 flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-[var(--ds-primary)] text-[var(--ds-primary-text)] transition-opacity hover:opacity-90 disabled:pointer-events-none disabled:opacity-35"
              aria-label={sendStatus === "loading" ? "Sending" : "Send message"}
            >
              <SendIcon className="h-5 w-5 translate-x-px" />
            </button>
          </div>
          <p className="text-center text-xs text-[var(--ds-text-muted)]">
            Enter to send · Shift+Enter for a new line
          </p>
        </div>
      </div>
    </div>
  );
}
