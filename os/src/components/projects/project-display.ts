import { streamAccentColor, streamIconGlyph } from "@/components/streams/stream-display";
import type { OsStream } from "@/lib/os/streams-data";

export function projectInitialGlyph(project: { name: string }): string {
  const letter = project.name.trim().charAt(0);
  return letter ? letter.toUpperCase() : "·";
}

export function streamLabelForProject(
  streamId: string | null,
  streamsById: ReadonlyMap<string, OsStream>,
): string | null {
  if (!streamId) return null;
  const stream = streamsById.get(streamId);
  return stream?.name?.trim() ?? null;
}

export function projectStatusLabel(status: string): string {
  const key = status.trim().toLowerCase();
  if (key === "active") return "Active";
  if (key === "archived") return "Archived";
  const trimmed = status.trim();
  return trimmed || "Unknown";
}

export { streamAccentColor, streamIconGlyph };
