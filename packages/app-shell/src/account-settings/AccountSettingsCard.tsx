import type { HTMLAttributes } from "react";
import { Card, CardContent, CardFooter, CardHeader } from "@visualify/design-system";
import {
  accountSettingsCardClassName,
  accountSettingsCardContentClassName,
  accountSettingsCardContentFormClassName,
  accountSettingsCardFooterClassName,
  accountSettingsCardHeaderClassName,
  accountSettingsCardTitleClassName,
  accountSettingsCardTitleDangerClassName,
} from "./classes";
import { mergeClass } from "./merge-class";

export type AccountSettingsCardProps = HTMLAttributes<HTMLDivElement>;

export function AccountSettingsCard({ className, ...props }: AccountSettingsCardProps) {
  return (
    <Card variant="default" className={mergeClass(accountSettingsCardClassName, className)} {...props} />
  );
}

export type AccountSettingsCardHeaderProps = HTMLAttributes<HTMLDivElement> & {
  title?: string;
  danger?: boolean;
};

export function AccountSettingsCardHeader({
  title,
  danger = false,
  className,
  children,
  ...props
}: AccountSettingsCardHeaderProps) {
  const titleClass = danger ? accountSettingsCardTitleDangerClassName : accountSettingsCardTitleClassName;

  return (
    <CardHeader className={mergeClass(accountSettingsCardHeaderClassName, className)} {...props}>
      {title ? <h2 className={titleClass}>{title}</h2> : children}
    </CardHeader>
  );
}

export type AccountSettingsCardContentProps = HTMLAttributes<HTMLDivElement> & {
  /** Use `form` for profile-style panels with uniform `!p-4` padding. */
  padding?: "default" | "form";
};

export function AccountSettingsCardContent({
  padding = "default",
  className,
  ...props
}: AccountSettingsCardContentProps) {
  const pad =
    padding === "form" ? accountSettingsCardContentFormClassName : accountSettingsCardContentClassName;

  return <CardContent className={mergeClass(pad, className)} {...props} />;
}

export type AccountSettingsCardFooterProps = HTMLAttributes<HTMLDivElement>;

export function AccountSettingsCardFooter({ className, ...props }: AccountSettingsCardFooterProps) {
  return <CardFooter className={mergeClass(accountSettingsCardFooterClassName, className)} {...props} />;
}
