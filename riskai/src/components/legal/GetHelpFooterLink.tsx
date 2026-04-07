"use client";

import { useId, useState } from "react";
import { ContactHelpForm } from "./ContactHelpForm";
import { LiquidDialog } from "./LiquidDialog";

const linkClass =
  "text-[var(--ds-text-tertiary)] transition-colors hover:text-[var(--ds-text-secondary)]";

export function GetHelpFooterLink() {
  const [open, setOpen] = useState(false);
  const titleId = useId();

  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        className={`${linkClass} inline cursor-pointer border-0 bg-transparent p-0 font-inherit`}
      >
        Get Help
      </button>
      <LiquidDialog
        open={open}
        onClose={() => setOpen(false)}
        titleId={titleId}
        title="Get in touch"
      >
        <ContactHelpForm />
      </LiquidDialog>
    </>
  );
}
