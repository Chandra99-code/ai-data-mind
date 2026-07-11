import React, { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { api } from "@/lib/api";
import { FileBarChart2, Plus, Loader2, Trash2 } from "lucide-react";
import { toast } from "sonner";

export default function ReportsPage() {
  const [reports, setReports] = useState([]);
  const [datasets, setDatasets] = useState([]);
  const [creating, setCreating] = useState(false);
  const [datasetId, setDatasetId] = useState("");
  const [title, setTitle] = useState("");

  const load = () => api.get("/reports").then(r => setReports(r.data));
  useEffect(() => { load(); api.get("/datasets").then(r => setDatasets(r.data)); }, []);

  const create = async () => {
    if (!datasetId || !title) return toast.error("Pick dataset and enter a title");
    setCreating(true);
    try {
      const eda = await api.get(`/datasets/${datasetId}/eda`).then(r => r.data);
      let insights = [];
      try { insights = (await api.get(`/datasets/${datasetId}/insights`).then(r => r.data)).insights; } catch {}
      const sections = [
        { type: "summary", data: { rows: eda.rows, cols: eda.cols, missing: Object.values(eda.missing).reduce((a,b)=>a+b,0), duplicates: eda.duplicates } },
        { type: "insights", data: { insights } },
        { type: "correlation", data: eda.correlation },
        { type: "distributions", data: eda.distributions },
      ];
      const { data } = await api.post("/reports", { dataset_id: datasetId, title, sections });
      toast.success("Report generated");
      setTitle(""); setDatasetId("");
      load();
    } catch (e) { toast.error("Report generation failed"); }
    finally { setCreating(false); }
  };

  const remove = async (id) => {
    if (!window.confirm("Delete report?")) return;
    await api.delete(`/reports/${id}`); toast.success("Deleted"); load();
  };

  return (
    <div className="space-y-8">
      <div>
        <div className="label-eyebrow">reports</div>
        <h1 className="font-display text-4xl tracking-tighter mt-2">Executive-ready briefings.</h1>
        <p className="text-neutral-500 mt-2">Generate a polished report from any dataset. Export to PDF.</p>
      </div>

      <div className="card-surface p-6">
        <h2 className="font-display text-xl mb-4">New report</h2>
        <div className="grid md:grid-cols-3 gap-4">
          <select value={datasetId} onChange={e=>setDatasetId(e.target.value)} data-testid="rep-dataset-select"
            className="rounded-md bg-[#0D0E10] border border-white/10 px-3 py-2.5 text-sm focus:outline-none focus:border-indigo-500 transition-colors">
            <option value="">— pick dataset —</option>
            {datasets.map(d => <option key={d.dataset_id} value={d.dataset_id}>{d.name}</option>)}
          </select>
          <input value={title} onChange={e=>setTitle(e.target.value)} placeholder="Report title" data-testid="rep-title-input"
            className="rounded-md bg-[#0D0E10] border border-white/10 px-3 py-2.5 text-sm focus:outline-none focus:border-indigo-500 transition-colors"/>
          <button onClick={create} disabled={creating} data-testid="rep-create-btn"
            className="btn-primary inline-flex items-center justify-center gap-2">
            {creating ? <Loader2 className="h-4 w-4 animate-spin"/> : <Plus className="h-4 w-4"/>} Generate report
          </button>
        </div>
      </div>

      <div className="card-surface p-6">
        <h2 className="font-display text-xl mb-4">Your reports</h2>
        {reports.length === 0 ? (
          <div className="text-sm text-neutral-500 py-6">No reports yet.</div>
        ) : (
          <div className="divide-y divide-white/[0.06]">
            {reports.map(r => (
              <div key={r.report_id} className="flex items-center justify-between py-3">
                <Link to={`/app/reports/${r.report_id}`} className="flex items-center gap-3 hover:text-indigo-300 transition-colors" data-testid={`report-link-${r.report_id}`}>
                  <FileBarChart2 className="h-4 w-4 text-neutral-500"/>
                  <div>
                    <div className="text-sm">{r.title}</div>
                    <div className="text-xs font-mono text-neutral-500">{new Date(r.created_at).toLocaleString()}</div>
                  </div>
                </Link>
                <button onClick={()=>remove(r.report_id)} data-testid={`delete-report-${r.report_id}`} className="text-neutral-500 hover:text-red-400 p-1.5 rounded-md hover:bg-white/[0.05] transition-colors">
                  <Trash2 className="h-4 w-4"/>
                </button>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
