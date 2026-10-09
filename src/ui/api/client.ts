// Same-origin API client. The Auth.js session cookie travels with every request, so no token is stored in the browser.
const BASE = "/api";
export class ApiError extends Error { status: number; details?: any; constructor(status: number, message: string, details?: any) { super(message); this.status = status; this.details = details; } }
async function request(method: string, path: string, body?: any) {
  const form = typeof FormData !== "undefined" && body instanceof FormData;
  const res = await fetch(`${BASE}${path}`, { method, headers: form || body === undefined ? undefined : { "Content-Type": "application/json" }, body: body === undefined ? undefined : form ? body : JSON.stringify(body), credentials: "same-origin" });
  if (res.status === 204) return null;
  const text = await res.text(); let data: any; try { data = text ? JSON.parse(text) : null; } catch { data = text; }
  if (res.status === 401 && !path.startsWith("/auth/") && !/^\/(login|register|forgot-password|reset-password)/.test(window.location.pathname)) window.location.assign("/login");
  if (res.status === 402) window.dispatchEvent(new Event("nexus:paywall"));
  if (!res.ok) throw new ApiError(res.status, data?.error || "Something went wrong", data?.details);
  return data;
}
export const api = {
  get: (p: string) => request("GET", p), post: (p: string, b?: any) => request("POST", p, b ?? {}), patch: (p: string, b?: any) => request("PATCH", p, b),
  put: (p: string, b?: any) => request("PUT", p, b), delete: (p: string) => request("DELETE", p), upload: (p: string, form: FormData) => request("POST", p, form),
};
