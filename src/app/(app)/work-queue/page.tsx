import type { Metadata } from "next";
import View from "@/ui/views/WorkQueue";

export const metadata: Metadata = { title: "Work queue" };
export default function Page() { return <View />; }
