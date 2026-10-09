import router from '@/server/routes';
import { dispatch } from '@/server/http';

// Every /api/* request (except /api/session, which belongs to Auth.js) is handled by the router in src/server/routes.ts.
export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';
export const maxDuration = 30;
const handle = (request: Request) => dispatch(router, request, '/api');
export { handle as GET, handle as POST, handle as PUT, handle as PATCH, handle as DELETE };
