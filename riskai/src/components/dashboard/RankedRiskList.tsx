import type { ReactNode } from "react";

export type RankedRiskListItem<T> = T & { id: string };

type RankedRiskListProps<T> = {
  items: RankedRiskListItem<T>[];
  renderRow: (item: RankedRiskListItem<T>, rank: number) => ReactNode;
  emptyMessage?: string;
};

/**
 * Reusable ranked list: shows items with rank number and custom row content.
 */
export function RankedRiskList<T>({
  items,
  renderRow,
  emptyMessage = "No items",
}: RankedRiskListProps<T>) {
  if (items.length === 0) {
    return <p className="m-0 text-[length:var(--ds-text-sm)] text-[var(--ds-text-muted)]">{emptyMessage}</p>;
  }

  return (
    <ul className="list-none m-0 p-0 space-y-2">
      {items.map((item, index) => (
        <li
          key={item.id}
          className="flex items-center gap-3 border-b border-[var(--ds-border-subtle)] py-2 px-0 last:border-b-0"
        >
          <span
            className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-[var(--ds-surface-muted)] text-[length:var(--ds-text-xs)] font-medium text-[var(--ds-text-secondary)]"
            aria-hidden
          >
            {index + 1}
          </span>
          {renderRow(item, index + 1)}
        </li>
      ))}
    </ul>
  );
}
