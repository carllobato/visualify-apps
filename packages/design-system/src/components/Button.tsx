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
    "inline-flex cursor-pointer items-center justify-center gap-2 rounded-[var(--ds-radius-md)] font-medium " +
    "transition-all duration-150 ease-out focus-visible:outline focus-visible:outline-2 " +
    "focus-visible:outline-offset-2 focus-visible:outline-[var(--ds-primary)] " +
    "disabled:cursor-not-allowed disabled:opacity-[0.38]";
  const sizes: Record<NonNullable<ButtonProps["size"]>, string> = {
    sm: "h-8 px-3 text-[length:var(--ds-text-sm)]",
    md: "h-10 px-4 text-[length:var(--ds-text-sm)]",
    lg: "h-10 px-5 text-[length:var(--ds-text-base)]",
  };
  const variants: Record<NonNullable<ButtonProps["variant"]>, string> = {
    primary:
      "bg-[var(--ds-primary)] text-[var(--ds-primary-text)] shadow-[var(--ds-shadow-sm)] " +
      "hover:bg-[var(--ds-primary-hover)] active:brightness-[0.97] disabled:shadow-none " +
      "disabled:hover:bg-[var(--ds-primary)] disabled:hover:brightness-100 disabled:active:brightness-100",
    secondary:
      "border-0 bg-[var(--ds-surface)] text-[var(--ds-text-primary)] shadow-[var(--ds-elevation-button-secondary)] " +
      "hover:bg-[var(--ds-surface-hover)] hover:shadow-[var(--ds-elevation-button-secondary-hover)] " +
      "disabled:shadow-none disabled:hover:shadow-none disabled:hover:bg-[var(--ds-surface)]",
    ghost:
      "bg-transparent text-[var(--ds-text-secondary)] " +
      "hover:bg-[var(--ds-surface-hover)] hover:text-[var(--ds-text-primary)] " +
      "disabled:hover:bg-transparent disabled:hover:text-[var(--ds-text-secondary)]",
  };

  return (
    <button type={type} className={`${base} ${sizes[size]} ${variants[variant]} ${className}`} {...props}>
      {leftIcon ? <span aria-hidden className="inline-flex items-center">{leftIcon}</span> : null}
      {children}
      {rightIcon ? <span aria-hidden className="inline-flex items-center">{rightIcon}</span> : null}
    </button>
  );
}
