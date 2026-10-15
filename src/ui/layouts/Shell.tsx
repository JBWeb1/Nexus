"use client";
import { useEffect, type ReactNode } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "../context/AuthContext";
import MainLayout from "./MainLayout";

/** Everything inside the signed-in app. Anyone without a session is sent to the sign-in page. */
export default function Shell({ children }: { children: ReactNode }) {
  const { user, loading, offline } = useAuth(); const router = useRouter();
  useEffect(() => { if (!loading && !user && !offline) router.replace("/login"); }, [loading, user, offline, router]);
  if (!user && offline) return (<div className="min-h-screen grid place-items-center p-6 text-center"><div><p className="font-display text-2xl">You're offline</p>
    <p className="mt-2 text-sm text-muted-foreground max-w-sm">Nexus needs an internet connection to show your books. You are still signed in; this page reconnects by itself when you are back online.</p>
    <button className="mt-4 rounded-md bg-primary px-4 py-2 text-sm font-semibold text-primary-foreground" onClick={() => window.location.reload()}>Try again</button></div></div>);
  if (loading || !user) return <div className="p-8 text-sm text-muted-foreground">Loading…</div>;
  return <MainLayout>{children}</MainLayout>;
}
