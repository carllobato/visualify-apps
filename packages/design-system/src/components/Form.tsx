import * as React from "react";

type LabelProps = React.LabelHTMLAttributes<HTMLLabelElement>;
type InputProps = React.InputHTMLAttributes<HTMLInputElement>;
type TextareaProps = React.TextareaHTMLAttributes<HTMLTextAreaElement>;
type TextProps = React.HTMLAttributes<HTMLParagraphElement>;

export function Label({ className = "", ...props }: LabelProps) {
  const base = "mb-1.5 inline-block text-[length:var(--ds-text-sm)] font-medium text-[var(--ds-text-primary)]";
  return <label className={`${base} ${className}`} {...props} />;
}

/** Document-surface control chrome (`--ds-document-tile-*`) — shared by DS inputs and app native selects. */
export const dsDocumentTileFieldClass =
  "border border-[var(--ds-document-tile-border)] bg-[var(--ds-document-tile-bg)] shadow-[var(--ds-document-tile-shadow)] " +
  "transition-[box-shadow,background-color] duration-200 ease-out " +
  "enabled:hover:bg-[var(--ds-document-tile-hover-bg)] enabled:hover:shadow-[var(--ds-document-tile-hover-shadow)]";

export function dsFieldChromeClassName(invalid: boolean): string {
  return invalid
    ? "ring-2 ring-inset ring-[var(--ds-status-danger-border)] focus-visible:outline-[var(--ds-status-danger)]"
    : "ring-0 focus-visible:outline-[var(--ds-primary)]";
}

function fieldClass(invalid: boolean, variant: "input" | "textarea") {
  const sizeClass =
    variant === "input"
      ? "rounded-[var(--ds-radius-md)] px-3 py-2 h-10"
      : "min-h-[5rem] rounded-[var(--ds-radius-md)] px-3 py-2";

  return (
    `w-full ${sizeClass} ${dsDocumentTileFieldClass} ` +
    "text-[length:var(--ds-text-sm)] text-[var(--ds-text-primary)] " +
    "placeholder:text-[var(--ds-text-muted)] focus-visible:outline focus-visible:outline-2 " +
    "focus-visible:outline-offset-2 disabled:cursor-not-allowed disabled:shadow-none " +
    "disabled:bg-[var(--ds-surface-muted)] disabled:text-[var(--ds-text-muted)] " +
    dsFieldChromeClassName(invalid)
  );
}

/** Full class string for a single-line text-like `<input>` (use with native inputs or as reference). */
export function dsTextInputFieldClassName(invalid: boolean): string {
  return fieldClass(invalid, "input");
}

/** Native `<select>` — same document-tile chrome as {@link Input} (border uses `--ds-document-tile-border`, typically transparent). */
export function dsNativeSelectFieldClassName(invalid: boolean): string {
  return fieldClass(invalid, "input");
}

/** Full class string for `<textarea>` (same tile chrome as {@link dsTextInputFieldClassName}). */
export function dsTextareaFieldClassName(invalid: boolean): string {
  return fieldClass(invalid, "textarea");
}

export function Input({ className = "", "aria-invalid": ariaInvalid, ...props }: InputProps) {
  const invalid = ariaInvalid === true || ariaInvalid === "true";
  return <input className={`${fieldClass(invalid, "input")} ${className}`} aria-invalid={ariaInvalid} {...props} />;
}

export function Textarea({ className = "", "aria-invalid": ariaInvalid, rows = 4, ...props }: TextareaProps) {
  const invalid = ariaInvalid === true || ariaInvalid === "true";
  return (
    <textarea
      rows={rows}
      className={`${fieldClass(invalid, "textarea")} resize-y ${className}`}
      aria-invalid={ariaInvalid}
      {...props}
    />
  );
}

export function HelperText({ className = "", ...props }: TextProps) {
  const base = "mt-1.5 text-[length:var(--ds-text-xs)] leading-relaxed text-[var(--ds-text-muted)]";
  return <p className={`${base} ${className}`} {...props} />;
}

export function FieldError({ className = "", ...props }: TextProps) {
  const base = "mt-1.5 text-[length:var(--ds-text-xs)] leading-relaxed text-[var(--ds-status-danger-fg)]";
  return <p role="alert" className={`${base} ${className}`} {...props} />;
}
