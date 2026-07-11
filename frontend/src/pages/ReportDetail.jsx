import React, { useEffect, useRef, useState } from "react";
import { useParams, Link } from "react-router-dom";
import { api } from "@/lib/api";
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, AreaChart, Area } from "recharts";
import { Download, Loader2, ArrowLeft } from "lucide-react";
import html2pdf from "html2pdf.js";

const AXIS = { stroke: "#52525B", tick: { fill: "#8F8F91", fontSize: 11, fontFamily: "JetBrains Mono" } };
const TTIP = { contentStyle: { background: "#151619", border: "1px solid rgba(255,255,255,0.1)", borderRadius: 8, fontSize: 12 } };

export default function ReportDetail() {
  const { id } = useParams();
  const [report, setReport] = useState(null);
  const [dataset, setDataset] = useState(null);
  const [exporting, setExporting] = useState(false);
  const ref = useRef(null);

  useEffect(() => {
    api.get(`/reports/${id}`).then(async r => {
      setReport(r.data);
      if (r.data?.dataset_id) {
        try {
          const ds = await api.get(`/datasets/${r.data.dataset_id}`);
          setDataset(ds.data);
        } catch (err) {
          console.warn("dataset for report unavailable:", err?.message);
        }
      }
    });
  }, [id]);

  const download = async () => {
    if (!ref.current) return;
    setExporting(true);
    try {
      await html2pdf().set({
        margin: [12, 12, 12, 12],
        filename: `${report.title.replace(/\s+/g,'_')}.pdf`,
        image: { type: "jpeg", quality: 0.95 },
        html2canvas: { scale: 2, backgroundColor: "#0D0E10", useCORS: true },
        jsPDF: { unit: "mm", format: "a4", orientation: "portrait" },
        pagebreak: { mode: ["css", "legacy"] },
      }).from(ref.current).save();
    } finally { setExporting(false); }
  };

  if (!report) return <div className="text-sm text-neutral-500">Loading report…</div>;

  const summary = report.sections.find(s => s.type === "summary")?.data;
  const insights = report.sections.find(s => s.type === "insights")?.data?.insights || [];
  const dists = report.sections.find(s => s.type === "distributions")?.data || {};
  const corr = report.sections.find(s => s.type === "correlation")?.data;

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <Link to="/app/reports" className="text-sm text-neutral-400 hover:text-white inline-flex items-center gap-1"><ArrowLeft className="h-4 w-4"/> Back to reports</Link>
        <button onClick={download} disabled={exporting} data-testid="report-download-btn" className="btn-primary inline-flex items-center gap-2">
          {exporting ? <Loader2 className="h-4 w-4 animate-spin"/> : <Download className="h-4 w-4"/>} Export PDF
        </button>
      </div>

      <div ref={ref} className="bg-[#0D0E10] text-neutral-200 p-10 space-y-10 rounded-lg border border-white/[0.06]" data-testid="report-content">
        {/* Cover */}
        <div className="border-b border-white/[0.08] pb-8">
          <div className="label-eyebrow">DataMind AI · Executive Report</div>
          <h1 className="font-display text-4xl tracking-tighter mt-3">{report.title}</h1>
          <div className="mt-4 flex flex-wrap gap-6 text-sm text-neutral-500 font-mono">
            <span>Dataset: {dataset?.name || "—"}</span>
            <span>Generated: {new Date(report.created_at).toLocaleString()}</span>
          </div>
        </div>

        {/* Executive Summary */}
        <section>
          <h2 className="font-display text-2xl tracking-tight mb-4">Executive Summary</h2>
          <p className="text-neutral-300 leading-relaxed">
            This report summarizes the analysis of <strong>{dataset?.name || "the selected dataset"}</strong>.
            The AI examined <span className="font-mono">{summary?.rows?.toLocaleString()}</span> rows across{" "}
            <span className="font-mono">{summary?.cols}</span> columns, evaluated data quality, generated key insights,
            and identified visualizations that surface the most important patterns in the data.
          </p>
        </section>

        {/* KPIs */}
        {summary && (
          <section>
            <h2 className="font-display text-2xl tracking-tight mb-4">Data Overview</h2>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              {[
                { l: "Rows", v: summary.rows?.toLocaleString() },
                { l: "Columns", v: summary.cols },
                { l: "Missing cells", v: summary.missing?.toLocaleString() },
                { l: "Duplicates", v: summary.duplicates?.toLocaleString() },
              ].map(k => (
                <div key={k.l} className="rounded-lg border border-white/[0.08] p-5">
                  <div className="label-eyebrow">{k.l}</div>
                  <div className="font-mono text-2xl mt-2">{k.v}</div>
                </div>
              ))}
            </div>
          </section>
        )}

        {/* Insights */}
        {insights.length > 0 && (
          <section>
            <h2 className="font-display text-2xl tracking-tight mb-4">AI-generated Insights</h2>
            <div className="grid md:grid-cols-2 gap-4">
              {insights.map((it) => (
                <div key={`${it.category}-${it.title}`} className="rounded-lg border border-white/[0.08] p-5">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-mono uppercase tracking-widest text-indigo-300">{it.category}</span>
                    <span className={`text-[10px] font-mono px-2 py-0.5 rounded-full ${it.impact === "high" ? "bg-red-500/15 text-red-300" : it.impact === "medium" ? "bg-amber-500/15 text-amber-300" : "bg-emerald-500/15 text-emerald-300"}`}>{it.impact}</span>
                  </div>
                  <div className="mt-2 font-display text-lg">{it.title}</div>
                  <p className="mt-2 text-sm text-neutral-400 leading-relaxed">{it.insight}</p>
                </div>
              ))}
            </div>
          </section>
        )}

        {/* Distributions */}
        {Object.keys(dists).length > 0 && (
          <section>
            <h2 className="font-display text-2xl tracking-tight mb-4">Key Distributions</h2>
            <div className="grid md:grid-cols-2 gap-6">
              {Object.entries(dists).slice(0,4).map(([col, dist]) => {
                const data = dist.bins.slice(0,-1).map((b,i)=>({ bin: Number(b).toFixed(1), count: dist.counts[i] }));
                return (
                  <div key={col} className="rounded-lg border border-white/[0.08] p-5">
                    <div className="label-eyebrow">{col}</div>
                    <ResponsiveContainer width="100%" height={180}>
                      <AreaChart data={data}>
                        <XAxis dataKey="bin" {...AXIS}/>
                        <YAxis {...AXIS}/>
                        <Tooltip {...TTIP}/>
                        <Area type="monotone" dataKey="count" stroke="#818CF8" fill="#6366F1" fillOpacity={0.3}/>
                      </AreaChart>
                    </ResponsiveContainer>
                  </div>
                );
              })}
            </div>
          </section>
        )}

        {/* Recommendations */}
        <section>
          <h2 className="font-display text-2xl tracking-tight mb-4">Recommendations</h2>
          <ul className="space-y-2 text-neutral-300 text-sm">
            <li>· Clean missing values and duplicates using DataMind Auto-clean before downstream modeling.</li>
            <li>· Investigate the top correlated pairs identified in the correlation matrix.</li>
            <li>· Train a baseline ML model (regression or classification) from the ML Studio for the primary business KPI.</li>
            <li>· Set up forecast tracking for the highest-impact time-series metric identified in the insights.</li>
          </ul>
        </section>

        <footer className="border-t border-white/[0.08] pt-6 text-xs font-mono text-neutral-500 flex items-center justify-between">
          <span>© DataMind AI — confidential</span>
          <span>{new Date().toISOString().slice(0,10)}</span>
        </footer>
      </div>
    </div>
  );
}
