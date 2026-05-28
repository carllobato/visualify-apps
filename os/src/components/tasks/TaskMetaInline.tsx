type TaskMetaInlineProps = {
  items: string[];
  className?: string;
  separatorClassName?: string;
  firstItemClassName?: string;
};

export function TaskMetaInline({
  items,
  className,
  separatorClassName,
  firstItemClassName,
}: TaskMetaInlineProps) {
  if (items.length === 0) return null;

  return (
    <p className={className}>
      {items.map((part, index) => (
        <span key={`${index}-${part}`}>
          {index > 0 ? (
            <span className={separatorClassName} aria-hidden>
              {" "}
              ·{" "}
            </span>
          ) : null}
          <span className={index === 0 ? firstItemClassName : undefined}>{part}</span>
        </span>
      ))}
    </p>
  );
}
