import * as React from "react";

type ButtonProps = React.ButtonHTMLAttributes<HTMLButtonElement> & {
  variant?: "primary" | "secondary" | "ghost";
};

export function Button({
  variant = "primary",
  className = "",
  type = "button",
  ...props
}: ButtonProps) {
  const base =
    "inline-flex items-center justify-center rounded-[16px] px-4 py-2.5 text-sm font-medium " +
    "transition-all duration-150 ease-out focus:outline-none " +
    "disabled:pointer-events-none disabled:opacity-50";
  const variants: Record<string, string> = {
    primary:
      "bg-[var(--ds-primary)] text-[var(--ds-primary-foreground)] shadow-[var(--ds-shadow-sm)] " +
      "hover:brightness-[1.07] disabled:shadow-none",
    secondary:
      "border border-[var(--ds-border)] bg-[var(--ds-card)] text-[var(--ds-foreground)] hover:bg-[var(--ds-muted)]",
    ghost:
      "bg-transparent text-[var(--ds-foreground)] " +
      "hover:bg-[color-mix(in_oklab,var(--ds-muted)_48%,transparent)]",
  };

  return <button type={type} className={`${base} ${variants[variant]} ${className}`} {...props} />;
}
