const HEX_COLOR = /^#[0-9A-Fa-f]{3,8}$/;

export function streamAccentColor(color: string | null): string | null {
  const trimmed = color?.trim();
  if (!trimmed || !HEX_COLOR.test(trimmed)) return null;
  return trimmed;
}

export function streamIconGlyph(stream: { name: string; icon: string | null }): string {
  const icon = stream.icon?.trim();
  if (icon) return icon;
  const letter = stream.name.trim().charAt(0);
  return letter ? letter.toUpperCase() : "·";
}
