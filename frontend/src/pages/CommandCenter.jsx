import React, { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { api } from "@/lib/api";
import { useAuth } from "@/lib/auth";
import { motion } from "framer-motion";
import { TrendingUp, TrendingDown, ArrowUpRight, Sparkles, MessageSquare, Search, GitBranch, Database } from "lucide-react";
import { ResponsiveContainer, AreaChart, Area, LineChart, Line, XAxis, YAxis, Tooltip } from "recharts";

const AXIS = { stroke: "transparent", tick: false, axisLine: false };
const TTIP = { contentStyle: { background: "#151619", border: "1px solid rgba(255,255,255,0.1)", borderRadius: 8, fontSize: 12 } };

function Sparkline({ points, positive }) {
  const data = points.map((v, i) => ({ i, v }));
  const color = positive ? "#10B981" : "#F97316";
  return (
    <ResponsiveContainer width="100%" height={44}>
      <AreaChart data={data}>
        <defs>
          <linearGradient id={`sp-${color}`} x1="0" x2="0" y1="0" y2="1">
            <stop offset="0%" stopColor={color} stopOpacity={0.45}/>
            <stop offset="100%" stopColor={color} stopOpacity={0}/>
          </linearGradient>
        </defs>
        <Area type="monotone" dataKey="v" stroke={color} strokeWidth={1.8} fill={`url(#sp-${color})`}/>
      </AreaChart>
    </ResponsiveContainer>
  );
}

function KpiCard({ kpi, i }) {
  const positive = kpi.delta >= 0;
  const inverted = kpi.key === "churn" || kpi.key === "risk";
  const good = inverted ? !positive : positive;
  return (
    <motion.div initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4, delay: i * 0.05 }}
      className="card-surface p-5 relative overflow-hidden group" data-testid={`kpi-${kpi.key}`}>
      <div className="flex items-center justify-between">
        <div className="label-eyebrow">{kpi.label}</div>
        <div className={`text-[10px] font-mono px-1.5 py-0.5 rounded ${good ? "text-emerald-300 bg-emerald-500/10" : "text-orange-300 bg-orange-500/10"}`}>
          {positive ? "+" : ""}{(kpi.delta * 100).toFixed(1)}% <span className="text-neutral-500 ml-1">{kpi.unit}</span>
        </div>
      </div>
      <div className="mt-3 flex items-end justify-between">
        <div className="font-display text-3xl tracking-tighter">{kpi.value}</div>
        {good ? <TrendingUp className="h-4 w-4 text-emerald-400" strokeWidth={1.5}/> : <TrendingDown className="h-4 w-4 text-orange-400" strokeWidth={1.5}/>}
      </div>
      <div className="mt-3">
        <Sparkline points={kpi.trend} positive={good}/>
      </div>
    </motion.div>
  );
}

export default function CommandCenter() {
  const { user } = useAuth();
  const [data, setData] = useState(null);

  useEffect(() => {
    let cancelled = false;
    const load = () => api.get("/command-center").then(r => { if (!cancelled) setData(r.data); });
    load();
    const t = setInterval(load, 60_000); // live-ish refresh
    return () => { cancelled = true; clearInterval(t); };
  }, []);

  if (!data) return <div className="text-sm text-neutral-500">Loading Command Center…</div>;

  return (
    <div className="space-y-10">
      {/* Header */}
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <div className="label-eyebrow">ai command center</div>
          <h1 className="font-display text-4xl tracking-tighter mt-2">
            Good {new Date().getHours() < 12 ? "morning" : new Date().getHours() < 18 ? "afternoon" : "evening"}, {user?.name?.split(" ")[0] || "friend"}.
          </h1>
          <p className="text-neutral-500 mt-2 text-sm">
            Your business at a glance · {data.stats.datasets} datasets · {(data.stats.rows_analyzed || 0).toLocaleString()} rows analyzed
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          <Link to="/app/datasets" className="btn-ghost inline-flex items-center gap-2 text-sm" data-testid="cc-upload"><Database className="h-4 w-4"/> Upload data</Link>
          <Link to="/app/copilot" className="btn-primary inline-flex items-center gap-2 text-sm" data-testid="cc-copilot"><Sparkles className="h-4 w-4"/> Run Business Copilot</Link>
        </div>
      </div>

      {/* KPI grid */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4" data-testid="kpi-grid">
        {data.kpis.map((k, i) => <KpiCard key={k.key} kpi={k} i={i}/>)}
      </div>

      {/* Quick launch */}
      <div className="grid md:grid-cols-3 gap-4">
        <QuickCard to="/app/copilot" icon={Sparkles} title="AI Business Copilot" desc="Executive summary, RCA, risks, opportunities, forecast." testid="ql-copilot"/>
        <QuickCard to="/app/detective" icon={Search} title="AI Data Detective" desc="Auto-investigate uploads for anomalies, decline, fraud, opportunities." testid="ql-detective"/>
        <QuickCard to="/app/whatif" icon={GitBranch} title="What-If Simulator" desc="Simulate business scenarios and see AI-projected impact." testid="ql-whatif"/>
        <QuickCard to="/app/boardroom" icon={Sparkles} title="CEO Boardroom" desc="Executive briefings for CEO / CFO / Marketing / Sales / Risk." testid="ql-boardroom"/>
        <QuickCard to="/app/automations" icon={GitBranch} title="Automations" desc="Weekly reports, alerts on churn or revenue drops." testid="ql-autos"/>
        <QuickCard to="/app/integrations" icon={Database} title="Integrations" desc="Excel · SQL · Power BI · Snowflake · BigQuery · Google Sheets." testid="ql-integrations"/>
      </div>

      {/* Latest dataset shortcut */}
      {data.latest_dataset && (
        <div className="card-surface p-6 flex flex-wrap items-center justify-between gap-4">
          <div>
            <div className="label-eyebrow">last upload</div>
            <div className="font-display text-lg tracking-tight mt-1">{data.latest_dataset.name}</div>
            <div className="text-xs font-mono text-neutral-500 mt-0.5">{data.latest_dataset.rows?.toLocaleString()} rows · {data.latest_dataset.cols} cols</div>
          </div>
          <div className="flex gap-2">
            <Link to={`/app/datasets/${data.latest_dataset.dataset_id}`} className="btn-ghost text-sm inline-flex items-center gap-1"><ArrowUpRight className="h-3.5 w-3.5"/> Explore</Link>
            <Link to={`/app/detective?dataset=${data.latest_dataset.dataset_id}`} className="btn-primary text-sm inline-flex items-center gap-1"><Search className="h-3.5 w-3.5"/> Investigate</Link>
          </div>
        </div>
      )}
    </div>
  );
}

function QuickCard({ to, icon: Icon, title, desc, testid }) {
  return (
    <Link to={to} data-testid={testid} className="card-surface p-6 block group">
      <Icon className="h-5 w-5 text-indigo-400" strokeWidth={1.5}/>
      <div className="mt-3 font-display text-lg tracking-tight flex items-center justify-between">
        {title}
        <ArrowUpRight className="h-4 w-4 text-neutral-500 group-hover:text-neutral-200 transition-colors"/>
      </div>
      <p className="mt-2 text-sm text-neutral-400 leading-relaxed">{desc}</p>
    </Link>
  );
}
