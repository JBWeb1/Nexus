/**
 * Turns a street address into map coordinates. Uses OpenStreetMap's Nominatim by default, which is free but asks for:
 * at most one request a second, a User-Agent that names the app, and attribution. Nexus only looks an address up when
 * someone presses "Find from address", never in bulk. For heavier use point GEOCODER_URL at your own Nominatim or a
 * paid provider with the same /search API (for example LocationIQ or Geoapify's Nominatim-compatible endpoints).
 */
import { ApiError } from '../utils/helpers';

const BASE = () => (process.env.GEOCODER_URL || 'https://nominatim.openstreetmap.org').replace(/\/$/, '');
let last = 0; let queue: Promise<unknown> = Promise.resolve();
/** One request a second across the whole server, as the Nominatim usage policy requires. */
function throttled<T>(fn: () => Promise<T>): Promise<T> {
  const run = queue.then(async () => { const wait = last + 1000 - Date.now(); if (wait > 0) await new Promise((r) => setTimeout(r, wait)); last = Date.now(); return fn(); });
  queue = run.catch(() => {}); return run;
}

export type Place = { latitude: number; longitude: number; label: string };
export async function geocode(address: string, fetcher: typeof fetch = fetch): Promise<Place | null> {
  const q = address.replace(/\s+/g, ' ').trim();
  if (q.length < 4) throw new ApiError(400, 'Add a street address to this contact first');
  const params = new URLSearchParams({ q, format: 'jsonv2', limit: '1', addressdetails: '0' });
  const country = process.env.GEOCODER_COUNTRY ?? 'za'; if (country) params.set('countrycodes', country);
  const res = await throttled(() => fetcher(`${BASE()}/search?${params}`, {
    headers: { 'User-Agent': process.env.GEOCODER_USER_AGENT || 'NexusLedger/2 (accounting software; map of customers and suppliers)', Accept: 'application/json', 'Accept-Language': 'en' },
    signal: AbortSignal.timeout(8000),
  })).catch(() => null);
  if (!res || !res.ok) throw new ApiError(502, 'The address lookup service is not answering. Try again in a minute, or place the pin by hand.');
  const hits = (await res.json().catch(() => [])) as any[];
  const h = Array.isArray(hits) ? hits[0] : null; if (!h) return null;
  const latitude = Number(h.lat), longitude = Number(h.lon);
  if (!Number.isFinite(latitude) || !Number.isFinite(longitude)) return null;
  return { latitude: Math.round(latitude * 1e6) / 1e6, longitude: Math.round(longitude * 1e6) / 1e6, label: String(h.display_name || '') };
}
