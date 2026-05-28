const STREAM_CONTEXT_MAX = 80;
const STREAM_CONTEXT_BLOCK_RE = /\n\n\[AI stream context: ([^\]\n]+)\]\s*$/;

export function normalizeInboxStreamContextName(value: unknown): string | null {
  if (typeof value !== "string") return null;
  const trimmed = value.trim().replace(/\s+/g, " ");
  if (!trimmed) return null;
  return trimmed.length > STREAM_CONTEXT_MAX ? trimmed.slice(0, STREAM_CONTEXT_MAX) : trimmed;
}

export function appendInboxStreamContext(rawContent: string, streamName: string | null): string {
  if (!streamName) return rawContent;
  return `${rawContent}\n\n[AI stream context: ${streamName}]`;
}

export function stripInboxStreamContext(rawContent: string): { content: string; streamName: string | null } {
  const match = STREAM_CONTEXT_BLOCK_RE.exec(rawContent);
  if (!match) {
    return { content: rawContent, streamName: null };
  }

  const content = rawContent.slice(0, match.index).trimEnd();
  return {
    content,
    streamName: match[1] ?? null,
  };
}
