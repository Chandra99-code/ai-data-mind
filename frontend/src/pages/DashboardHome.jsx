import React, { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { api } from "@/lib/api";
import { useAuth } from "@/lib/auth";
import { Database, MessageSquare, Sparkles, ArrowUpRight, FileBarChart2, Upload } from "lucide-react";

export default function DashboardHome() {
  const { user } = useAuth();
  const [datasets, setDatasets] = useState([]);
  const [convs, setConvs] = useState([]);
  const [reports, setReports] = useState([]);

  useEffect(() => {
    api.get("/datasets").then(r => setDatasets(r.data)).catch(()=>{});
    api.get("/chat/conversations").then(r => setConvs(r.data)).catch(()=>{});
    api.get("/reports").then(r => setReports(r.data)).catch(()=>{});
  }, []);

  const kpis = [
    { l: "Datasets", v: datasets.length, icon: Database },
    { l: "Conversations", v: convs.length, icon: MessageSquare },
    { l: "Reports", v: reports.length, icon: FileBarChart2 },
    { l: "Rows analyzed", v: datasets.reduce((s,d)=>s+(d.rows||0),0).toLocaleString(), icon: Sparkles },
  ];

  return (
    <div className="space-y-10">
      <div>
        <div className="label-eyebrow">workspace</div>
        <h1 className="font-display text-4xl tracking-tighter mt-2">Welcome, {user?.name?.split(" ")[0] || "friend"}.</h1>
        <p className="text-neutral-500 mt-2 max-w-xl">Upload a dataset to start. DataMind will explore, clean, and surface insights automatically.</p>
      </div>

      {/* KPIs */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {kpis.map(k => (
          <div key={k.l} className="card-surface p-5">
            <div className="flex items-center justify-between">
              <div className="label-eyebrow">{k.l}</div>
              <k.icon className="h-4 w-4 text-neutral-500" strokeWidth={1.5}/>
            </div>
            <div className="font-mono text-3xl mt-3">{k.v}</div>
          </div>
        ))}
      </div>

      {/* Quick actions + recent datasets */}
      <div className="grid lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2 card-surface p-6">
          <div className="flex items-center justify-between mb-5">
            <h2 className="font-display text-xl tracking-tight">Recent datasets</h2>
            <Link to="/app/datasets" className="text-xs font-mono text-neutral-400 hover:text-white inline-flex items-center gap-1" data-testid="link-all-datasets">
              View all <ArrowUpRight className="h-3 w-3"/>
            </Link>
          </div>
          {datasets.length === 0 ? (
            <Link to="/app/datasets" data-testid="empty-datasets-cta"
              className="block card-surface border-dashed p-10 text-center hover:bg-[#1C1D21] transition-colors">
              <Upload className="h-6 w-6 text-indigo-400 mx-auto" strokeWidth={1.5}/>
              <div className="mt-3 text-sm text-neutral-300">No datasets yet — drop a file to begin.</div>
            </Link>
          ) : (
            <div className="divide-y divide-white/[0.06]">
              {datasets.slice(0,6).map(d => (
                <Link key={d.dataset_id} to={`/app/datasets/${d.dataset_id}`} className="flex items-center justify-between py-3 hover:bg-white/[0.02] px-2 -mx-2 rounded-md transition-colors">
                  <div>
                    <div className="text-sm">{d.name}</div>
                    <div className="text-xs text-neutral-500 font-mono mt-0.5">{d.rows.toLocaleString()} rows × {d.cols} cols</div>
                  </div>
                  <ArrowUpRight className="h-4 w-4 text-neutral-500"/>
                </Link>
              ))}
            </div>
          )}
        </div>

        <div className="card-surface p-6">
          <h2 className="font-display text-xl tracking-tight mb-5">Quick actions</h2>
          <div className="space-y-3">
            <Link to="/app/datasets" data-testid="qa-upload" className="btn-primary w-full text-left inline-flex items-center justify-between">Upload data <Upload className="h-4 w-4"/></Link>
            <Link to="/app/chat" data-testid="qa-chat" className="btn-ghost w-full text-left inline-flex items-center justify-between">Ask the AI <MessageSquare className="h-4 w-4"/></Link>
            <Link to="/app/ml" data-testid="qa-ml" className="btn-ghost w-full text-left inline-flex items-center justify-between">Train a model <Sparkles className="h-4 w-4"/></Link>
          </div>
        </div>
      </div>

      {/* Recent chats */}
      {convs.length > 0 && (
        <div className="card-surface p-6">
          <h2 className="font-display text-xl tracking-tight mb-5">Recent conversations</h2>
          <div className="divide-y divide-white/[0.06]">
            {convs.slice(0,5).map(c => (
              <Link key={c.conversation_id} to={`/app/chat/${c.conversation_id}`} className="flex items-center justify-between py-3 hover:bg-white/[0.02] px-2 -mx-2 rounded-md">
                <div className="min-w-0 flex-1">
                  <div className="text-sm truncate">{c.last_message?.slice(0, 90) || "(no message)"}</div>
                  <div className="text-xs text-neutral-500 font-mono mt-0.5">{c.count} messages</div>
                </div>
                <ArrowUpRight className="h-4 w-4 text-neutral-500 ml-4"/>
              </Link>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
