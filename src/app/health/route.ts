import { currentBuild } from '@/server/services/updateService';
export const dynamic = 'force-dynamic';
// The updater checks this after a restart to confirm the new version is the one answering.
export const GET = () => { const { version, commit } = currentBuild(); return Response.json({ ok: true, version, commit }); };
