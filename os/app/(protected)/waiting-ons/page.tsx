import { OsPagePlaceholder } from "@/components/OsPagePlaceholder";

export const dynamic = "force-dynamic";

export default function WaitingOnsPage() {
  return (
    <OsPagePlaceholder
      title="Waiting Ons"
      description="Commitments blocked on others — who, what, and when you last nudged."
    />
  );
}
