import React, { useEffect, useMemo, useState } from "react";
import { Link, useParams } from "react-router-dom";
import { api } from "@/lib/api";
import { CHART_COLORS } from "@/lib/colors";
import {
  BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid,
  ScatterChart, Scatter, Cell, LineChart, Line, AreaChart, Area, PieChart, Pie
} from "recharts";
import { Sparkles, Wand2, Loader2, FileBarChart2, MessageSquare } from "lucide-react";
import { toast } from "sonner";

const AXIS = { stroke: "#52525B", tick: { fill: "#8F8F91", fontSize: 11, fontFamily: "JetBrains Mono" } };
const TTIP = { contentStyle: { background: "#151619", border: "1px solid rgba(255,255,255,0.1)", borderRadius: 8, fontSize: 12 } };

export default function DatasetDetail() {
  const { id } = useParams();
  const [ds, setDs] = useState(null);
  const [edaData, setEdaData] = useState(null);
  const [insights, setInsights] = useState(null);
  const [insightLoading, setInsightLoading] = useState(false);
  const [cleaning, setCleaning] = useState(false);
  const [cleanResult, setCleanResult] = useState(null);

  useEffect(() => {
    api.get(`/datasets/${id}`).then(r => setDs(r.data));
    api.get(`/datasets/${id}/eda`).then(r => setEdaData(r.data));
  }, [id]);

  const runInsights = async () => {
    setInsightLoading(true);
    try {
      const { data } = await api.get(`/datasets/${id}/insights`);
      setInsights(data.insights);
    } catch (e) { toast.error("Insights failed"); }
    finally { setInsightLoading(false); }
  };

  const clean = async () => {
    setCleaning(true);
    try {
      const { data } = await api.post("/clean", { dataset_id: id, drop_duplicates: true, fill_numeric: "median", fill_categorical: "mode", drop_empty_cols: true, remove_outliers: false });
      setCleanResult(data);
      toast.success("Dataset cleaned");
    } catch (err) {
      console.warn("clean failed:", err?.message);
      toast.error("Cleaning failed");
    }
    finally { setCleaning(false); }
  };

  const totalMissing = useMemo(
    () => edaData ? Object.values(edaData.missing).reduce((a, b) => a + b, 0).toLocaleString() : "0",
    [edaData]
  );

  if (!ds || !edaData) return <div className="text-sm text-neutral-500">Loading dataset…</div>;

  const missingSeries = Object.entries(edaData.missing).map(([k,v])=>({ name: k, missing: v })).filter(x=>x.missing>0).slice(0,15);
  const numericCols = edaData.numeric_cols;

  return (
    <div className="space-y-8">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <div className="label-eyebrow">dataset</div>
          <h1 className="font-display text-3xl tracking-tighter mt-2">{ds.name}</h1>
          <p className="text-sm text-neutral-500 font-mono mt-1">{ds.rows.toLocaleString()} rows × {ds.cols} columns</p>
        </div>
        <div className="flex flex-wrap gap-2">
          <Link to={`/app/chat?dataset=${id}`} className="btn-ghost inline-flex items-center gap-2" data-testid="ds-chat-btn"><MessageSquare className="h-4 w-4"/> Ask AI</Link>
          <button onClick={clean} disabled={cleaning} className="btn-ghost inline-flex items-center gap-2" data-testid="ds-clean-btn">
            {cleaning ? <Loader2 className="h-4 w-4 animate-spin"/> : <Wand2 className="h-4 w-4"/>} Auto-clean
          </button>
          <button onClick={runInsights} disabled={insightLoading} className="btn-primary inline-flex items-center gap-2" data-testid="ds-insights-btn">
            {insightLoading ? <Loader2 className="h-4 w-4 animate-spin"/> : <Sparkles className="h-4 w-4"/>} Generate AI insights
          </button>
        </div>
      </div>

      {/* KPI row */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <Kpi label="Missing cells" value={Object.values(edaData.missing).reduce((a,b)=>a+b,0).toLocaleString()} />
        <Kpi label="Duplicates" value={edaData.duplicates.toLocaleString()} />
        <Kpi label="Numeric cols" value={edaData.numeric_cols.length} />
        <Kpi label="Categorical cols" value={edaData.categorical_cols.length} />
      </div>

      {cleanResult && (
        <div className="card-surface p-6">
          <h2 className="font-display text-xl mb-4">Cleaning: before vs after</h2>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            {["rows","cols","missing","duplicates"].map(k => (
              <div key={k} className="rounded-md border border-white/[0.06] p-4">
                <div className="label-eyebrow">{k}</div>
                <div className="mt-2 flex items-baseline gap-2">
                  <span className="font-mono text-neutral-500 line-through">{cleanResult.before[k]}</span>
                  <span className="font-mono text-2xl text-emerald-400">{cleanResult.after[k]}</span>
                </div>
              </div>
            ))}
          </div>
          <Link to={`/app/datasets/${cleanResult.new_dataset_id}`} className="mt-4 inline-flex text-sm text-indigo-300 hover:text-indigo-200">
            Open cleaned dataset →
          </Link>
        </div>
      )}

      {/* AI Insights */}
      {insights && (
        <div className="card-surface p-6">
          <h2 className="font-display text-xl mb-4 flex items-center gap-2"><Sparkles className="h-5 w-5 text-indigo-400"/> AI-generated insights</h2>
          <div className="grid md:grid-cols-2 gap-4">
            {insights.map((it) => (
              <div key={`${it.category}-${it.title}`} className="rounded-md border border-white/[0.06] p-4 bg-[#0E0F12]" data-testid={`insight-${it.category}`}>
                <div className="flex items-center justify-between">
                  <span className="text-xs font-mono uppercase tracking-widest text-indigo-300">{it.category}</span>
                  <span className={`text-[10px] font-mono px-2 py-0.5 rounded-full ${it.impact === "high" ? "bg-red-500/15 text-red-300" : it.impact === "medium" ? "bg-amber-500/15 text-amber-300" : "bg-emerald-500/15 text-emerald-300"}`}>{it.impact}</span>
                </div>
                <div className="mt-2 font-display text-lg tracking-tight">{it.title}</div>
                <p className="mt-2 text-sm text-neutral-400 leading-relaxed">{it.insight}</p>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Preview */}
      <div className="card-surface p-6">
        <h2 className="font-display text-xl mb-4">Preview · first 20 rows</h2>
        <div className="overflow-auto max-h-96 rounded-md border border-white/[0.06]">
          <table className="w-full text-xs font-mono">
            <thead className="sticky top-0 bg-[#151619] border-b border-white/[0.06]">
              <tr>{Object.keys(ds.preview?.[0] || {}).map(c => <th key={c} className="px-3 py-2 text-left text-neutral-400 whitespace-nowrap">{c}</th>)}</tr>
            </thead>
            <tbody>
              {(ds.preview || []).slice(0,20).map((row, i) => (
                <tr key={`row-${i}-${JSON.stringify(row).slice(0,30)}`} className="border-b border-white/[0.04] hover:bg-white/[0.02]">
                  {Object.keys(ds.preview[0] || {}).map(c => <td key={c} className="px-3 py-2 text-neutral-300 whitespace-nowrap max-w-[200px] truncate">{String(row[c] ?? "—")}</td>)}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Missing bar */}
      {missingSeries.length > 0 && (
        <div className="card-surface p-6">
          <h2 className="font-display text-xl mb-4">Missing values by column</h2>
          <ResponsiveContainer width="100%" height={260}>
            <BarChart data={missingSeries} margin={{ left: 10, right: 20, top: 10, bottom: 40 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.05)" />
              <XAxis dataKey="name" {...AXIS} angle={-30} textAnchor="end" height={70}/>
              <YAxis {...AXIS}/>
              <Tooltip {...TTIP}/>
              <Bar dataKey="missing" fill="#F59E0B" radius={[4,4,0,0]}/>
            </BarChart>
          </ResponsiveContainer>
        </div>
      )}

      {/* Distributions */}
      {numericCols.length > 0 && (
        <div className="grid md:grid-cols-2 gap-6">
          {Object.entries(edaData.distributions).slice(0,4).map(([col, dist]) => {
            const data = dist.bins.slice(0,-1).map((b, i) => ({ bin: Number(b).toFixed(1), count: dist.counts[i] }));
            return (
              <div key={col} className="card-surface p-6">
                <div className="label-eyebrow">distribution</div>
                <h3 className="font-display text-lg mt-1">{col}</h3>
                <ResponsiveContainer width="100%" height={200}>
                  <AreaChart data={data}>
                    <defs>
                      <linearGradient id={`gr-${col}`} x1="0" x2="0" y1="0" y2="1">
                        <stop offset="0%" stopColor="#6366F1" stopOpacity={0.6}/>
                        <stop offset="100%" stopColor="#6366F1" stopOpacity={0}/>
                      </linearGradient>
                    </defs>
                    <XAxis dataKey="bin" {...AXIS}/>
                    <YAxis {...AXIS}/>
                    <Tooltip {...TTIP}/>
                    <Area type="monotone" dataKey="count" stroke="#818CF8" fill={`url(#gr-${col})`} strokeWidth={2}/>
                  </AreaChart>
                </ResponsiveContainer>
              </div>
            );
          })}
        </div>
      )}

      {/* Correlation heatmap */}
      {edaData.correlation?.columns?.length > 1 && (
        <div className="card-surface p-6 overflow-auto">
          <h2 className="font-display text-xl mb-4">Correlation matrix</h2>
          <CorrHeatmap corr={edaData.correlation}/>
        </div>
      )}

      {/* Categories */}
      {Object.keys(edaData.categories).length > 0 && (
        <div className="grid md:grid-cols-2 gap-6">
          {Object.entries(edaData.categories).slice(0,4).map(([col, arr]) => (
            <div key={col} className="card-surface p-6">
              <div className="label-eyebrow">top values</div>
              <h3 className="font-display text-lg mt-1">{col}</h3>
              <ResponsiveContainer width="100%" height={220}>
                <BarChart data={arr} layout="vertical" margin={{ left: 20 }}>
                  <XAxis type="number" {...AXIS}/>
                  <YAxis type="category" dataKey="label" {...AXIS} width={100}/>
                  <Tooltip {...TTIP}/>
                  <Bar dataKey="count" fill="#8B5CF6" radius={[0,4,4,0]}/>
                </BarChart>
              </ResponsiveContainer>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

function Kpi({ label, value }) {
  return (
    <div className="card-surface p-5">
      <div className="label-eyebrow">{label}</div>
      <div className="font-mono text-2xl mt-2">{value}</div>
    </div>
  );
}

function CorrHeatmap({ corr }) {
  const { columns, matrix } = corr;
  const cellFor = (v) => {
    const val = Number(v || 0);
    const intensity = Math.min(Math.abs(val), 1);
    const color = val >= 0 ? `rgba(99,102,241, ${intensity})` : `rgba(239,68,68, ${intensity})`;
    return color;
  };
  return (
    <div className="inline-block">
      <div className="grid" style={{ gridTemplateColumns: `140px repeat(${columns.length}, 60px)` }}>
        <div />
        {columns.map(c => <div key={c} className="text-[10px] font-mono text-neutral-500 -rotate-45 origin-bottom-left px-1 truncate">{c}</div>)}
        {columns.map((row, i) => (
          <React.Fragment key={row}>
            <div className="text-[11px] font-mono text-neutral-400 pr-3 py-1 truncate">{row}</div>
            {matrix[i].map((v, j) => (
              <div key={`${row}-${columns[j]}`} className="h-8 rounded border border-white/[0.04] flex items-center justify-center text-[10px] font-mono" style={{ background: cellFor(v), color: Math.abs(v) > 0.4 ? "#fff" : "#8F8F91" }}>
                {Number(v || 0).toFixed(2)}
              </div>
            ))}
          </React.Fragment>
        ))}
      </div>
    </div>
  );
}
