import type { Metadata } from "next";
import View from "@/ui/views/Products";

export const metadata: Metadata = { title: "Products" };
export default function Page() { return <View />; }
