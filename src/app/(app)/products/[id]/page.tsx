import type { Metadata } from "next";
import View from "@/ui/views/ProductDetail";

export const metadata: Metadata = { title: "Product" };
export default function Page() { return <View />; }
