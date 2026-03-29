import * as React from "react";

type LabelProps = React.LabelHTMLAttributes<HTMLLabelElement>;
type InputProps = React.InputHTMLAttributes<HTMLInputElement>;
type TextareaProps = React.TextareaHTMLAttributes<HTMLTextAreaElement>;
type TextProps = React.HTMLAttributes<HTMLParagraphElement>;

export function Label({ className = "", ...props }: LabelProps) {
  const base = "mb-1.5 inline-block text-[length:var(--ds-text-sm)] font-medium text-[var(--ds-text-primary)]";
  return <label className={`${base} ${className}`} {...props} />;
}

function fieldClass(invalid?: boolean) {
  const invalidClass = invalid
    ? "border-2 border-[var(--ds-status-danger-border)] focus-visible:outline-[var(--ds-status-danger)]"
    : "border border-[var(--ds-border-subtle)] focus-visible:outline-[var(--ds-primary)] " +
        "enabled:hover:border-[var(--ds-control-border-hover)] enabled:hover:bg-[var(--ds-input-bg-hover)]";

  return (
    "w-full rounded-[var(--ds-radius-md)] bg-[var(--ds-surface-inset)] px-3 py-2 " +
    "text-[length:var(--ds-text-sm)] text-[var(--ds-text-primary)] transition-colors duration-150 " +
    "placeholder:text-[var(--ds-text-muted)] focus-visible:outline focus-visible:outline-2 " +
    "focus-visible:outline-offset-2 disabled:cursor-not-allowed disabled:bg-[var(--ds-surface-muted)] " +
    "disabled:text-[var(--ds-text-muted)] " +
    invalidClass
  );
}

export function Input({ className = "", "aria-invalid": ariaInvalid, ...props }: InputProps) {
  const invalid = ariaInvalid === true || ariaInvalid === "true";
  return <input className={`${fieldClass(invalid)} ${className}`} aria-invalid={ariaInvalid} {...props} />;
}

export function Textarea({ className = "", "aria-invalid": ariaInvalid, rows = 4, ...props }: TextareaProps) {
  const invalid = ariaInvalid === true || ariaInvalid === "true";
  return (
    <textarea
      rows={rows}
      className={`${fieldClass(invalid)} min-h-24 resize-y ${className}`}
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
