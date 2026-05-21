"use client";

import { useState } from "react";
import { Button } from "@visualify/design-system";

export default function DevButtonTestPage() {
  const [clicked, setClicked] = useState(false);

  return (
    <main className="mx-auto max-w-2xl px-4 py-10">
      <h1 className="mb-6 text-2xl font-semibold text-[var(--ds-text-primary)]">Button test</h1>
      <div className="flex flex-col gap-4">
        <Button type="button" onClick={() => setClicked(true)}>
          Click me
        </Button>
        {clicked ? (
          <p className="text-sm text-[var(--ds-text-secondary)]" role="status">
            Button clicked
          </p>
        ) : null}
      </div>

      <div className="mt-8 flex flex-col gap-4">
        <Button type="button" variant="primary">
          Primary
        </Button>
        <Button type="button" variant="secondary">
          Secondary
        </Button>
        <Button type="button" variant="ghost">
          Ghost
        </Button>
        <Button type="button" variant="secondary" disabled>
          Disabled secondary
        </Button>
      </div>
    </main>
  );
}
