import React, { useEffect, useState } from "react";
import { useSearchParams } from "react-router-dom";
import { api } from "@/lib/api";
import { Sparkles, Loader2, TrendingUp, TrendingDown, Minus, ShieldAlert, Zap, Target } from "lucide-react";
import { ResponsiveContainer, RadialBarChart, RadialBar, PolarAngleAxis, Cell } from "recharts";

const IMPACT = { high: "text-red-300 bg-red-500/10 border-red-500/25", medium: "text-amber-300 bg-amber-500/10 border-amber-500/25", low: "text-emerald-300 bg-emerald-500/10 border-emerald-500/25" };
const DIR = { up: <TrendingUp className="h-3.5 w-3.5 text-emerald-400"/>, down: <TrendingDown className="h-3.5 w-3.5 text-red-400"/>, flat: <Minus className="h-3.5 w-3.5 text-neutral-500"/> };

function HealthGauge({ score }) {
  const data = [{ name: "score", value: score, fill: score >= 80 ? "#10B981" : score >= 60 ? "#F59E0B" : "#EF4444" }];
  return (
    <div className="relative h-52">
      <ResponsiveContainer width="100%" height="100%">
        <RadialBarChart innerRadius="70%" outerRadius="100%" data={data} startAngle={220} endAngle={-40}>
          <PolarAngleAxis type="number" domain={[0, 100]} tick={false}/>
          <RadialBar dataKey="value" cornerRadius={10} background={{ fill: "rgba(255,255,255,0.05)" }}/>
        </RadialBarChart>
      </ResponsiveContainer>
      <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none">
        <div className="font-display text-5xl tracking-tighter">{score}</div>
        <div className="text-xs font-mono text-neutral-500 mt-1">Business Health</div>
      </div>
    </div>
  );
}

