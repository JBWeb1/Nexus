import type { Metadata } from "next";
import View from "@/ui/views/Notes";

export const metadata: Metadata = { title: "Notes" };
export default function Page() { return <View />; }
