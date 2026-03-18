import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Auri Chat",
  robots: "noindex",
};

export default function WidgetLayout({ children }: { children: React.ReactNode }) {
  return <>{children}</>;
}
