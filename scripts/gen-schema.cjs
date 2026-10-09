// One-off helper used to write prisma/schema.prisma from the live database (stand-in for `prisma db pull`, which needs a binary this sandbox cannot download).
const { Client } = require('pg'); const fs = require('fs');
const camel = (s) => s.replace(/_([a-z0-9])/g, (_, c) => c.toUpperCase()); const pascal = (s) => { const c = camel(s); return c[0].toUpperCase() + c.slice(1); };
const SINGULAR = { companies: 'Company', memberships: 'Membership', activity_log: 'ActivityLog', journal_entries: 'JournalEntry', month_closes: 'MonthClose', tax_rates: 'TaxRate', password_resets: 'PasswordReset' };
const model = (t) => SINGULAR[t] || pascal(t.endsWith('ies') ? t.slice(0, -3) + 'y' : t.endsWith('s') ? t.slice(0, -1) : t);
(async () => {
  const c = new Client({ connectionString: process.env.DIRECT_URL }); await c.connect();
  const cols = (await c.query(`SELECT table_name, column_name, data_type, udt_name, is_nullable, column_default, numeric_precision, numeric_scale FROM information_schema.columns WHERE table_schema='public' ORDER BY table_name, ordinal_position`)).rows;
  const pks = (await c.query(`SELECT tc.table_name, kcu.column_name FROM information_schema.table_constraints tc JOIN information_schema.key_column_usage kcu USING (constraint_name, table_schema) WHERE tc.table_schema='public' AND tc.constraint_type='PRIMARY KEY' ORDER BY kcu.ordinal_position`)).rows;
  const fks = (await c.query(`SELECT c.conrelid::regclass::text AS t, a.attname AS col, c.confrelid::regclass::text AS rt, af.attname AS rcol FROM pg_constraint c JOIN pg_attribute a ON a.attrelid=c.conrelid AND a.attnum=c.conkey[1] JOIN pg_attribute af ON af.attrelid=c.confrelid AND af.attnum=c.confkey[1] WHERE c.contype='f' AND array_length(c.conkey,1)=1 AND c.connamespace='public'::regnamespace ORDER BY 1,2`)).rows;
  const uq = (await c.query(`SELECT c.conrelid::regclass::text AS t, array_agg(a.attname ORDER BY x.n) AS cols FROM pg_constraint c, unnest(c.conkey) WITH ORDINALITY x(attnum, n) JOIN pg_attribute a ON a.attnum=x.attnum WHERE a.attrelid=c.conrelid AND c.contype='u' AND c.connamespace='public'::regnamespace GROUP BY c.oid, c.conrelid`)).rows;
  await c.end();
  const tables = [...new Set(cols.map((x) => x.table_name))].filter((t) => t !== '_migrations');
  const TYPE = (x) => { const u = x.udt_name; if (u === 'text' || u === 'varchar') return ['String', '']; if (u === 'numeric') return ['Decimal', ` @db.Decimal(${x.numeric_precision}, ${x.numeric_scale})`]; if (u === 'int4') return ['Int', '']; if (u === 'int8') return ['BigInt', '']; if (u === 'bool') return ['Boolean', '']; if (u === 'date') return ['DateTime', ' @db.Date']; if (u === 'timestamptz') return ['DateTime', ' @db.Timestamptz(6)']; if (u === 'jsonb') return ['Json', '']; return [`Unsupported("${u}")`, '']; };
  const DEF = (d) => { if (d == null) return ''; if (/^'(.*)'::text$/.test(d)) return ` @default("${d.match(/^'(.*)'::text$/)[1]}")`; if (d === 'true' || d === 'false') return ` @default(${d})`; if (/^-?\d+(\.\d+)?$/.test(d)) return ` @default(${d})`; if (d === 'now()') return ' @default(now())'; return ` @default(dbgenerated("${d.replace(/"/g, '\\"')}"))`; };
  let out = fs.readFileSync('prisma/schema.header.prisma', 'utf8');
  for (const t of tables) {
    const pk = pks.filter((p) => p.table_name === t).map((p) => p.column_name); const lines = [];
    for (const x of cols.filter((k) => k.table_name === t)) { const [ty, db] = TYPE(x); const f = camel(x.column_name); lines.push(`  ${f} ${ty}${x.is_nullable === 'YES' ? '?' : ''}${pk.length === 1 && pk[0] === x.column_name ? ' @id' : ''}${DEF(x.column_default)}${f !== x.column_name ? ` @map("${x.column_name}")` : ''}${db}`); }
    for (const f of fks.filter((k) => k.t === t)) { const name = `${t}_${f.col}`; const nullable = cols.find((k) => k.table_name === t && k.column_name === f.col).is_nullable === 'YES'; lines.push(`  ${camel(f.col.replace(/_id$/, ''))}Rel ${model(f.rt)}${nullable ? '?' : ''} @relation("${name}", fields: [${camel(f.col)}], references: [${camel(f.rcol)}], onDelete: NoAction, onUpdate: NoAction)`); }
    for (const f of fks.filter((k) => k.rt === t)) lines.push(`  ${camel(f.t)}By${pascal(f.col)} ${model(f.t)}[] @relation("${f.t}_${f.col}")`);
    if (pk.length > 1) lines.push(`  @@id([${pk.map(camel).join(', ')}])`);
    for (const u of uq.filter((k) => k.t === t)) { const cs = Array.isArray(u.cols) ? u.cols : String(u.cols).replace(/[{}]/g, '').split(','); lines.push(`  @@unique([${cs.map(camel).join(', ')}])`); }
    lines.push(`  @@map("${t}")`);
    out += `\nmodel ${model(t)} {\n${lines.join('\n')}\n}\n`;
  }
  fs.writeFileSync('prisma/schema.prisma', out); console.log(tables.length, 'models');
})();
