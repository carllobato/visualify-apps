"use client";

import type { ComponentProps } from "react";
import { Button, Input, Label } from "@visualify/design-system";

export type AppLoginPasswordFieldProps = {
  id: string;
  label?: string;
  /** When true, the input type is `text` instead of `password`. */
  visible: boolean;
  onToggleVisible: () => void;
} & Omit<ComponentProps<typeof Input>, "id" | "type">;

/** Password input with Show/Hide toggle — shared across product login forms. */
export function AppLoginPasswordField({
  id,
  label = "Password",
  visible,
  onToggleVisible,
  className = "",
  disabled,
  spellCheck = false,
  autoCapitalize = "off",
  autoCorrect = "off",
  ...inputProps
}: AppLoginPasswordFieldProps) {
  return (
    <div>
      <Label htmlFor={id}>{label}</Label>
      <div className="relative">
        <Input
          id={id}
          type={visible ? "text" : "password"}
          className={`pr-14 ${className}`.trim()}
          disabled={disabled}
          spellCheck={spellCheck}
          autoCapitalize={autoCapitalize}
          autoCorrect={autoCorrect}
          {...inputProps}
        />
        <Button
          type="button"
          variant="ghost"
          size="sm"
          className="absolute right-1 top-1/2 min-h-0 -translate-y-1/2 px-2 py-1"
          onClick={onToggleVisible}
          disabled={disabled}
          aria-pressed={visible}
          aria-label={visible ? "Hide password" : "Show password"}
        >
          {visible ? "Hide" : "Show"}
        </Button>
      </div>
    </div>
  );
}
