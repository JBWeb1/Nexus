"use client";
import { createContext, useCallback, useContext, useEffect, useState, type ReactNode } from "react";
import { signIn, signOut } from "next-auth/react";
import { api } from "../api/client";

type User = { id: string; name: string; email: string; role: string; twoFactorEnabled?: boolean };
type Org = { id: string; name: string; currency: string; subscription?: any; [k: string]: any };
type Auth = {
  user: User | null; org: Org | null; loading: boolean; offline: boolean;
  login: (email: string, password: string, code?: string) => Promise<{ needs2fa?: boolean }>;
  register: (form: Record<string, any>) => Promise<void>; logout: () => Promise<void>; refreshOrg: () => Promise<void>;
  switchCompany: (id: string) => Promise<void>; createCompany: (form: Record<string, any>) => Promise<void>;
};
const Ctx = createContext<Auth>(null as unknown as Auth);
export const useAuth = () => useContext(Ctx);

/** Turns the signed proof from /api/auth/login (or register, or switch company) into an Auth.js session cookie. */
async function startSession(token: string) { const r = await signIn("credentials", { token, redirect: false }); if (r?.error) throw new Error("Could not start your session. Please sign in again."); }

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null); const [org, setOrg] = useState<Org | null>(null); const [loading, setLoading] = useState(true); const [offline, setOffline] = useState(false);
  const refreshOrg = useCallback(async () => { const d = await api.get("/auth/me"); setUser(d.user); setOrg(d.organization); }, []);
  const apply = useCallback(async (d: any) => { await startSession(d.token); }, []);
  useEffect(() => {
    (async () => {
      // A token handed over by an older build or an integration is exchanged once for a session, then dropped.
      let legacy: string | null = null; try { legacy = localStorage.getItem("nexus_token"); if (legacy) localStorage.removeItem("nexus_token"); } catch {}
      if (legacy) await startSession(legacy).catch(() => {});
      await refreshOrg().catch((e) => { if (e?.status === 0) setOffline(true); });
      setLoading(false);
    })();
  }, [refreshOrg]);
  // Back online: check the session again instead of having signed the person out while the signal was gone.
  useEffect(() => { if (!offline) return; const back = () => refreshOrg().then(() => setOffline(false)).catch(() => {}); window.addEventListener("online", back); return () => window.removeEventListener("online", back); }, [offline, refreshOrg]);
  const login = useCallback(async (email: string, password: string, code?: string) => { const d = await api.post("/auth/login", { email, password, code }); if (d.needs2fa) return { needs2fa: true }; await apply(d); return {}; }, [apply]);
  const register = useCallback(async (form: Record<string, any>) => { await apply(await api.post("/auth/register", form)); }, [apply]);
  // Signing in, signing out and switching company all change who the server thinks you are, so each one ends with a full page load.
  // That keeps the session cookie, the cached pages and this context in step.
  const logout = useCallback(async () => { await signOut({ redirect: false }).catch(() => {}); window.location.assign("/login"); }, []);
  const switchCompany = useCallback(async (id: string) => { await apply(await api.post(`/companies/${id}/switch`)); window.location.assign("/"); }, [apply]);
  const createCompany = useCallback(async (form: Record<string, any>) => { await apply(await api.post("/companies", form)); window.location.assign("/setup"); }, [apply]);
  return <Ctx.Provider value={{ user, org, loading, offline, login, register, logout, refreshOrg, switchCompany, createCompany }}>{children}</Ctx.Provider>;
}
