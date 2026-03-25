import * as React from "react";

type DivProps = React.HTMLAttributes<HTMLDivElement>;
type HeadingProps = React.HTMLAttributes<HTMLHeadingElement>;

export function Card({ className = "", ...props }: DivProps) {
  const base =
    "overflow-hidden rounded-[16px] border border-[var(--ds-border)] " +
    "bg-[var(--ds-background)] text-[var(--ds-foreground)]";
  return <div className={`${base} ${className}`} {...props} />;
}

export function CardHeader({ className = "", ...props }: DivProps) {
  const base = "border-b border-[var(--ds-border)] px-5 py-4";
  return <div className={`${base} ${className}`} {...props} />;
}

export function CardBody({ className = "", ...props }: DivProps) {
  const base = "px-5 py-4";
  return <div className={`${base} ${className}`} {...props} />;
}

export function CardTitle({ className = "", ...props }: HeadingProps) {
  const base = "text-base font-semibold leading-6 text-[var(--ds-foreground)]";
  return <h3 className={`${base} ${className}`} {...props} />;
}
