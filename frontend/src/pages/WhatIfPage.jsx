import React, { useEffect, useState } from "react";
import { api } from "@/lib/api";
import { GitBranch, Loader2, TrendingUp, TrendingDown } from "lucide-react";
import { ResponsiveContainer, LineChart, Line, XAxis, YAxis, Tooltip, CartesianGrid } from "recharts";

const AXIS = { stroke: "#52525B", tick: { fill: "#8F8F91", fontSize: 11, fontFamily: "JetBrains Mono" } };
const TTIP = { contentStyle: { background: "#151619", border: "1px solid rgba(255,255,255,0.1)", borderRadius: 8, fontSize: 12 } };

const RATING = {
  recommended: "text-emerald-300 bg-emerald-500/10 border-emerald-500/25",
  neutral: "text-neutral-400 bg-white/5 border-white/10",
  risky: "text-red-300 bg-red-500/10 border-red-500/25",
};

const PRESETS = [
  "Increase price of top product line by 10%",
  "Reduce marketing spend by 25% for next quarter",
  "Hire 5 additional sales reps in the South region",
  "Launch loyalty program that increases retention by 3 points",
];

export default function WhatIfPage() {
  const [datasets, setDatasets] = useState([]);
  const [datasetId, setDatasetId] = useState("");
  const [scenario, setScenario] = useState("");
  const [horizon, setHorizon] = useState(6);
  const [loading, setLoading] = useState(false);
  const [data, setData] = useState(null);

  useEffect(() => { api.get("/datasets").then(r => setDatasets(r.data)); }, []);

  const run = async () => {
    if (!scenario.trim()) return;
    setLoading(true); setData(null);
    try {
      const r = await api.post("/copilot/whatif", { dataset_id: datasetId || null, scenario, horizon_months: horizon });
      setData(r.data);
    } finally { setLoading(false); }
  };

  return (
    <div className="space-y-8">
      <div>
        <div className="label-eyebrow">what-if simulator</div>
        <h1 className="font-display text-4xl tracking-tighter mt-2">Simulate the future.</h1>
        <p className="text-neutral-500 mt-2 text-sm">Describe a hypothetical business change. Claude Sonnet 4.5 projects the impact.</p>
      </div>

      <div className="card-surface p-6 space-y-4">
        <textarea value={scenario} onChange={e=>setScenario(e.target.value)}
          placeholder="e.g. Increase price of Electronics by 8% and shift 20% of marketing to South region…"
          data-testid="whatif-scenario"
          className="w-full min-h-24 rounded-lg bg-[#0D0E10] border border-white/10 px-3.5 py-2.5 text-sm focus:outline-none focus:border-indigo-500 transition-colors"/>
        <div className="grid md:grid-cols-3 gap-4 items-end">
          <div>
            <label className="label-eyebrow mb-2 block">dataset (optional)</label>
            <select value={datasetId} onChange={e=>setDatasetId(e.target.value)} data-testid="whatif-dataset"
              className="w-full rounded-md bg-[#0D0E10] border border-white/10 px-3 py-2.5 text-sm focus:outline-none focus:border-indigo-500 transition-colors">
              <option value="">— no dataset —</option>
              {datasets.map(d => <option key={d.dataset_id} value={d.dataset_id}>{d.name}</option>)}
            </select>
          </div>
          <div>
            <label className="label-eyebrow mb-2 block">horizon (months) · {horizon}</label>
            <input type="range" min={3} max={18} value={horizon} onChange={e=>setHorizon(Number(e.target.value))} data-testid="whatif-horizon" className="w-full accent-indigo-500"/>
          </div>
          <button onClick={run} disabled={loading || !scenario.trim()} data-testid="whatif-run"
            className="btn-primary inline-flex items-center justify-center gap-2">
            {loading ? <Loader2 className="h-4 w-4 animate-spin"/> : <GitBranch className="h-4 w-4"/>} Simulate
          </button>
        </div>
        <div className="flex flex-wrap gap-2 pt-2">
          {PRESETS.map(p => (
            <button key={p} onClick={()=>setScenario(p)} className="text-xs font-mono px-3 py-1.5 rounded-full border border-white/10 text-neutral-400 hover:text-white hover:bg-white/[0.03] transition-colors">
              {p}
            </button>
          ))}
        </div>
      </div>

      {data && (
        <div className="space-y-6">
          <div className="card-surface p-6">
            <div className="flex items-center justify-between">
              <div>
                <div className="label-eyebrow">verdict</div>
                <div className="font-display text-xl tracking-tight mt-1">{data.verdict?.note}</div>
              </div>
              <span className={`text-[10px] font-mono px-3 py-1.5 rounded-full border ${RATING[data.verdict?.rating] || RATING.neutral}`}>{data.verdict?.rating}</span>
            </div>
          </div>

          {data.impact?.length > 0 && (
            <div className="card-surface p-6">
              <div className="label-eyebrow mb-3">projected impact</div>
              <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-3">
                {data.impact.map((i) => (
                  <div key={i.metric} className="rounded-md border border-white/[0.06] p-4">
                    <div className="text-xs text-neutral-500">{i.metric}</div>
                    <div className="mt-2 flex items-baseline gap-2">
                      <span className="font-mono text-neutral-500 line-through">{i.baseline}</span>
                      <span className="font-mono text-lg">{i.projected}</span>
                    </div>
                    <div className={`text-xs font-mono mt-1 ${i.change_pct >= 0 ? "text-emerald-300" : "text-red-300"}`}>
                      {i.change_pct >= 0 ? <TrendingUp className="inline h-3 w-3"/> : <TrendingDown className="inline h-3 w-3"/>} {(i.change_pct * 100).toFixed(1)}%
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {data.projection?.length > 0 && (
            <div className="card-surface p-6">
              <div className="label-eyebrow mb-3">projection curve</div>
              <ResponsiveContainer width="100%" height={280}>
                <LineChart data={data.projection}>
                  <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.05)"/>
                  <XAxis dataKey="month" {...AXIS}/>
                  <YAxis {...AXIS}/>
                  <Tooltip {...TTIP}/>
                  <Line type="monotone" dataKey="baseline" stroke="#8F8F91" strokeWidth={2} dot={false}/>
                  <Line type="monotone" dataKey="projected" stroke="#818CF8" strokeWidth={2.5} dot={false}/>
                </LineChart>
              </ResponsiveContainer>
            </div>
          )}

          <div className="grid md:grid-cols-2 gap-6">
            <div className="card-surface p-6">
              <div className="label-eyebrow mb-3">upside</div>
              <ul className="space-y-2 text-sm text-neutral-300">{(data.upside||[]).map((u) => <li key={u}>+ {u}</li>)}</ul>
            </div>
            <div className="card-surface p-6">
              <div className="label-eyebrow mb-3">downside</div>
              <ul className="space-y-2 text-sm text-neutral-300">{(data.downside||[]).map((u) => <li key={u}>− {u}</li>)}</ul>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
