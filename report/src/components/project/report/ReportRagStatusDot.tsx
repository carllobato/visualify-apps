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

type ReportRagStatusDotProps = {
  status: string;
};

export function ReportRagStatusDot({ status }: ReportRagStatusDotProps) {
  const ragStatus = toRagStatus(status);

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
