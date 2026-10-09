import type { Metadata } from "next";
import View from "@/ui/views/Contacts";

export const metadata: Metadata = { title: "Contacts" };
export default function Page() { return <View />; }
