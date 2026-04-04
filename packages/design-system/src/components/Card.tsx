import * as React from "react";

type DivProps = React.HTMLAttributes<HTMLDivElement>;
type HeadingProps = React.HTMLAttributes<HTMLHeadingElement>;
type CardProps = DivProps & {
  variant?: "default" | "elevated" | "inset";
};

export function Card({ className = "", variant = "default", ...props }: CardProps) {
  const base = "overflow-hidden rounded-[var(--ds-radius-md)] text-[var(--ds-text-primary)]";
  const variants: Record<NonNullable<CardProps["variant"]>, string> = {
    /* Borderless shell — edge reads from elevation (aligned with document KPI / row tiles). */
    default: "border border-transparent bg-[var(--ds-surface)] shadow-[var(--ds-elevation-tile)]",
    elevated: "border border-transparent bg-[var(--ds-surface)] shadow-[var(--ds-shadow-sm)]",
    /* Inset panels have no shadow — keep a hairline so grouped chrome does not disappear. */
    inset: "border border-[var(--ds-border-subtle)] bg-[var(--ds-surface-muted)] shadow-none",
  };
  return <div className={`${base} ${variants[variant]} ${className}`} {...props} />;
}

export function CardHeader({ className = "", ...props }: DivProps) {
  const base = "border-b border-[var(--ds-border-subtle)] px-5 py-4";
  return <div className={`${base} ${className}`} {...props} />;
}

export function CardContent({ className = "", ...props }: DivProps) {
  const base = "px-5 py-4";
  return <div className={`${base} ${className}`} {...props} />;
}

export function CardFooter({ className = "", ...props }: DivProps) {
  const base = "border-t border-[var(--ds-border-subtle)] px-5 py-4";
  return <div className={`${base} ${className}`} {...props} />;
}

export function CardTitle({ className = "", ...props }: HeadingProps) {
  const base = "text-base font-semibold leading-6 text-[var(--ds-foreground)]";
  return <h3 className={`${base} ${className}`} {...props} />;
}

export const CardBody = CardContent;
