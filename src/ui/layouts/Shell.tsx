"use client";
import { useEffect, type ReactNode } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "../context/AuthContext";
import MainLayout from "./MainLayout";

/** Everything inside the signed-in app. Anyone without a session is sent to the sign-in page. */
export default function Shell({ children }: { children: ReactNode }) {
  const { user, loading } = useAuth(); const router = useRouter();
  useEffect(() => { if (!loading && !user) router.replace("/login"); }, [loading, user, router]);
  if (loading || !user) return <div className="p-8 text-sm text-muted-foreground">Loading…</div>;
  return <MainLayout>{children}</MainLayout>;
}
