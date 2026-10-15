import { assetLinksBody } from '@/server/controllers/assetLinksController';
export const dynamic = 'force-dynamic';
// Android checks this address to let the Nexus app open the site full-screen.
export const GET = () => Response.json(assetLinksBody(), { headers: { 'Cache-Control': 'public, max-age=3600' } });
