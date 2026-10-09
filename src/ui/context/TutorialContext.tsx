"use client";
import { createContext, useCallback, useContext, useState } from "react"; import { LESSONS } from "../constants/lessons";
const Ctx = createContext(null); export const useTutorial = () => useContext(Ctx);
const KEY = "nexus_tutorial", DONE = "nexus_lessons_done";
const load = () => { try { const v = JSON.parse(sessionStorage.getItem(KEY) || "null"); return v && LESSONS.some((l) => l.id === v.id) ? v : null; } catch { return null; } };
const save = (v) => { try { v ? sessionStorage.setItem(KEY, JSON.stringify(v)) : sessionStorage.removeItem(KEY); } catch {} };
export const markDone = (id) => { try { const d = JSON.parse(localStorage.getItem(DONE) || "[]"); if (!d.includes(id)) localStorage.setItem(DONE, JSON.stringify([...d, id])); } catch {} };
export function TutorialProvider({ children }) {
  const [active, setA] = useState(load); const set = useCallback((v) => { save(v); setA(v); }, []);
  return <Ctx.Provider value={{ active, start: (id) => set({ id, step: 0 }), go: (step) => set(active && { ...active, step }), stop: () => set(null) }}>{children}</Ctx.Provider>;
}
