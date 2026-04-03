import { ThemeToggle } from "@/components/theme-toggle";

export default function EmailPreviewLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <>
      <div className="fixed right-4 top-4 z-50">
        <ThemeToggle />
      </div>
      <div className="pt-14">{children}</div>
    </>
  );
}
