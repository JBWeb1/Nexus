import { updateStatus, clearReleaseCache } from '../services/updateService';

/** GET /api/system/update: running version, newest release, and whether the database matches this build. ?refresh=1 skips the cache. */
async function status(req, res, c) { if (req.query.refresh) clearReleaseCache(); res.json(await updateStatus(c)); }
export { status };