export default function CopilotPage() {
  const [sp] = useSearchParams();
  const [datasets, setDatasets] = useState([]);
  const [datasetId, setDatasetId] = useState(sp.get("dataset") || "");
  const [loading, setLoading] = useState(false);
  const [data, setData] = useState(null);

  useEffect(() => { api.get("/datasets").then(r => setDatasets(r.data)); }, []);

  const analyze = async () => {
    if (!datasetId) return;
    setLoading(true); setData(null);
    try {
      const r = await api.post("/copilot/analyze", { dataset_id: datasetId });
      setData(r.data);
    } finally { setLoading(false); }
  };

  return (
    <div className="space-y-8">
      <div>
        <div className="label-eyebrow">ai business copilot</div>
        <h1 className="font-display text-4xl tracking-tighter mt-2">Proactive intelligence.</h1>
        <p className="text-neutral-500 mt-2 text-sm">Executive Summary · RCA · Trends · Risks · Opportunities · Forecast · Health.</p>
      </div>

      <div className="card-surface p-5 flex flex-wrap gap-3 items-end">
        <div className="flex-1 min-w-64">
          <label className="label-eyebrow mb-2 block">dataset</label>
          <select value={datasetId} onChange={e=>setDatasetId(e.target.value)} data-testid="copilot-dataset"
            className="w-full rounded-md bg-[#0D0E10] border border-white/10 px-3 py-2.5 text-sm focus:outline-none focus:border-indigo-500 transition-colors">
            <option value="">— select a dataset —</option>
            {datasets.map(d => <option key={d.dataset_id} value={d.dataset_id}>{d.name}</option>)}
          </select>
        </div>
        <button onClick={analyze} disabled={loading || !datasetId} data-testid="copilot-run"
          className="btn-primary inline-flex items-center gap-2">
          {loading ? <Loader2 className="h-4 w-4 animate-spin"/> : <Sparkles className="h-4 w-4"/>} Run Copilot
        </button>
      </div>

      {loading && <div className="text-sm text-neutral-500 font-mono">Claude Sonnet 4.5 is analysing your dataset…</div>}

      {data && (
        <div className="space-y-6">
          <div className="grid md:grid-cols-3 gap-6">
            <div className="md:col-span-2 card-surface p-6">
              <div className="label-eyebrow">executive summary</div>
              <p className="mt-3 text-neutral-200 leading-relaxed">{data.executive_summary}</p>
              <div className="mt-4 grid grid-cols-2 gap-3">
                <div>
                  <div className="label-eyebrow">forecast</div>
                  <div className="text-sm mt-1">{data.forecast?.summary}</div>
                  <div className="text-xs font-mono text-neutral-500 mt-1">
                    Δ {((data.forecast?.next_period_change_pct || 0) * 100).toFixed(1)}% · confidence {Math.round((data.forecast?.confidence || 0) * 100)}%
                  </div>
                </div>
                <div>
                  <div className="label-eyebrow">actions</div>
                  <ul className="text-sm mt-1 space-y-1">
                    {(data.recommendations || []).slice(0,4).map((r) => <li key={r} className="text-neutral-300">• {r}</li>)}
                  </ul>
                </div>
              </div>
            </div>
            <div className="card-surface p-6">
              <HealthGauge score={data.health_score?.score || 0}/>
              <div className="mt-4 space-y-2">
                {(data.health_score?.breakdown || []).map((b) => (
                  <div key={b.pillar} className="flex items-center gap-3">
                    <div className="w-24 text-xs text-neutral-400">{b.pillar}</div>
                    <div className="flex-1 h-1.5 bg-white/[0.06] rounded-full overflow-hidden">
                      <div className="h-full rounded-full" style={{ width: `${b.score}%`, background: b.score >= 80 ? "#10B981" : b.score >= 60 ? "#F59E0B" : "#EF4444" }}/>
                    </div>
                    <div className="text-xs font-mono w-8 text-right">{b.score}</div>
                  </div>
                ))}
              </div>
            </div>
          </div>

          {/* Trends + RCA */}
          <div className="grid md:grid-cols-2 gap-6">
            <div className="card-surface p-6">
              <div className="label-eyebrow mb-4">trends</div>
              <div className="space-y-3">
                {(data.trends || []).map((t) => (
                  <div key={t.name} className="flex items-center justify-between gap-3 border-b border-white/[0.05] pb-2">
                    <div className="flex items-center gap-2">
                      {DIR[t.direction] || DIR.flat}
                      <div>
                        <div className="text-sm">{t.name}</div>
                        <div className="text-xs text-neutral-500">{t.note}</div>
                      </div>
                    </div>
                    <div className={`font-mono text-xs ${t.direction === "up" ? "text-emerald-300" : t.direction === "down" ? "text-red-300" : "text-neutral-400"}`}>
                      {(t.delta_pct >= 0 ? "+" : "") + (t.delta_pct * 100).toFixed(1)}%
                    </div>
                  </div>
                ))}
              </div>
            </div>
            <div className="card-surface p-6">
              <div className="label-eyebrow mb-4">root cause analysis</div>
              <div className="space-y-3">
                {(data.root_cause_analysis || []).map((r) => (
                  <div key={r.finding} className="rounded-md border border-white/[0.06] p-3">
                    <div className="text-sm font-medium">{r.finding}</div>
                    <div className="text-xs text-neutral-400 mt-1">↳ {r.cause}</div>
                  </div>
                ))}
              </div>
            </div>
          </div>

          {/* Risks / Opportunities */}
          <div className="grid md:grid-cols-2 gap-6">
            <div className="card-surface p-6">
              <div className="label-eyebrow flex items-center gap-2 mb-4"><ShieldAlert className="h-3.5 w-3.5"/> risks</div>
              <div className="space-y-3">
                {(data.risks || []).map((r) => (
                  <div key={r.title} className="rounded-md border border-white/[0.06] p-3">
                    <div className="flex items-center justify-between">
                      <span className="text-sm">{r.title}</span>
                      <span className={`text-[10px] font-mono px-2 py-0.5 rounded-full border ${IMPACT[r.impact] || IMPACT.medium}`}>{r.impact}</span>
                    </div>
                    <div className="text-xs text-neutral-500 mt-1">{r.note}</div>
                  </div>
                ))}
              </div>
            </div>
            <div className="card-surface p-6">
              <div className="label-eyebrow flex items-center gap-2 mb-4"><Zap className="h-3.5 w-3.5"/> opportunities</div>
              <div className="space-y-3">
                {(data.opportunities || []).map((r) => (
                  <div key={r.title} className="rounded-md border border-white/[0.06] p-3">
                    <div className="flex items-center justify-between">
                      <span className="text-sm">{r.title}</span>
                      <span className={`text-[10px] font-mono px-2 py-0.5 rounded-full border ${IMPACT[r.impact] || IMPACT.medium}`}>{r.impact}</span>
                    </div>
                    <div className="text-xs text-neutral-500 mt-1">{r.note}</div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
