import * as React from "react";

type TableProps = React.TableHTMLAttributes<HTMLTableElement>;
type TableSectionProps = React.HTMLAttributes<HTMLTableSectionElement>;
type TableRowProps = React.HTMLAttributes<HTMLTableRowElement>;
type TableHeaderCellProps = React.ThHTMLAttributes<HTMLTableCellElement>;
type TableCellProps = React.TdHTMLAttributes<HTMLTableCellElement>;

export function Table({ className = "", ...props }: TableProps) {
  const base = "w-full border-collapse text-[length:var(--ds-text-sm)]";
  return <table className={`${base} ${className}`} {...props} />;
}

export function TableHead({ className = "", ...props }: TableSectionProps) {
  const base = "border-b border-[var(--ds-border)]";
  return <thead className={`${base} ${className}`} {...props} />;
}

export function TableBody({ className = "", ...props }: TableSectionProps) {
  const base = "[&>tr]:border-b [&>tr]:border-[color-mix(in_oklab,var(--ds-border)_70%,transparent)]";
  return <tbody className={`${base} ${className}`} {...props} />;
}

export function TableRow({ className = "", ...props }: TableRowProps) {
  const base = "last:border-b-0";
  return <tr className={`${base} ${className}`} {...props} />;
}

export function TableHeaderCell({ className = "", ...props }: TableHeaderCellProps) {
  const base =
    "px-3 py-2 text-left text-[length:var(--ds-text-xs)] font-semibold uppercase tracking-[0.06em] text-[var(--ds-text-muted)]";
  return <th className={`${base} ${className}`} {...props} />;
}

export function TableCell({ className = "", ...props }: TableCellProps) {
  const base = "px-3 py-2 text-[var(--ds-text-primary)]";
  return <td className={`${base} ${className}`} {...props} />;
}

export const TableHeader = TableHead;
export const TableHeadCell = TableHeaderCell;

