import type { Metadata, Viewport } from "next";
import Providers from "@/ui/Providers";
import "./globals.css";

export const metadata: Metadata = { title: { default: "Nexus Ledger", template: "%s · Nexus Ledger" }, description: "Accounting for South African businesses and their accountants." };
export const viewport: Viewport = { width: "device-width", initialScale: 1 };

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (<html lang="en"><body><Providers>{children}</Providers></body></html>);
}
