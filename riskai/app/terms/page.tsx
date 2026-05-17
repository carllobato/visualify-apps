import type { Metadata } from "next";
import { TermsContent } from "@visualify/app-shell";

export const metadata: Metadata = {
  title: "Terms & Conditions — RiskAI by Visualify",
  description: "Rules for using Visualify and RiskAI.",
};

export default function TermsPage() {
  return (
    <main>
      <TermsContent />
    </main>
  );
}
