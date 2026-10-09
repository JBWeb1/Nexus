import type { Metadata } from "next";
import View from "@/ui/views/Dashboard";

export const metadata: Metadata = { title: "Dashboard" };
export default function Page() { return <View />; }
