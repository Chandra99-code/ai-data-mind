import React, { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { api } from "@/lib/api";
import { Database, Cloud, Sheet, Warehouse, PieChart, CheckCircle2, Clock, Zap, ExternalLink } from "lucide-react";

const CAT_ICON = { files: Database, cloud: Cloud, databases: Database, warehouse: Warehouse, bi: PieChart };
const STATUS = {
  connected: { label: "Connected", cls: "text-emerald-300 bg-emerald-500/10 border-emerald-500/25", icon: CheckCircle2 },
  connect_available: { label: "Ready", cls: "text-indigo-300 bg-indigo-500/10 border-indigo-500/25", icon: Zap },
  awaiting_credentials: { label: "Configure keys", cls: "text-amber-300 bg-amber-500/10 border-amber-500/25", icon: Clock },
  coming_soon: { label: "Coming soon", cls: "text-neutral-400 bg-white/5 border-white/10", icon: Clock },
};

export default function IntegrationsPage() {
  const [connectors, setConnectors] = useState([]);
  const [pbi, setPbi] = useState(null);

  useEffect(() => {
    api.get("/integrations").then(r => setConnectors(r.data.connectors));
    api.get("/powerbi/status").then(r => setPbi(r.data));
  }, []);

  const grouped = connectors.reduce((acc, c) => {
    (acc[c.category] = acc[c.category] || []).push(c); return acc;
  }, {});

  return (
    <div className="space-y-10">
      <div>
        <div className="label-eyebrow">integrations</div>
        <h1 className="font-display text-4xl tracking-tighter mt-2">Bring every source to DataMind.</h1>
        <p className="text-neutral-500 mt-2 text-sm">Files, databases, warehouses, and BI tools — one workspace.</p>
      </div>

      {/* Power BI hero */}
      <div className="card-surface p-6 flex flex-wrap items-center gap-6" data-testid="powerbi-hero">
        <div className="h-14 w-14 rounded-lg bg-gradient-to-br from-yellow-400/20 to-yellow-600/20 border border-yellow-500/25 flex items-center justify-center">
          <PieChart className="h-6 w-6 text-yellow-300" strokeWidth={1.5}/>
        </div>
        <div className="flex-1 min-w-64">
          <div className="label-eyebrow">microsoft power bi</div>
          <div className="font-display text-2xl tracking-tight mt-1">Power BI Copilot</div>
          <p className="text-sm text-neutral-400 mt-2 max-w-2xl">
            {pbi?.configured
              ? "Ready to connect. Sign in with your Microsoft account to browse workspaces, embed reports, and ask AI to explain dashboards."
              : "Awaiting Azure AD credentials. Once configured, connect your Microsoft account to embed Power BI reports and unlock the Copilot."}
          </p>
        </div>
        <button disabled={!pbi?.configured} data-testid="powerbi-connect"
          className={`inline-flex items-center gap-2 px-4 py-2 rounded-full text-sm font-medium transition-colors ${pbi?.configured ? "bg-white text-black hover:bg-neutral-200" : "bg-white/5 text-neutral-400 border border-white/10 cursor-not-allowed"}`}>
          {pbi?.configured ? "Connect Microsoft" : "Awaiting credentials"}
        </button>
      </div>

      {/* Groups */}
      {Object.entries(grouped).map(([cat, items]) => {
        const Icon = CAT_ICON[cat] || Database;
        return (
          <div key={cat}>
            <div className="flex items-center gap-2 mb-4">
              <Icon className="h-4 w-4 text-indigo-300" strokeWidth={1.5}/>
              <div className="label-eyebrow">{cat}</div>
            </div>
            <div className="grid md:grid-cols-3 lg:grid-cols-4 gap-4">
              {items.map(c => {
                const s = STATUS[c.status] || STATUS.coming_soon;
                const StatusIcon = s.icon;
                return (
                  <div key={c.key} className="card-surface p-5" data-testid={`connector-${c.key}`}>
                    <div className="flex items-center justify-between">
                      <div className="font-display text-lg tracking-tight">{c.label}</div>
                      <span className={`text-[10px] font-mono px-2 py-0.5 rounded-full border inline-flex items-center gap-1 ${s.cls}`}>
                        <StatusIcon className="h-3 w-3"/> {s.label}
                      </span>
                    </div>
                    <div className="text-xs text-neutral-500 font-mono mt-3">{cat}</div>
                    <div className="mt-4">
                      {c.status === "connected" ? (
                        <Link to="/app/datasets" className="text-xs text-indigo-300 hover:text-indigo-200 inline-flex items-center gap-1">
                          Use it <ExternalLink className="h-3 w-3"/>
                        </Link>
                      ) : (
                        <span className="text-xs text-neutral-500">
                          {c.status === "connect_available" ? "Sign in to connect" : c.status === "awaiting_credentials" ? "Admin: add API keys" : "On the roadmap"}
                        </span>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        );
      })}
    </div>
  );
}
