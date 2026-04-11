"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { flushSync } from "react-dom";
import { AnimatePresence, motion } from "framer-motion";
import { intelligentDraftToRisk } from "@/domain/risk/risk.mapper";
import { useRiskRegister } from "@/store/risk-register.store";
import { useRiskCategoryOptions } from "@/components/risk-register/RiskCategoryOptionsContext";
import { useRiskStatusOptions } from "@/components/risk-register/RiskStatusOptionsContext";
import { Callout } from "@visualify/design-system";
import type { GuidedRiskConversationState } from "@/lib/ai/guidedRiskConversationState";

type ChatMessage = {
  role: "user" | "assistant";
  content: string;
  id: string;
  /** When true, assistant bubble plays mount-in motion (handoff / new reply). */
  animateEntry?: boolean;
};

const INITIAL_ASSISTANT: Omit<ChatMessage, "id"> = {
  role: "assistant",
  content:
    "Let's talk about your project—what risk would you like to work through?",
};

const INITIAL_MESSAGES: ChatMessage[] = [
  { ...INITIAL_ASSISTANT, id: "initial-assistant", animateEntry: true },
];

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

function TypingDotsBubble() {
  return (
    <div
      className="inline-flex items-center gap-1 rounded-2xl rounded-bl-md bg-[var(--ds-surface-muted)] px-4 py-3"
      aria-hidden
    >
      <span className="h-1.5 w-1.5 animate-bounce rounded-full bg-[var(--ds-text-muted)] [animation-delay:-0.3s]" />
      <span className="h-1.5 w-1.5 animate-bounce rounded-full bg-[var(--ds-text-muted)] [animation-delay:-0.15s]" />
      <span className="h-1.5 w-1.5 animate-bounce rounded-full bg-[var(--ds-text-muted)]" />
    </div>
  );
}

const ASSISTANT_BUBBLE_ENTER = {
  duration: 0.28,
  ease: [0.22, 1, 0.36, 1] as const,
};

/** Opening sequence: show typing dots before the first assistant line. */
const OPENING_TYPING_MS = 750;

