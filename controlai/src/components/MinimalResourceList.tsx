import Link from "next/link";

export type MinimalResourceListItem = {
  id: string;
  name: string;
  created_at: string | null;
};

type MinimalResourceListProps = {
  title: string;
  description: string;
  emptyMessage: string;
  items: MinimalResourceListItem[];
  itemHref: (id: string) => string;
  /** When true, omit the title/description header (list items only). */
  hideHeader?: boolean;
};

function formatCreatedDate(value: string | null): string {
  if (!value) return "—";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "—";
  return date.toLocaleDateString(undefined, { dateStyle: "medium" });
}

export function MinimalResourceList({
  title,
  description,
  emptyMessage,
  items,
  itemHref,
  hideHeader = false,
}: MinimalResourceListProps) {
  const list =
    items.length === 0 ? (
      hideHeader ? null : (
        <p className="text-[length:var(--ds-text-sm)] text-[var(--ds-text-secondary)]">{emptyMessage}</p>
      )
    ) : (
      <ul className="flex flex-col gap-2">
        {items.map((item) => (
          <li key={item.id}>
            <Link
              href={itemHref(item.id)}
              className="flex items-center justify-between gap-4 rounded-[var(--ds-radius-md)] border border-[var(--ds-border)] bg-[var(--ds-surface)] px-4 py-3 no-underline transition-colors hover:bg-[var(--ds-surface-hover)]"
            >
              <span className="text-[length:var(--ds-text-sm)] font-medium text-[var(--ds-text-primary)]">
                {item.name.trim() || "Untitled"}
              </span>
              <span className="shrink-0 text-[length:var(--ds-text-xs)] text-[var(--ds-text-secondary)]">
                {formatCreatedDate(item.created_at)}
              </span>
            </Link>
          </li>
        ))}
      </ul>
    );

  if (hideHeader) {
    return list;
  }

  return (
    <main className="mx-auto flex w-full max-w-2xl flex-col gap-6 py-8">
      <div className="flex flex-col gap-1">
        <h1 className="text-[length:var(--ds-text-xl)] font-semibold text-[var(--ds-text-primary)]">
          {title}
        </h1>
        <p className="text-[length:var(--ds-text-sm)] text-[var(--ds-text-secondary)]">{description}</p>
      </div>
      {list}
    </main>
  );
}
