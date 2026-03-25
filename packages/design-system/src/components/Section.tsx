import * as React from "react";

type DivProps = React.HTMLAttributes<HTMLDivElement>;
type SectionProps = React.HTMLAttributes<HTMLElement>;

export function Section({ className = "", ...props }: SectionProps) {
  const base = "mt-8";
  return <section className={`${base} ${className}`} {...props} />;
}

export function SectionHeader({ className = "", ...props }: DivProps) {
  const base = "mb-3";
  return <div className={`${base} ${className}`} {...props} />;
}

export function SectionBody({ className = "", ...props }: DivProps) {
  return <div className={className} {...props} />;
}

