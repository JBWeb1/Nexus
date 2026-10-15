import type { MetadataRoute } from 'next';

/** Makes Nexus installable as an app on phones (Android, iPhone) and desktops (Chrome, Edge). */
export default function manifest(): MetadataRoute.Manifest {
  return {
    id: '/', name: 'Nexus Ledger', short_name: 'Nexus',
    description: 'Accounting for South African businesses and their accountants.',
    start_url: '/', scope: '/', display: 'standalone', orientation: 'any',
    background_color: '#000000', theme_color: '#0b1220', categories: ['business', 'finance', 'productivity'],
    icons: [
      { src: '/icons/icon-192.png', sizes: '192x192', type: 'image/png', purpose: 'any' },
      { src: '/icons/icon-512.png', sizes: '512x512', type: 'image/png', purpose: 'any' },
      { src: '/icons/maskable-512.png', sizes: '512x512', type: 'image/png', purpose: 'maskable' },
    ],
    shortcuts: [
      { name: 'New invoice', url: '/invoices/new', icons: [{ src: '/icons/icon-192.png', sizes: '192x192' }] },
      { name: 'Snap a receipt', url: '/receipts', icons: [{ src: '/icons/icon-192.png', sizes: '192x192' }] },
    ],
  };
}
