import type { Metadata } from "next";
import DevelopersPage from "@/ui/views/DevelopersPage";

export const metadata: Metadata = { title: "API documentation", description: "Connect your software to Nexus Ledger with API keys." };
export default function Page() { return <DevelopersPage />; }
