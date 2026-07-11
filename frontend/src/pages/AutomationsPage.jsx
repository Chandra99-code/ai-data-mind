import React, { useEffect, useState } from "react";
import { api } from "@/lib/api";
import { Plus, Loader2, Trash2, Zap, Power } from "lucide-react";
import { toast } from "sonner";

const TRIGGERS = [
  { key: "weekly", label: "Every Monday" },
  { key: "revenue_drop", label: "Revenue drops > threshold" },
  { key: "churn_increase", label: "Churn increases > threshold" },
  { key: "anomaly", label: "AI detects anomaly" },
];
const ACTIONS = [
  { key: "email_report", label: "Email executive report" },
  { key: "notify", label: "In-app notification" },
  { key: "refresh_dashboard", label: "Refresh dashboards" },
];

export default function AutomationsPage() {
  const [items, setItems] = useState([]);
  const [name, setName] = useState("Weekly executive report");
  const [trigger, setTrigger] = useState("weekly");
  const [action, setAction] = useState("email_report");
  const [threshold, setThreshold] = useState(5);
  const [loading, setLoading] = useState(false);

  const load = () => api.get("/automations").then(r => setItems(r.data));
  useEffect(() => { load(); }, []);

  const create = async () => {
    setLoading(true);
    try {
      await api.post("/automations", { name, trigger, action, threshold, enabled: true });
      toast.success("Automation scheduled");
      setName("Weekly executive report"); load();
    } catch { toast.error("Failed"); }
    finally { setLoading(false); }
  };
  const toggle = async (id) => { await api.post(`/automations/${id}/toggle`); load(); };
  const del = async (id) => { await api.delete(`/automations/${id}`); load(); };

  return (
    <div className="space-y-8">
      <div>
        <div className="label-eyebrow">automations</div>
        <h1 className="font-display text-4xl tracking-tighter mt-2">Set it and forget it.</h1>
        <p className="text-neutral-500 mt-2 text-sm">Emails, alerts, dashboard refreshes — scheduled or triggered.</p>
        <div className="mt-3 inline-flex items-center gap-2 text-[11px] font-mono px-2 py-1 rounded-full bg-amber-500/10 text-amber-300 border border-amber-500/25">
          <Zap className="h-3 w-3"/> Delivery execution: coming soon (rules save now, workers will pick them up).
        </div>
      </div>

      <div className="card-surface p-6">
        <h2 className="font-display text-xl tracking-tight mb-4">New automation</h2>
        <div className="grid md:grid-cols-4 gap-3">
          <input value={name} onChange={e=>setName(e.target.value)} placeholder="Name" data-testid="auto-name"
            className="rounded-md bg-[#0D0E10] border border-white/10 px-3 py-2.5 text-sm focus:outline-none focus:border-indigo-500"/>
          <select value={trigger} onChange={e=>setTrigger(e.target.value)} data-testid="auto-trigger"
            className="rounded-md bg-[#0D0E10] border border-white/10 px-3 py-2.5 text-sm focus:outline-none focus:border-indigo-500">
            {TRIGGERS.map(t => <option key={t.key} value={t.key}>{t.label}</option>)}
          </select>
          <select value={action} onChange={e=>setAction(e.target.value)} data-testid="auto-action"
            className="rounded-md bg-[#0D0E10] border border-white/10 px-3 py-2.5 text-sm focus:outline-none focus:border-indigo-500">
            {ACTIONS.map(a => <option key={a.key} value={a.key}>{a.label}</option>)}
          </select>
          <button onClick={create} disabled={loading} data-testid="auto-create" className="btn-primary inline-flex items-center justify-center gap-2">
            {loading ? <Loader2 className="h-4 w-4 animate-spin"/> : <Plus className="h-4 w-4"/>} Create
          </button>
        </div>
        {(trigger === "revenue_drop" || trigger === "churn_increase") && (
          <div className="mt-3">
            <label className="label-eyebrow mb-2 block">threshold (%)</label>
            <input type="number" value={threshold} onChange={e=>setThreshold(Number(e.target.value))}
              className="rounded-md bg-[#0D0E10] border border-white/10 px-3 py-2 text-sm w-32 focus:outline-none focus:border-indigo-500"/>
          </div>
        )}
      </div>

      <div className="card-surface p-6">
        <h2 className="font-display text-xl tracking-tight mb-4">Your rules</h2>
        {items.length === 0 ? (
          <div className="text-sm text-neutral-500 py-6">No automations yet.</div>
        ) : (
          <div className="divide-y divide-white/[0.06]">
            {items.map(a => (
              <div key={a.automation_id} className="flex items-center justify-between py-3">
                <div>
                  <div className="text-sm">{a.name}</div>
                  <div className="text-xs font-mono text-neutral-500 mt-0.5">
                    {TRIGGERS.find(t=>t.key===a.trigger)?.label || a.trigger} · {ACTIONS.find(x=>x.key===a.action)?.label || a.action} · {a.status}
                  </div>
                </div>
                <div className="flex gap-1">
                  <button onClick={()=>toggle(a.automation_id)} title={a.enabled ? "Pause" : "Resume"}
                    className={`p-1.5 rounded-md hover:bg-white/[0.05] transition-colors ${a.enabled ? "text-emerald-400" : "text-neutral-500"}`}>
                    <Power className="h-4 w-4" strokeWidth={1.5}/>
                  </button>
                  <button onClick={()=>del(a.automation_id)} className="text-neutral-500 hover:text-red-400 p-1.5 rounded-md hover:bg-white/[0.05] transition-colors">
                    <Trash2 className="h-4 w-4" strokeWidth={1.5}/>
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
