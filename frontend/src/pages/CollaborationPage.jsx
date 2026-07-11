import React, { useCallback, useEffect, useState } from "react";
import { api, API_URL } from "@/lib/api";
import { useAuth } from "@/lib/auth";
import { toast } from "sonner";
import { Users, Plus, Loader2, UserPlus, Trash2, Shield, Crown, Edit3, Eye } from "lucide-react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";

const ROLE_META = {
  owner:  { label: "Owner",  icon: Crown,  cls: "text-amber-300 bg-amber-500/10 border-amber-500/25" },
  admin:  { label: "Admin",  icon: Shield, cls: "text-indigo-300 bg-indigo-500/10 border-indigo-500/25" },
  editor: { label: "Editor", icon: Edit3,  cls: "text-emerald-300 bg-emerald-500/10 border-emerald-500/25" },
  viewer: { label: "Viewer", icon: Eye,    cls: "text-neutral-400 bg-white/5 border-white/10" },
};

export default function CollaborationPage() {
  const { user } = useAuth();
  const [workspaces, setWorkspaces] = useState([]);
  const [activeId, setActiveId] = useState("");
  const [newOpen, setNewOpen] = useState(false);
  const [inviteOpen, setInviteOpen] = useState(false);
  const [wsName, setWsName] = useState("");
  const [inviteEmail, setInviteEmail] = useState("");
  const [inviteRole, setInviteRole] = useState("editor");
  const [busy, setBusy] = useState(false);

  const load = useCallback(async () => {
    const { data } = await api.get("/workspaces");
    setWorkspaces(data);
    setActiveId(prev => prev || (data[0]?.workspace_id || ""));
  }, []);
  useEffect(() => { load(); }, [load]);
  const active = workspaces.find(w => w.workspace_id === activeId);

  const createWs = async () => {
    if (!wsName.trim()) return;
    setBusy(true);
    try {
      const { data } = await api.post("/workspaces", { name: wsName });
      toast.success("Workspace created");
      setWsName(""); setNewOpen(false);
      setActiveId(data.workspace_id);
      await load();
    } catch (e) { toast.error(e?.response?.data?.detail || "Failed"); }
    finally { setBusy(false); }
  };

  const invite = async () => {
    if (!inviteEmail.trim() || !active) return;
    setBusy(true);
    try {
      await api.post(`/workspaces/${active.workspace_id}/members`, { email: inviteEmail, role: inviteRole });
      toast.success("Invitation sent");
      setInviteEmail(""); setInviteOpen(false);
      await load();
    } catch (e) { toast.error(e?.response?.data?.detail || "Failed"); }
    finally { setBusy(false); }
  };

  const changeRole = async (memberId, role) => {
    try {
      await api.post(`/workspaces/${active.workspace_id}/members/${memberId}/role`, { role });
      await load();
    } catch (e) { toast.error(e?.response?.data?.detail || "Failed"); }
  };

  const removeMember = async (memberId) => {
    if (!window.confirm("Remove this member?")) return;
    try {
      await api.delete(`/workspaces/${active.workspace_id}/members/${memberId}`);
      toast.success("Removed");
      await load();
    } catch (e) { toast.error(e?.response?.data?.detail || "Failed"); }
  };

  const canManage = active && ["owner", "admin"].includes(active.role);

  return (
    <div className="space-y-8">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <div className="label-eyebrow">team collaboration</div>
          <h1 className="font-display text-4xl tracking-tighter mt-2">Bring your team into the loop.</h1>
          <p className="text-neutral-500 mt-2 text-sm">Workspaces · members · roles · comments · shared briefings.</p>
        </div>
        <button onClick={()=>setNewOpen(true)} data-testid="new-workspace-btn" className="btn-primary inline-flex items-center gap-2">
          <Plus className="h-4 w-4"/> New workspace
        </button>
      </div>

      {/* Workspace switcher */}
      <div className="flex flex-wrap gap-2">
        {workspaces.map(w => (
          <button key={w.workspace_id} onClick={()=>setActiveId(w.workspace_id)}
            data-testid={`ws-tab-${w.workspace_id}`}
            className={`text-sm px-4 py-2 rounded-full border transition-colors ${w.workspace_id === activeId ? "bg-white/[0.06] border-white/20 text-white" : "border-white/10 text-neutral-400 hover:text-white hover:bg-white/[0.03]"}`}>
            {w.name} <span className="text-xs font-mono text-neutral-500 ml-2">· {w.member_count} member{w.member_count !== 1 ? "s" : ""}</span>
          </button>
        ))}
      </div>

      {active && (
        <div className="card-surface p-6">
          <div className="flex items-center justify-between mb-6">
            <div className="flex items-center gap-3">
              <Users className="h-4 w-4 text-indigo-300" strokeWidth={1.5}/>
              <h2 className="font-display text-xl tracking-tight">{active.name}</h2>
              {(() => {
                const meta = ROLE_META[active.role] || ROLE_META.viewer;
                const Icon = meta.icon;
                return <span className={`text-[10px] font-mono px-2 py-1 rounded-full border inline-flex items-center gap-1 ${meta.cls}`}>
                  <Icon className="h-3 w-3"/> {meta.label}
                </span>;
              })()}
            </div>
            {canManage && (
              <button onClick={()=>setInviteOpen(true)} data-testid="invite-member-btn" className="btn-ghost inline-flex items-center gap-2 text-sm">
                <UserPlus className="h-4 w-4"/> Invite
              </button>
            )}
          </div>

          <div className="overflow-hidden rounded-lg border border-white/[0.06]">
            <table className="w-full text-sm">
              <thead className="text-left text-xs font-mono text-neutral-500 uppercase tracking-wider bg-white/[0.02]">
                <tr>
                  <th className="py-3 px-4">Member</th>
                  <th className="py-3 px-4">Role</th>
                  <th className="py-3 px-4">Status</th>
                  <th className="py-3 px-4"></th>
                </tr>
              </thead>
              <tbody>
                {active.members.map(m => {
                  const meta = ROLE_META[m.role] || ROLE_META.viewer;
                  const Icon = meta.icon;
                  const isMe = m.user_id === user?.user_id;
                  const canEdit = canManage && !isMe && m.role !== "owner";
                  return (
                    <tr key={m.user_id} className="border-t border-white/[0.06]" data-testid={`member-${m.user_id}`}>
                      <td className="py-3 px-4">
                        <div className="text-sm">{m.name || m.email}</div>
                        <div className="text-xs font-mono text-neutral-500 mt-0.5">{m.email}{isMe && " · you"}</div>
                      </td>
                      <td className="py-3 px-4">
                        {canEdit ? (
                          <select value={m.role} onChange={e=>changeRole(m.user_id, e.target.value)}
                            data-testid={`role-select-${m.user_id}`}
                            className="rounded-md bg-[#0D0E10] border border-white/10 px-2 py-1 text-xs font-mono focus:outline-none focus:border-indigo-500">
                            <option value="admin">Admin</option>
                            <option value="editor">Editor</option>
                            <option value="viewer">Viewer</option>
                          </select>
                        ) : (
                          <span className={`text-[10px] font-mono px-2 py-1 rounded-full border inline-flex items-center gap-1 ${meta.cls}`}>
                            <Icon className="h-3 w-3"/> {meta.label}
                          </span>
                        )}
                      </td>
                      <td className="py-3 px-4 text-xs font-mono text-neutral-500">{m.status || "active"}</td>
                      <td className="py-3 px-4 text-right">
                        {canEdit && (
                          <button onClick={()=>removeMember(m.user_id)} data-testid={`remove-${m.user_id}`}
                            className="text-neutral-500 hover:text-red-400 p-1.5 rounded-md hover:bg-white/[0.05] transition-colors">
                            <Trash2 className="h-4 w-4"/>
                          </button>
                        )}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Dialogs */}
      <Dialog open={newOpen} onOpenChange={setNewOpen}>
        <DialogContent className="bg-[#151619] border border-white/10 text-neutral-200 sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="font-display text-xl tracking-tight">Create a workspace</DialogTitle>
            <DialogDescription className="text-neutral-500 text-sm">Group teammates and share datasets, briefings and dashboards.</DialogDescription>
          </DialogHeader>
          <input value={wsName} onChange={e=>setWsName(e.target.value)} placeholder="e.g. Finance Team"
            data-testid="ws-name-input"
            className="mt-3 w-full rounded-lg bg-[#0D0E10] border border-white/10 px-3.5 py-2.5 text-sm focus:outline-none focus:border-indigo-500 transition-colors"/>
          <button onClick={createWs} disabled={busy || !wsName.trim()} data-testid="ws-create-submit"
            className="mt-3 w-full btn-primary inline-flex items-center justify-center gap-2">
            {busy ? <Loader2 className="h-4 w-4 animate-spin"/> : "Create workspace"}
          </button>
        </DialogContent>
      </Dialog>

      <Dialog open={inviteOpen} onOpenChange={setInviteOpen}>
        <DialogContent className="bg-[#151619] border border-white/10 text-neutral-200 sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="font-display text-xl tracking-tight">Invite teammate</DialogTitle>
            <DialogDescription className="text-neutral-500 text-sm">They'll receive an email invitation.</DialogDescription>
          </DialogHeader>
          <div className="mt-3 space-y-3">
            <input value={inviteEmail} onChange={e=>setInviteEmail(e.target.value)} type="email" placeholder="teammate@company.com"
              data-testid="invite-email-input"
              className="w-full rounded-lg bg-[#0D0E10] border border-white/10 px-3.5 py-2.5 text-sm focus:outline-none focus:border-indigo-500 transition-colors"/>
            <select value={inviteRole} onChange={e=>setInviteRole(e.target.value)} data-testid="invite-role-select"
              className="w-full rounded-lg bg-[#0D0E10] border border-white/10 px-3.5 py-2.5 text-sm focus:outline-none focus:border-indigo-500 transition-colors">
              <option value="admin">Admin — can manage members</option>
              <option value="editor">Editor — can create & edit</option>
              <option value="viewer">Viewer — read-only</option>
            </select>
            <button onClick={invite} disabled={busy || !inviteEmail.trim()} data-testid="invite-submit"
              className="w-full btn-primary inline-flex items-center justify-center gap-2">
              {busy ? <Loader2 className="h-4 w-4 animate-spin"/> : <><UserPlus className="h-4 w-4"/> Send invitation</>}
            </button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
