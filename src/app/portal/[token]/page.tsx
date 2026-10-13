import type { Metadata } from "next";
import Portal from "@/ui/views/Portal";

// A customer's own page, opened from a link in a reminder, statement or WhatsApp. No sign-in; the link is the key.
export const metadata: Metadata = { title: "Your account", robots: { index: false, follow: false }, referrer: "no-referrer" };
export default async function Page({ params }: { params: Promise<{ token: string }> }) { const { token } = await params; return <Portal token={token} />; }
