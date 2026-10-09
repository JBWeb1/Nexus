"use client";
import { Bar, BarChart, CartesianGrid, Cell, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import { formatMoney } from "../Money";
import { cn } from "../../lib/utils";

export type MonthPoint = { month: string; label: string; full: string; revenue: number; expenses: number; profit: number; partial: boolean };
const AXIS = 56;
const compact = (v: number) => { const a = Math.abs(v); if (a >= 1e6) return `R${+(v / 1e6).toFixed(1)}m`; if (a >= 1e3) return `R${+(v / 1e3).toFixed(0)}k`; return `R${v}`; };

function Tip({ active, payload }: { active?: boolean; payload?: { payload: MonthPoint }[] }) {
  const m = active && payload?.[0]?.payload; if (!m) return null;
  return (<div className="w-52 rounded-lg border bg-card p-3 text-xs shadow-pop">
    <div className="font-semibold">{m.full}{m.partial && <span className="font-normal text-muted-foreground"> (so far)</span>}</div>
    <div className="mt-1.5 flex justify-between"><span className="flex items-center gap-1.5 text-muted-foreground"><i className="size-2 rounded-sm bg-primary" />Revenue</span><span className="figure font-medium">{formatMoney(m.revenue)}</span></div>
    <div className="flex justify-between"><span className="flex items-center gap-1.5 text-muted-foreground"><i className="size-2 rounded-sm bg-muted-foreground/45" />Expenses</span><span className="figure font-medium">{formatMoney(m.expenses)}</span></div>
    <div className="mt-1 flex justify-between border-t pt-1"><span className="text-muted-foreground">Profit</span><span className={cn("figure font-semibold", m.profit < 0 ? "text-destructive" : "text-success")}>{formatMoney(m.profit)}</span></div></div>);
}

/** Revenue and expenses by month. The month labels under the chart are real buttons, so the chart works by keyboard and screen reader too. */
export default function MonthlyChart({ months, selected, onSelect }: { months: MonthPoint[]; selected: string | null; onSelect: (month: string) => void }) {
  const dim = (m: MonthPoint) => (selected && selected !== m.month ? 0.45 : m.partial ? 0.7 : 1);
  const pick = (s: any) => { const i = Number(s?.activeIndex ?? s?.activeTooltipIndex); if (Number.isInteger(i) && months[i]) onSelect(months[i].month); };
  return (<div>
    <div className="h-64 w-full" aria-hidden>
      <ResponsiveContainer width="100%" height="100%">
        <BarChart data={months} margin={{ top: 8, right: 8, bottom: 0, left: 0 }} barGap={3} barCategoryGap="28%" onClick={pick} style={{ cursor: "pointer" }}>
          <CartesianGrid vertical={false} stroke="hsl(var(--border))" strokeDasharray="3 4" />
          <XAxis dataKey="label" hide />
          <YAxis width={AXIS} tickLine={false} axisLine={false} tickFormatter={compact} tick={{ fontSize: 11, fill: "hsl(var(--muted-foreground))" }} />
          <Tooltip content={<Tip />} cursor={{ fill: "hsl(var(--muted))" }} />
          <Bar dataKey="revenue" name="Revenue" radius={[3, 3, 0, 0]} maxBarSize={26} animationDuration={500}>{months.map((m) => <Cell key={m.month} fill="hsl(var(--primary))" fillOpacity={dim(m)} />)}</Bar>
          <Bar dataKey="expenses" name="Expenses" radius={[3, 3, 0, 0]} maxBarSize={26} animationDuration={500}>{months.map((m) => <Cell key={m.month} fill="hsl(var(--muted-foreground))" fillOpacity={0.45 * dim(m)} />)}</Bar>
        </BarChart>
      </ResponsiveContainer>
    </div>
    <div className="grid pr-2" style={{ paddingLeft: AXIS, gridTemplateColumns: `repeat(${months.length}, minmax(0, 1fr))` }} role="group" aria-label="Choose a month">
      {months.map((m) => { const on = selected === m.month; return (
        <button key={m.month} type="button" data-month={m.month} aria-pressed={on} onClick={() => onSelect(m.month)}
          aria-label={`${m.full}: revenue ${formatMoney(m.revenue)}, expenses ${formatMoney(m.expenses)}. Select to see why.`}
          className={cn("mx-0.5 truncate rounded-md py-1.5 text-xs transition-colors", on ? "bg-primary-soft font-bold text-primary" : "font-medium text-muted-foreground hover:bg-muted hover:text-foreground")}>{m.label}{m.partial ? "*" : ""}</button>); })}
    </div>
    <div className="mt-2 flex items-center gap-4 text-xs text-muted-foreground" style={{ paddingLeft: AXIS }}><span className="flex items-center gap-1.5"><i className="size-2.5 rounded-sm bg-primary" />Revenue</span><span className="flex items-center gap-1.5"><i className="size-2.5 rounded-sm bg-muted-foreground/45" />Expenses</span><span className="ml-auto">* month so far</span></div>
  </div>);
}
