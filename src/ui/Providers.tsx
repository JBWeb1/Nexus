"use client";
import { Suspense, useSyncExternalStore, type ReactNode } from "react";
import { SessionProvider } from "next-auth/react";
import { AuthProvider } from "./context/AuthContext";
import { useServiceWorker } from "./components/InstallApp";

const noop = () => () => {};

/**
 * The app is a signed-in workspace, so screens render in the browser only. That keeps server rendering out of code that
 * reads the session, local storage or the window, and there is nothing here that search engines need to index.
 */
export default function Providers({ children }: { children: ReactNode }) {
  // True in the browser, false while the server prerenders. Read synchronously, so a remount can never leave the page blank.
  const ready = useSyncExternalStore(noop, () => true, () => false);
  useServiceWorker();
  return (<SessionProvider basePath="/api/session" refetchOnWindowFocus={false}><AuthProvider>{ready ? <Suspense fallback={<div className="p-8 text-sm text-muted-foreground">Loading…</div>}>{children}</Suspense> : null}</AuthProvider></SessionProvider>);
}
