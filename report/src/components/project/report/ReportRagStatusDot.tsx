type RagStatus = "green" | "amber" | "red" | "neutral";

function toRagStatus(status: string): RagStatus {
  const normalized = status.toLowerCase();
  if (normalized === "green") return "green";
  if (normalized === "amber" || normalized === "yellow") return "amber";
  if (normalized === "red") return "red";
  return "neutral";
}

function ragDotClass(status: RagStatus): string {
  switch (status) {
    case "green":
      return "bg-[var(--ds-status-success)]";
    case "amber":
      return "bg-[var(--ds-status-warning)]";
    case "red":
      return "bg-[var(--ds-status-danger)]";
    default:
      return "bg-[var(--ds-status-neutral)]";
  }
}

function ragWord(status: RagStatus): string {
  switch (status) {
    case "green":
      return "Green";
    case "amber":
      return "Amber";
    case "red":
      return "Red";
    default:
      return "Neutral";
  }
}

function ragPhrase(status: RagStatus): string {
  switch (status) {
    case "green":
      return "On Track";
    case "amber":
      return "At Risk";
    case "red":
      return "Off Track";
    default:
      return "Unknown";
  }
}

function ragPhraseClass(status: RagStatus): string {
  switch (status) {
    case "green":
      return "text-[var(--ds-status-success-fg)]";
    case "amber":
      return "text-[var(--ds-status-warning-fg)]";
    case "red":
      return "text-[var(--ds-status-danger-fg)]";
    default:
      return "text-[var(--ds-text-secondary)]";
  }
}

type ReportRagStatusDotProps = {
  status: string;
  /** When set, renders dot plus phrase (e.g. "at risk") beside it. */
  showPhrase?: boolean;
  /** Smaller phrase styling for dense rows such as key metrics. */
  compact?: boolean;
  /** Muted phrase colour for secondary contexts such as card headers. */
  subtlePhrase?: boolean;
};

export function ReportRagStatusDot({
  status,
  showPhrase = false,
  compact = false,
  subtlePhrase = false,
}: ReportRagStatusDotProps) {
  const ragStatus = toRagStatus(status);

  if (showPhrase) {
    return (
      <span className="inline-flex min-w-0 flex-wrap items-center gap-x-2 gap-y-1">
        <span
          className={`size-[0.6875rem] shrink-0 rounded-full ${ragDotClass(ragStatus)}`}
          aria-hidden
        />
        <span
          className={[
            "tracking-tight line-clamp-2 break-words",
            compact ? "text-[length:var(--ds-text-xs)] font-medium" : "text-2xl font-semibold",
            subtlePhrase ? "text-[var(--ds-text-secondary)]" : ragPhraseClass(ragStatus),
          ].join(" ")}
        >
          {ragPhrase(ragStatus)}
        </span>
      </span>
    );
  }

  return (
    <span
      className="inline-flex shrink-0 items-center"
      title={`RAG ${ragWord(ragStatus)}`}
      aria-label={`RAG ${ragWord(ragStatus)}`}
    >
      <span
        className={`size-[0.6875rem] shrink-0 rounded-full ${ragDotClass(ragStatus)}`}
        aria-hidden
      />
    </span>
  );
}
