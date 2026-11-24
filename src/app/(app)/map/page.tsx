import type { Metadata } from "next";
import View from "@/ui/views/MapView";

export const metadata: Metadata = { title: "Map" };
export default function Page() { return <View />; }
