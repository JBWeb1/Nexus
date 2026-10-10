import fs from 'fs'; import { execSync } from 'child_process';

// Baked in at build time so the running app knows exactly what it is: version, commit and the migrations it expects.
const pkg = JSON.parse(fs.readFileSync(new URL('./package.json', import.meta.url), 'utf8'));
const commit = process.env.VERCEL_GIT_COMMIT_SHA || (() => { try { return execSync('git rev-parse HEAD', { stdio: ['ignore', 'pipe', 'ignore'] }).toString().trim(); } catch { return ''; } })();
const migrations = fs.readdirSync(new URL('./prisma/migrations/', import.meta.url), { withFileTypes: true }).filter((d) => d.isDirectory()).map((d) => d.name).sort();

/** @type {import('next').NextConfig} */
const nextConfig = {
  // These read data files from their own folders at run time, so they must not be bundled.
  serverExternalPackages: ['pdfkit', 'exceljs', '@prisma/client', '@prisma/adapter-pg', 'pg'],
  poweredByHeader: false,
  env: { NEXUS_VERSION: pkg.version, NEXUS_COMMIT: commit.slice(0, 12), NEXUS_BUILT_AT: new Date().toISOString(), NEXUS_MIGRATIONS: migrations.join(',') },
};
export default nextConfig;
