import type { Metadata } from "next";
import LegalPage from "@/ui/views/LegalPage";
import { privacyPolicy } from "@/legal/content";

export const metadata: Metadata = { title: "Privacy Policy" };
export default function Page() { return <LegalPage title="Privacy Policy" path="/privacy" md={privacyPolicy()} />; }
