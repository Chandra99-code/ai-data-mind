import React, { useEffect, useState } from "react";
import { useSearchParams } from "react-router-dom";
import { api } from "@/lib/api";
import { Search, Loader2, AlertTriangle } from "lucide-react";

const SEV = { high: "text-red-300 bg-red-500/10 border-red-500/25", medium: "text-amber-300 bg-amber-500/10 border-amber-500/25", low: "text-emerald-300 bg-emerald-500/10 border-emerald-500/25" };

export default function DetectivePage() {
  const [sp] = useSearchParams();
  const [datasets, setDatasets] = useState([]);
  const [datasetId, setDatasetId] = useState(sp.get("dataset") || "");
  const [loading, setLoading] = useState(false);
  const [data, setData] = useState(null);

  useEffect(() => { api.get("/datasets").then(r => setDatasets(r.data)); }, []);

  const investigate = async () => {
    if (!datasetId) return;
    setLoading(true); setData(null);
    try {
      const r = await api.post("/copilot/detective", { dataset_id: datasetId });
      setData(r.data);
    } finally { setLoading(false); }
  };

  return (
    <div className="space-y-8">
      <div>
        <div className="label-eyebrow">ai data detective</div>
        <h1 className="font-display text-4xl tracking-tighter mt-2">Interrogate your data.</h1>
        <p className="text-neutral-500 mt-2 text-sm">Missing values · duplicates · outliers · seasonality · churn · fraud · slow movers · opportunities.</p>
      </div>

      <div className="card-surface p-5 flex flex-wrap gap-3 items-end">
        <div className="flex-1 min-w-64">
          <label className="label-eyebrow mb-2 block">dataset</label>
          <select value={datasetId} onChange={e=>setDatasetId(e.target.value)} data-testid="detective-dataset"
            className="w-full rounded-md bg-[#0D0E10] border border-white/10 px-3 py-2.5 text-sm focus:outline-none focus:border-indigo-500 transition-colors">
            <option value="">— select a dataset —</option>
            {datasets.map(d => <option key={d.dataset_id} value={d.dataset_id}>{d.name}</option>)}
          </select>
        </div>
        <button onClick={investigate} disabled={loading || !datasetId} data-testid="detective-run"
          className="btn-primary inline-flex items-center gap-2">
          {loading ? <Loader2 className="h-4 w-4 animate-spin"/> : <Search className="h-4 w-4"/>} Investigate
        </button>
      </div>

      {loading && <div className="text-sm text-neutral-500 font-mono">Detective is on the case…</div>}

      {data && (
        <div className="space-y-6">
          <div className="card-surface p-6">
            <div className="label-eyebrow">case file</div>
            <h2 className="font-display text-2xl tracking-tight mt-2">{data.case_title}</h2>
            <p className="mt-3 text-neutral-300 leading-relaxed">{data.summary}</p>
            {data.stats && (
              <div className="mt-4 grid grid-cols-2 md:grid-cols-4 gap-3">
                {[
                  { l: "Rows", v: data.stats.rows?.toLocaleString() },
                  { l: "Cols", v: data.stats.cols },
                  { l: "Missing", v: data.stats.missing_total?.toLocaleString() },
                  { l: "Duplicates", v: data.stats.duplicates?.toLocaleString() },
                ].map(k => (
                  <div key={k.l} className="rounded-md border border-white/[0.06] p-3">
                    <div className="label-eyebrow">{k.l}</div>
                    <div className="font-mono text-lg mt-1">{k.v}</div>
                  </div>
                ))}
              </div>
            )}
          </div>

          <div className="grid md:grid-cols-2 gap-6">
            {(data.findings || []).map((f) => (
              <div key={f.title} className="card-surface p-5" data-testid={`finding-${f.category}`}>
                <div className="flex items-center justify-between">
                  <span className="text-[10px] font-mono uppercase tracking-widest text-indigo-300">{f.category}</span>
                  <span className={`text-[10px] font-mono px-2 py-0.5 rounded-full border ${SEV[f.severity] || SEV.medium}`}>{f.severity}</span>
                </div>
                <div className="mt-2 flex items-start gap-2">
                  <AlertTriangle className="h-4 w-4 text-amber-400 mt-0.5 flex-shrink-0" strokeWidth={1.5}/>
                  <div>
                    <div className="font-display text-lg tracking-tight">{f.title}</div>
                    <p className="mt-1 text-sm text-neutral-400 leading-relaxed">{f.detail}</p>
                    {f.recommended_action && (
                      <div className="mt-2 text-xs text-emerald-300"><span className="text-neutral-500">→ </span>{f.recommended_action}</div>
                    )}
                  </div>
                </div>
              </div>
            ))}
          </div>

          {data.evidence?.length > 0 && (
            <div className="card-surface p-6">
              <div className="label-eyebrow mb-3">evidence</div>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                {data.evidence.map((e) => (
                  <div key={e.metric} className="rounded-md border border-white/[0.06] p-3">
                    <div className="text-xs text-neutral-500">{e.metric}</div>
                    <div className="font-mono text-sm mt-1">{e.value}</div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
