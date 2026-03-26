"use client";

import { Input } from "@visualify/design-system";

type Props = {
  value: string;
  placeholder?: string;
  onChange: (next: string) => void;
};

export function RiskEditCell({ value, placeholder, onChange }: Props) {
  return (
    <Input
      value={value}
      placeholder={placeholder}
      onChange={(e) => onChange(e.target.value)}
      className="min-w-0 w-full"
    />
  );
}
