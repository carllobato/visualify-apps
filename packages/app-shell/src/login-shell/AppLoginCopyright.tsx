import { appLoginCopyrightClassName } from "./classes";
import { mergeClass } from "../account-settings/merge-class";

export type AppLoginCopyrightProps = {
  copyrightHolder?: string;
  year?: number;
  className?: string;
};

export function AppLoginCopyright({
  copyrightHolder = "Visualify",
  year = new Date().getFullYear(),
  className,
}: AppLoginCopyrightProps) {
  return (
    <p className={mergeClass(appLoginCopyrightClassName, className)}>
      © {year} {copyrightHolder}. All rights reserved.
    </p>
  );
}
