import type { ReactNode } from "react";
import { appLoginTrustLineClassName } from "./classes";
import { mergeClass } from "../account-settings/merge-class";

export type AppLoginTrustLineProps = {
  children?: ReactNode;
  className?: string;
};

export function AppLoginTrustLine({
  children = "Secure login | Your data is protected",
  className,
}: AppLoginTrustLineProps) {
  return <p className={mergeClass(appLoginTrustLineClassName, className)}>{children}</p>;
}
