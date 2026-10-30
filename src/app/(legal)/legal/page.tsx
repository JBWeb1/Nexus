import type { Metadata } from "next";
import LegalPage from "@/ui/views/LegalPage";
import { businessDetails } from "@/legal/content";

export const metadata: Metadata = { title: "Business details" };
export default function Page() { return <LegalPage title="Business details" path="/legal" md={businessDetails()} />; }