export function RiskChatPanel({
  projectId,
  onRiskCreated,
}: {
  projectId?: string | null;
  onRiskCreated?: (riskId: string) => void;
} = {}) {
  const { appendRisks } = useRiskRegister();
  const { categoryNames } = useRiskCategoryOptions();
  const { statuses } = useRiskStatusOptions();
  const statusNames = useMemo(() => statuses.map((s) => s.name), [statuses]);
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [openingTyping, setOpeningTyping] = useState(true);
  const [input, setInput] = useState("");
  const [sendStatus, setSendStatus] = useState<"idle" | "loading" | "error">("idle");
  const [sendError, setSendError] = useState<string | null>(null);
  /** When set, typing dots hide and exit; reply is appended after exit (risk-chat handoff). */
  const [stagedAssistantReply, setStagedAssistantReply] = useState<string | null>(null);
  const stagedAssistantReplyRef = useRef<string | null>(null);
  const messageIdRef = useRef(0);
  const nextMessageId = useCallback(() => {
    messageIdRef.current += 1;
    return `chat-msg-${messageIdRef.current}`;
  }, []);
  const [lastTurnBooleans, setLastTurnBooleans] = useState<{
    readyToCreate: boolean;
    needsFollowUp: boolean;
  }>({ readyToCreate: false, needsFollowUp: true });
  /** When true, we show the typing dots only for normal chat, not for inline extract. */
  const [extractInlineActive, setExtractInlineActive] = useState(false);
  const scrollRef = useRef<HTMLDivElement>(null);
  /** Latest structured state from /api/ai/risk-chat (sent to /api/ai/extract-risk as `conversationState`). */
  const lastGuidedStateRef = useRef<GuidedRiskConversationState | null>(null);

  useEffect(() => {
    scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight, behavior: "smooth" });
  }, [messages, sendStatus]);

  useEffect(() => {
    const id = window.setTimeout(() => {
      setMessages(INITIAL_MESSAGES);
      setOpeningTyping(false);
    }, OPENING_TYPING_MS);
    return () => window.clearTimeout(id);
  }, []);

  const handleTypingExitComplete = useCallback(() => {
    const text = stagedAssistantReplyRef.current;
    if (text == null) return;
    stagedAssistantReplyRef.current = null;
    const delayMs = 56;
    window.setTimeout(() => {
      setMessages((prev) => [
        ...prev,
        {
          role: "assistant",
          content: text,
          id: nextMessageId(),
          animateEntry: true,
        },
      ]);
      setStagedAssistantReply(null);
      setSendStatus("idle");
    }, delayMs);
  }, [nextMessageId]);

  const sendUserMessage = useCallback(async () => {
    const text = input.trim();
    if (!text || sendStatus === "loading" || openingTyping) return;
    setSendError(null);
    const userMsg: ChatMessage = { role: "user", content: text, id: nextMessageId() };
    const next = [...messages, userMsg];
    setInput("");

    if (lastTurnBooleans.readyToCreate && isConfirmationIntent(text)) {
      setMessages([
        ...next,
        {
          role: "assistant",
          content: "Creating the risk now…",
          id: nextMessageId(),
          animateEntry: true,
        },
      ]);
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
              id: nextMessageId(),
              animateEntry: true,
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
            ...(categoryNames.length > 0 ? { categories: categoryNames } : {}),
            ...(lastGuidedStateRef.current != null
              ? {
                  conversationState: lastGuidedStateRef.current,
                  guidedImpactClear: lastGuidedStateRef.current.sufficiency.inherentClear,
                  ...(lastGuidedStateRef.current.fields.impact.appliesTo
                    ? { guidedAppliesTo: lastGuidedStateRef.current.fields.impact.appliesTo }
                    : {}),
                }
              : {}),
            ...(projectId != null && projectId.trim() !== "" ? { projectId: projectId.trim() } : {}),
          }),
        });
        const data = await res.json().catch(() => ({}));
        if (!res.ok) {
          const msg = typeof data?.error === "string" ? data.error : "Could not create the risk.";
          setMessages((prev) => [
            ...prev.slice(0, -1),
            {
              role: "assistant",
              content: `Couldn't create the risk: ${msg}`,
              id: nextMessageId(),
              animateEntry: true,
            },
          ]);
          setSendStatus("idle");
          setExtractInlineActive(false);
          return;
        }
        const draft = data?.risk;
        if (!draft) {
          setMessages((prev) => [
            ...prev.slice(0, -1),
            {
              role: "assistant",
              content: "Couldn't create the risk: invalid response from server.",
              id: nextMessageId(),
              animateEntry: true,
            },
          ]);
          setSendStatus("idle");
          setExtractInlineActive(false);
          return;
        }
        const risk = intelligentDraftToRisk(draft, {
          categoryNames: categoryNames.length > 0 ? categoryNames : undefined,
          statusNames: statusNames.length > 0 ? statusNames : undefined,
        });
        flushSync(() => {
          appendRisks([risk]);
        });
        onRiskCreated?.(risk.id);
        setMessages((prev) => [
          ...prev.slice(0, -1),
          {
            role: "assistant",
            content: "Risk added to the register.",
            id: nextMessageId(),
            animateEntry: true,
          },
        ]);
        setSendStatus("idle");
        setExtractInlineActive(false);
      } catch (e) {
        const msg = e instanceof Error ? e.message : "Network error";
        setMessages((prev) => [
          ...prev.slice(0, -1),
          {
            role: "assistant",
            content: `Couldn't create the risk: ${msg}`,
            id: nextMessageId(),
            animateEntry: true,
          },
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
        body: JSON.stringify({ messages: next, categories: categoryNames }),
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
      const cs = data.conversationState;
      if (cs && typeof cs === "object") {
        lastGuidedStateRef.current = cs as GuidedRiskConversationState;
      }
      setLastTurnBooleans({ readyToCreate, needsFollowUp });
      stagedAssistantReplyRef.current = assistantText;
      setStagedAssistantReply(assistantText);
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
    categoryNames,
    statusNames,
    appendRisks,
    onRiskCreated,
    nextMessageId,
    openingTyping,
  ]);

  const canSend = input.trim().length > 0 && sendStatus !== "loading" && !openingTyping;

  return (
    <div className="flex flex-col flex-1 min-h-0">
      <div
        ref={scrollRef}
        className="flex-1 min-h-[200px] space-y-4 overflow-y-auto bg-[var(--ds-app-document-bg)] px-4 py-4 sm:px-6"
      >
        <div className="mx-auto max-w-3xl space-y-4">
          {openingTyping && (
            <motion.div
              key="opening-typing"
              initial={{ opacity: 0, y: 6 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.18, ease: [0.4, 0, 0.2, 1] }}
              className="flex justify-start"
              aria-hidden
            >
              <TypingDotsBubble />
            </motion.div>
          )}
          {messages.map((m) => (
            <div
              key={m.id}
              className={m.role === "user" ? "flex justify-end" : "flex justify-start"}
            >
              {m.role === "user" ? (
                <div className="max-w-[min(100%,85%)] rounded-2xl rounded-br-md bg-[var(--ds-primary)] px-4 py-3 text-sm leading-relaxed text-[var(--ds-primary-text)] whitespace-pre-wrap">
                  {m.content}
                </div>
              ) : (
                <motion.div
                  initial={
                    m.animateEntry ? { opacity: 0, y: 8, scale: 0.98 } : false
                  }
                  animate={{ opacity: 1, y: 0, scale: 1 }}
                  transition={{
                    duration: ASSISTANT_BUBBLE_ENTER.duration,
                    ease: ASSISTANT_BUBBLE_ENTER.ease,
                  }}
                  className="max-w-[min(100%,85%)] rounded-2xl rounded-bl-md bg-[var(--ds-surface-muted)] px-4 py-3 text-sm leading-relaxed text-[var(--ds-text-primary)] whitespace-pre-wrap"
                >
                  {m.content}
                </motion.div>
              )}
            </div>
          ))}
          <AnimatePresence onExitComplete={handleTypingExitComplete}>
            {sendStatus === "loading" &&
              !extractInlineActive &&
              stagedAssistantReply === null && (
                <motion.div
                  key="risk-chat-typing"
                  initial={{ opacity: 0, y: 6 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: 4 }}
                  transition={{ duration: 0.18, ease: [0.4, 0, 0.2, 1] }}
                  className="flex justify-start"
                >
                  <TypingDotsBubble />
                </motion.div>
              )}
          </AnimatePresence>
        </div>
      </div>

      <div className="shrink-0 space-y-3 bg-[var(--ds-surface-muted)] px-4 pt-3 pb-4 sm:px-6">
        <div className="mx-auto max-w-3xl space-y-3">
          {sendError && (
            <Callout status="danger" role="alert" className="!m-0 text-[length:var(--ds-text-sm)]">
              {sendError}
            </Callout>
          )}

          {lastTurnBooleans.readyToCreate && !extractInlineActive && (
            <p className="text-center text-xs text-[var(--ds-text-muted)]">
              Say &quot;create&quot; to add this risk to the register.
            </p>
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
              disabled={openingTyping}
              className="max-h-32 min-h-[44px] flex-1 resize-none bg-transparent px-1 py-2.5 text-sm text-[var(--ds-text-primary)] placeholder:text-[var(--ds-text-muted)] focus:outline-none disabled:cursor-not-allowed disabled:opacity-50"
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
