import type { Metadata } from "next";
import LegalPage from "@/ui/views/LegalPage";
import { termsOfService } from "@/legal/content";

export const metadata: Metadata = { title: "Terms of Service" };
export default function Page() { return <LegalPage title="Terms of Service" path="/terms" md={termsOfService()} />; }
