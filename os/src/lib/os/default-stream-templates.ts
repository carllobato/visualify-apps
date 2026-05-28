/**
 * First-run default streams for OS (Stage 21B).
 * Applied only when the user has zero active streams — not a permanent catalog API.
 */
export type DefaultStreamTemplate = {
  name: string;
  icon: string;
  color: string;
};

export const OS_DEFAULT_STREAM_TEMPLATES: readonly DefaultStreamTemplate[] = [
  { name: "Work", icon: "◆", color: "#5b6b7a" },
  { name: "Visualify", icon: "◎", color: "#4a6f8c" },
  { name: "Wedding", icon: "◇", color: "#8f7d72" },
  { name: "Health", icon: "+", color: "#5a8678" },
  { name: "Finance", icon: "¤", color: "#6e6e7a" },
  { name: "Personal", icon: "·", color: "#75757d" },
] as const;
