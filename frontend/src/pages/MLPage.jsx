import React, { useEffect, useState } from "react";
import { api } from "@/lib/api";
import {
  BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid,
  ScatterChart, Scatter, LineChart, Line, PieChart, Pie, Cell,
} from "recharts";
import { CHART_COLORS } from "@/lib/colors";
import { Sparkles, Loader2 } from "lucide-react";
import { toast } from "sonner";

const AXIS = { stroke: "#52525B", tick: { fill: "#8F8F91", fontSize: 11, fontFamily: "JetBrains Mono" } };
const TTIP = { contentStyle: { background: "#151619", border: "1px solid rgba(255,255,255,0.1)", borderRadius: 8, fontSize: 12 } };

export default function MLPage() {
  const [datasets, setDatasets] = useState([]);
  const [datasetId, setDatasetId] = useState("");
  const [ds, setDs] = useState(null);
  const [target, setTarget] = useState("");
  const [task, setTask] = useState("regression");
  const [result, setResult] = useState(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => { api.get("/datasets").then(r => setDatasets(r.data)); }, []);
  useEffect(() => {
    if (datasetId) api.get(`/datasets/${datasetId}`).then(r => setDs(r.data));
    else setDs(null);
    setResult(null);
  }, [datasetId]);

  const train = async () => {
    if (!datasetId) return toast.error("Select a dataset");
    if (task !== "clustering" && !target) return toast.error("Select a target column");
    setLoading(true); setResult(null);
    try {
      const { data } = await api.post("/ml/train", { dataset_id: datasetId, target: target || "__none__", task });
      setResult(data);
      toast.success(`${task} trained`);
    } catch (e) { toast.error(e?.response?.data?.detail || "Training failed"); }
    finally { setLoading(false); }
  };

  return (
    <div className="space-y-8">
      <div>
        <div className="label-eyebrow">ml studio</div>
        <h1 className="font-display text-4xl tracking-tighter mt-2">Train a model in one click.</h1>
        <p className="text-neutral-500 mt-2">Regression · Classification · Clustering · Forecasting</p>
      </div>

      <div className="card-surface p-6">
        <div className="grid md:grid-cols-4 gap-4">
          <div>
            <label className="label-eyebrow mb-2 block">dataset</label>
            <select value={datasetId} onChange={e=>setDatasetId(e.target.value)} data-testid="ml-dataset-select"
              className="w-full rounded-md bg-[#0D0E10] border border-white/10 px-3 py-2.5 text-sm focus:outline-none focus:border-indigo-500 transition-colors">
              <option value="">— pick dataset —</option>
              {datasets.map(d => <option key={d.dataset_id} value={d.dataset_id}>{d.name}</option>)}
            </select>
          </div>
          <div>
            <label className="label-eyebrow mb-2 block">task</label>
            <select value={task} onChange={e=>setTask(e.target.value)} data-testid="ml-task-select"
              className="w-full rounded-md bg-[#0D0E10] border border-white/10 px-3 py-2.5 text-sm focus:outline-none focus:border-indigo-500 transition-colors">
              <option value="regression">Regression</option>
              <option value="classification">Classification</option>
              <option value="clustering">Clustering</option>
              <option value="forecasting">Forecasting</option>
            </select>
          </div>
          <div>
            <label className="label-eyebrow mb-2 block">target column</label>
            <select value={target} onChange={e=>setTarget(e.target.value)} disabled={task === "clustering"} data-testid="ml-target-select"
              className="w-full rounded-md bg-[#0D0E10] border border-white/10 px-3 py-2.5 text-sm focus:outline-none focus:border-indigo-500 disabled:opacity-40 transition-colors">
              <option value="">—</option>
              {ds?.schema?.map(c => <option key={c.name} value={c.name}>{c.name} ({c.kind})</option>)}
            </select>
          </div>
          <div className="flex items-end">
            <button onClick={train} disabled={loading || !datasetId} data-testid="ml-train-btn"
              className="btn-primary w-full inline-flex items-center justify-center gap-2">
              {loading ? <Loader2 className="h-4 w-4 animate-spin"/> : <Sparkles className="h-4 w-4"/>} Train
            </button>
          </div>
        </div>
      </div>

      {result && (
        <div className="space-y-6">
          {/* Metrics */}
          {result.metrics && (
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              {Object.entries(result.metrics).map(([k,v]) => (
                <div key={k} className="card-surface p-5">
                  <div className="label-eyebrow">{k}</div>
                  <div className="font-mono text-2xl mt-2">{typeof v === "number" ? v.toFixed(4) : v}</div>
                </div>
              ))}
            </div>
          )}

          {/* Feature importance */}
          {result.feature_importance && (
            <div className="card-surface p-6">
              <h2 className="font-display text-xl mb-4">Feature importance</h2>
              <ResponsiveContainer width="100%" height={Math.max(240, result.feature_importance.length * 26)}>
                <BarChart data={result.feature_importance} layout="vertical" margin={{ left: 40 }}>
                  <XAxis type="number" {...AXIS}/>
                  <YAxis type="category" dataKey="feature" {...AXIS} width={140}/>
                  <Tooltip {...TTIP}/>
                  <Bar dataKey="importance" fill="#6366F1" radius={[0,4,4,0]}/>
                </BarChart>
              </ResponsiveContainer>
            </div>
          )}

          {/* Predictions scatter (regression) */}
          {result.task === "regression" && result.predictions && (
            <div className="card-surface p-6">
              <h2 className="font-display text-xl mb-4">Actual vs Predicted</h2>
              <ResponsiveContainer width="100%" height={320}>
                <ScatterChart>
                  <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.05)"/>
                  <XAxis dataKey="actual" name="Actual" {...AXIS}/>
                  <YAxis dataKey="predicted" name="Predicted" {...AXIS}/>
                  <Tooltip {...TTIP}/>
                  <Scatter data={result.predictions} fill="#8B5CF6"/>
                </ScatterChart>
              </ResponsiveContainer>
            </div>
          )}

          {/* Confusion matrix */}
          {result.task === "classification" && result.confusion_matrix && (
            <div className="card-surface p-6">
              <h2 className="font-display text-xl mb-4">Confusion matrix</h2>
              <div className="inline-block">
                {result.confusion_matrix.map((row, i) => (
                  <div key={`ci-${i}`} className="flex">
                    {row.map((v, j) => {
                      const max = Math.max(...result.confusion_matrix.flat());
                      const intensity = max > 0 ? v / max : 0;
                      return (
                        <div key={`cm-${i}-${j}`} className="h-12 w-16 border border-white/[0.04] flex items-center justify-center font-mono text-sm"
                          style={{ background: `rgba(99,102,241,${intensity * 0.9})`, color: intensity > 0.4 ? "#fff" : "#8F8F91" }}>{v}</div>
                      );
                    })}
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Clustering */}
          {result.task === "clustering" && (
            <div className="card-surface p-6">
              <h2 className="font-display text-xl mb-4">Clusters (k = {result.k})</h2>
              <ResponsiveContainer width="100%" height={280}>
                <PieChart>
                  <Pie data={Object.entries(result.cluster_sizes).map(([k,v])=>({name:`Cluster ${k}`, value:v}))} dataKey="value" outerRadius={110} innerRadius={60}>
                    {Object.keys(result.cluster_sizes).map((label, i) => <Cell key={`cluster-${label}`} fill={CHART_COLORS[i % CHART_COLORS.length]}/>)}
                  </Pie>
                  <Tooltip {...TTIP}/>
                </PieChart>
              </ResponsiveContainer>
            </div>
          )}

          {/* Forecast */}
          {result.task === "forecasting" && (
            <div className="card-surface p-6">
              <h2 className="font-display text-xl mb-4">Forecast · next {result.horizon} steps</h2>
              <ResponsiveContainer width="100%" height={320}>
                <LineChart data={[
                  ...result.history.map((v,i)=>({ i, actual: v })),
                  ...result.forecast.map((v,i)=>({ i: result.history.length + i, forecast: v })),
                ]}>
                  <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.05)"/>
                  <XAxis dataKey="i" {...AXIS}/>
                  <YAxis {...AXIS}/>
                  <Tooltip {...TTIP}/>
                  <Line type="monotone" dataKey="actual" stroke="#818CF8" strokeWidth={2} dot={false}/>
                  <Line type="monotone" dataKey="forecast" stroke="#10B981" strokeWidth={2} strokeDasharray="4 4" dot={false}/>
                </LineChart>
              </ResponsiveContainer>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
