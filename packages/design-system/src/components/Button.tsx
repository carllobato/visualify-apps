import * as React from "react";

type ButtonProps = React.ButtonHTMLAttributes<HTMLButtonElement> & {
  variant?: "primary" | "secondary" | "ghost";
  size?: "sm" | "md" | "lg";
  leftIcon?: React.ReactNode;
  rightIcon?: React.ReactNode;
};

export function Button({
  variant = "primary",
  size = "md",
  leftIcon,
  rightIcon,
  className = "",
  type = "button",
  children,
  ...props
}: ButtonProps) {
  const base =
    "inline-flex items-center justify-center gap-2 rounded-[var(--ds-radius-md)] font-medium " +
    "transition-all duration-150 ease-out focus-visible:outline focus-visible:outline-2 " +
    "focus-visible:outline-offset-2 focus-visible:outline-[var(--ds-primary)] " +
    "disabled:pointer-events-none disabled:opacity-[0.38]";
  const sizes: Record<NonNullable<ButtonProps["size"]>, string> = {
    sm: "h-8 px-3 text-[length:var(--ds-text-sm)]",
    md: "h-9 px-4 text-[length:var(--ds-text-sm)]",
    lg: "h-10 px-5 text-[length:var(--ds-text-base)]",
  };
  const variants: Record<NonNullable<ButtonProps["variant"]>, string> = {
    primary:
      "bg-[var(--ds-primary)] text-[var(--ds-primary-foreground)] shadow-[var(--ds-shadow-sm)] " +
      "hover:brightness-[1.07] active:brightness-[0.97] disabled:shadow-none",
    secondary:
      "border border-[var(--ds-border)] bg-[var(--ds-surface-elevated)] text-[var(--ds-text-primary)] " +
      "hover:bg-[var(--ds-surface-muted)]",
    ghost:
      "bg-transparent text-[var(--ds-text-secondary)] " +
      "hover:bg-[color-mix(in_oklab,var(--ds-muted)_48%,transparent)]",
  };

  return (
    <button type={type} className={`${base} ${sizes[size]} ${variants[variant]} ${className}`} {...props}>
      {leftIcon ? <span aria-hidden className="inline-flex items-center">{leftIcon}</span> : null}
      {children}
      {rightIcon ? <span aria-hidden className="inline-flex items-center">{rightIcon}</span> : null}
    </button>
  );
}
