"use client";

import { Button } from "@visualify/design-system";

/** Prints the current Report view. PDF generation is not added here. */
export function ProjectReportExtractButton() {
  return (
    <Button type="button" variant="secondary" size="sm" onClick={() => window.print()}>
      Extract report
    </Button>
  );
}
