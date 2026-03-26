import { Card, CardBody } from "@visualify/design-system";

type EmptyStateProps = {
  message: string;
  className?: string;
};

/**
 * Simple empty state message for cards and panels.
 */
export function EmptyState({ message, className = "" }: EmptyStateProps) {
  return (
    <Card variant="inset" className={className}>
      <CardBody className="py-4">
        <p className="m-0 text-[length:var(--ds-text-sm)] text-[var(--ds-text-muted)]">{message}</p>
      </CardBody>
    </Card>
  );
}
