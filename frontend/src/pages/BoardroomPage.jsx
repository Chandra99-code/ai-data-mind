import React, { useEffect, useRef, useState } from "react";
import { api, API_URL } from "@/lib/api";
import { Sparkles, Loader2, Download, FileText, FileSpreadsheet, FileType2 } from "lucide-react";
import html2pdf from "html2pdf.js";
import { toast } from "sonner";
import CommentsPanel from "@/components/app/CommentsPanel";

const ROLE_COLOR = {
  CEO: "text-indigo-300 bg-indigo-500/10 border-indigo-500/25",
  CFO: "text-emerald-300 bg-emerald-500/10 border-emerald-500/25",
  Marketing: "text-pink-300 bg-pink-500/10 border-pink-500/25",
  Sales: "text-amber-300 bg-amber-500/10 border-amber-500/25",
  Operations: "text-teal-300 bg-teal-500/10 border-teal-500/25",
  Risk: "text-red-300 bg-red-500/10 border-red-500/25",
  Forecast: "text-cyan-300 bg-cyan-500/10 border-cyan-500/25",
};

export default function BoardroomPage() {
  const [datasets, setDatasets] = useState([]);
  const [datasetId, setDatasetId] = useState("");
  const [loading, setLoading] = useState(false);
  const [data, setData] = useState(null);
  const [exporting, setExporting] = useState(false);
  const ref = useRef(null);

  useEffect(() => { api.get("/datasets").then(r => setDatasets(r.data)); }, []);

  const generate = async () => {
    if (!datasetId) return;
    setLoading(true); setData(null);
    try {
      const r = await api.post("/copilot/boardroom", { dataset_id: datasetId });
      setData(r.data);
    } finally { setLoading(false); }
  };

  const downloadPdf = async () => {
    if (!ref.current) return;
    setExporting(true);
    try {
      await html2pdf().set({
        margin: [12, 12, 12, 12],
        filename: `${(data?.title || "Boardroom").replace(/\s+/g,'_')}.pdf`,
        image: { type: "jpeg", quality: 0.95 },
        html2canvas: { scale: 2, backgroundColor: "#0D0E10", useCORS: true },
        jsPDF: { unit: "mm", format: "a4", orientation: "portrait" },
        pagebreak: { mode: ["css", "legacy"] },
      }).from(ref.current).save();
    } finally { setExporting(false); }
  };

  const downloadOffice = async (format) => {
    if (!data) return;
    setExporting(true);
    try {
      const token = localStorage.getItem("datamind_token");
      const res = await fetch(`${API_URL}/copilot/boardroom/export`, {
        method: "POST",
        headers: { "Content-Type": "application/json", ...(token ? { Authorization: `Bearer ${token}` } : {}) },
        credentials: "include",
        body: JSON.stringify({ format, data }),
      });
      if (!res.ok) throw new Error(await res.text());
      const blob = await res.blob();
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `${(data.title || "Boardroom").replace(/\s+/g,'_')}.${format}`;
      document.body.appendChild(a); a.click(); a.remove();
      URL.revokeObjectURL(url);
    } catch (err) {
      toast.error(`Export failed: ${err.message}`);
    } finally { setExporting(false); }
  };

  return (
    <div className="space-y-8">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <div className="label-eyebrow">ceo boardroom</div>
          <h1 className="font-display text-4xl tracking-tighter mt-2">Executive briefings.</h1>
          <p className="text-neutral-500 mt-2 text-sm">CEO · CFO · Marketing · Sales · Risk · Forecast — all in one document.</p>
        </div>
        {data && (
          <div className="flex gap-2">
            <button onClick={downloadPdf} disabled={exporting || !data} data-testid="board-export-pdf" className="btn-primary inline-flex items-center gap-2">
              {exporting ? <Loader2 className="h-4 w-4 animate-spin"/> : <Download className="h-4 w-4"/>} Export PDF
            </button>
            <button onClick={()=>downloadOffice("pptx")} disabled={exporting} data-testid="board-export-pptx"
              className="btn-ghost inline-flex items-center gap-2">
              <FileType2 className="h-4 w-4"/> PowerPoint
            </button>
            <button onClick={()=>downloadOffice("docx")} disabled={exporting} data-testid="board-export-word"
              className="btn-ghost inline-flex items-center gap-2">
              <FileText className="h-4 w-4"/> Word
            </button>
          </div>
        )}
        {!data && (
          <div className="flex gap-2">
            <button disabled data-testid="board-export-pdf" className="btn-primary inline-flex items-center gap-2 opacity-50 cursor-not-allowed">
              <Download className="h-4 w-4"/> Export PDF
            </button>
            <button disabled data-testid="board-export-pptx" className="btn-ghost inline-flex items-center gap-2 opacity-50 cursor-not-allowed">
              <FileType2 className="h-4 w-4"/> PowerPoint
            </button>
            <button disabled data-testid="board-export-word" className="btn-ghost inline-flex items-center gap-2 opacity-50 cursor-not-allowed">
              <FileText className="h-4 w-4"/> Word
            </button>
          </div>
        )}
      </div>

      <div className="card-surface p-5 flex flex-wrap gap-3 items-end">
        <div className="flex-1 min-w-64">
          <label className="label-eyebrow mb-2 block">dataset</label>
          <select value={datasetId} onChange={e=>setDatasetId(e.target.value)} data-testid="board-dataset"
            className="w-full rounded-md bg-[#0D0E10] border border-white/10 px-3 py-2.5 text-sm focus:outline-none focus:border-indigo-500 transition-colors">
            <option value="">— select a dataset —</option>
            {datasets.map(d => <option key={d.dataset_id} value={d.dataset_id}>{d.name}</option>)}
          </select>
        </div>
        <button onClick={generate} disabled={loading || !datasetId} data-testid="board-run"
          className="btn-primary inline-flex items-center gap-2">
          {loading ? <Loader2 className="h-4 w-4 animate-spin"/> : <Sparkles className="h-4 w-4"/>} Generate briefing
        </button>
      </div>

      {loading && <div className="text-sm text-neutral-500 font-mono">Drafting the boardroom briefing…</div>}

      {data && (
        <div ref={ref} className="bg-[#0D0E10] p-10 rounded-lg border border-white/[0.06] space-y-8">
          <div className="border-b border-white/[0.08] pb-6">
            <div className="label-eyebrow">DataMind AI · Boardroom</div>
            <h2 className="font-display text-4xl tracking-tighter mt-2">{data.title}</h2>
            <p className="text-neutral-400 mt-3 leading-relaxed">{data.summary}</p>
          </div>
          {(data.sections || []).map((s) => (
            <section key={s.role} className="space-y-3">
              <div className="flex items-center gap-3">
                <span className={`text-[10px] font-mono px-2 py-1 rounded-full border ${ROLE_COLOR[s.role] || ROLE_COLOR.CEO}`}>{s.role}</span>
                <h3 className="font-display text-xl tracking-tight">{s.headline}</h3>
              </div>
              <ul className="ml-4 space-y-1.5 text-sm text-neutral-300">
                {(s.points || []).map((p) => <li key={p}>· {p}</li>)}
              </ul>
            </section>
          ))}
          {((data.action_plan || data.actions) || []).length > 0 && (
            <section>
              <div className="label-eyebrow mb-3">action plan</div>
              <div className="rounded-lg border border-white/[0.08] overflow-hidden">
                <table className="w-full text-sm">
                  <thead className="bg-white/[0.03] text-xs font-mono uppercase tracking-wider text-neutral-500">
                    <tr>
                      <th className="text-left px-4 py-2">Owner</th>
                      <th className="text-left px-4 py-2">Action</th>
                      <th className="text-left px-4 py-2">Due</th>
                      <th className="text-left px-4 py-2">Priority</th>
                    </tr>
                  </thead>
                  <tbody>
                    {(data.action_plan || data.actions).map((a) => (
                      <tr key={a.action} className="border-t border-white/[0.06]">
                        <td className="px-4 py-2">{a.owner}</td>
                        <td className="px-4 py-2">{a.action}</td>
                        <td className="px-4 py-2 font-mono text-xs text-neutral-500">{a.due}</td>
                        <td className="px-4 py-2">
                          <span className={`text-[10px] font-mono px-2 py-0.5 rounded-full border ${a.priority === "P0" ? "text-red-300 bg-red-500/10 border-red-500/25" : a.priority === "P1" ? "text-amber-300 bg-amber-500/10 border-amber-500/25" : "text-neutral-400 bg-white/5 border-white/10"}`}>
                            {a.priority || "P2"}
                          </span>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </section>
          )}
        </div>
      )}

      {data && datasetId && (
        <CommentsPanel entityType="boardroom" entityId={`${datasetId}::latest`} title="Boardroom discussion"/>
      )}
    </div>
  );
}
