import type { Metadata } from "next";
import DownloadPage from "@/ui/views/DownloadPage";
import { appFiles } from "@/server/services/appDownloads";

export const metadata: Metadata = { title: "Get the app", description: "Install Nexus Ledger on your phone or computer: Windows, Mac, Android, iPhone and iPad." };
export const dynamic = "force-dynamic";
export default async function Page() { return <DownloadPage files={await appFiles()} />; }
