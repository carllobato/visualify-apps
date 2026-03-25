import * as React from "react";

type TableProps = React.TableHTMLAttributes<HTMLTableElement>;
type TableSectionProps = React.HTMLAttributes<HTMLTableSectionElement>;
type TableRowProps = React.HTMLAttributes<HTMLTableRowElement>;
type TableHeaderCellProps = React.ThHTMLAttributes<HTMLTableCellElement>;
type TableCellProps = React.TdHTMLAttributes<HTMLTableCellElement>;

export function Table({ className = "", ...props }: TableProps) {
  const base = "w-full text-sm border-collapse";
  return <table className={`${base} ${className}`} {...props} />;
}

export function TableHead({ className = "", ...props }: TableSectionProps) {
  return <thead className={className} {...props} />;
}

export function TableBody({ className = "", ...props }: TableSectionProps) {
  const base = "[&>tr]:border-[color-mix(in_oklab,var(--ds-border)_60%,transparent)]";
  return <tbody className={`${base} ${className}`} {...props} />;
}

export function TableRow({ className = "", ...props }: TableRowProps) {
  const base = "border-b last:border-b-0";
  return <tr className={`${base} ${className}`} {...props} />;
}

export function TableHeaderCell({ className = "", ...props }: TableHeaderCellProps) {
  const base = "py-1.5 px-2 font-medium text-[var(--ds-muted-foreground)]";
  return <th className={`${base} ${className}`} {...props} />;
}

export function TableCell({ className = "", ...props }: TableCellProps) {
  const base = "py-1.5 px-2 text-[var(--ds-foreground)]";
  return <td className={`${base} ${className}`} {...props} />;
}

