import { HqSignedInShell } from "../hq-signed-in-shell";

/**
 * Keeps {@link HqSignedInShell} mounted across HQ navigations so the platform rail
 * (pin/hover state) does not remount and replay its width transition on every page change.
 */
export default function HqLayout({ children }: { children: React.ReactNode }) {
  return <HqSignedInShell>{children}</HqSignedInShell>;
}
