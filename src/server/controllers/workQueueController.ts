import { collect } from '../services/exceptionsService';
async function get(req, res, c) {
  const items = await collect(c, req.user.orgId);
  const count = (s) => items.filter((i) => i.severity === s).length;
  res.json({ items, summary: { urgent: count('urgent'), review: count('review'), info: count('info'), total: items.length } });
}
export { get };
