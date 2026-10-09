"use client";
// Thin navigation helpers over next/navigation, so screens read the same way everywhere.
import NextLink from "next/link";
import { useCallback, useEffect, type ComponentProps, type ReactNode } from "react";
import { useParams as useNextParams, usePathname, useRouter, useSearchParams as useNextSearchParams } from "next/navigation";

type LinkProps = Omit<ComponentProps<typeof NextLink>, "href"> & { to: string };
export function Link({ to, ...props }: LinkProps) { return <NextLink href={to} {...props} />; }

type NavState = { isActive: boolean };
type NavLinkProps = Omit<LinkProps, "className" | "children"> & { end?: boolean; className?: string | ((s: NavState) => string); children?: ReactNode | ((s: NavState) => ReactNode) };
export function NavLink({ to, end, className, children, ...props }: NavLinkProps) {
  const path = usePathname(); const isActive = end ? path === to : path === to || path.startsWith(to + "/");
  return <NextLink href={to} aria-current={isActive ? "page" : undefined} className={typeof className === "function" ? className({ isActive }) : className} {...props}>{typeof children === "function" ? children({ isActive }) : children}</NextLink>;
}
export function useNavigate() {
  const router = useRouter();
  return useCallback((to: string | number, opts?: { replace?: boolean }) => { if (typeof to === "number") router.back(); else if (opts?.replace) router.replace(to); else router.push(to); }, [router]);
}
export const useParams = () => useNextParams() as Record<string, string>;
export function useLocation() { return { pathname: usePathname() }; }
export function useSearchParams() {
  const sp = useNextSearchParams(); const router = useRouter(); const path = usePathname();
  const set = useCallback((next: Record<string, string>, opts?: { replace?: boolean }) => { const q = new URLSearchParams(next).toString(); const url = q ? `${path}?${q}` : path; if (opts?.replace) router.replace(url); else router.push(url); }, [router, path]);
  return [sp, set] as const;
}
export function Navigate({ to }: { to: string; replace?: boolean }) { const router = useRouter(); useEffect(() => { router.replace(to); }, [router, to]); return null; }
