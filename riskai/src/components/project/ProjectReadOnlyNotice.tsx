/** Short muted banner for project-scoped view-only access (viewer role). */
export function ProjectReadOnlyNotice({ className }: { className?: string }) {
  return (
    <p
      className={[
        "m-0 text-[length:var(--ds-text-sm)] text-[var(--ds-text-muted)]",
        className,
      ]
        .filter(Boolean)
        .join(" ")}
      role="status"
    >
      Read-only access
    </p>
  );
}
