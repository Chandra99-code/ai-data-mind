import React, { useCallback, useEffect, useState } from "react";
import { api } from "@/lib/api";
import { useAuth } from "@/lib/auth";
import { toast } from "sonner";
import { MessageSquare, Send, Trash2, Loader2 } from "lucide-react";

// Render body with @email mentions highlighted
function CommentBody({ body }) {
  const parts = body.split(/(@[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Za-z]{2,})/g);
  return (
    <span className="whitespace-pre-wrap break-words">
      {parts.map((p, i) =>
        p.startsWith("@") ? (
          <span key={`p${i}`} className="text-indigo-300 bg-indigo-500/10 px-1 py-0.5 rounded font-mono text-xs mx-0.5">{p}</span>
        ) : <span key={`p${i}`}>{p}</span>
      )}
    </span>
  );
}

export default function CommentsPanel({ entityType, entityId, title = "Discussion" }) {
  const { user } = useAuth();
  const [items, setItems] = useState([]);
  const [text, setText] = useState("");
  const [busy, setBusy] = useState(false);

  const load = useCallback(async () => {
    if (!entityId) return;
    const { data } = await api.get("/comments", { params: { entity_type: entityType, entity_id: entityId } });
    setItems(data);
  }, [entityType, entityId]);

  useEffect(() => { load(); }, [load]);

  const submit = async (e) => {
    e.preventDefault();
    if (!text.trim() || !entityId) return;
    setBusy(true);
    try {
      await api.post("/comments", { entity_type: entityType, entity_id: entityId, body: text });
      setText(""); await load();
    } catch (err) {
      toast.error(err?.response?.data?.detail || "Failed to post");
    } finally { setBusy(false); }
  };

  const del = async (id) => {
    if (!window.confirm("Delete this comment?")) return;
    try { await api.delete(`/comments/${id}`); await load(); }
    catch (err) { toast.error(err?.response?.data?.detail || "Failed"); }
  };

  return (
    <div className="card-surface p-6" data-testid="comments-panel">
      <div className="flex items-center gap-2 mb-4">
        <MessageSquare className="h-4 w-4 text-indigo-300" strokeWidth={1.5}/>
        <h2 className="font-display text-xl tracking-tight">{title}</h2>
        <span className="text-xs font-mono text-neutral-500">· {items.length}</span>
      </div>

      <div className="space-y-4 mb-4 max-h-96 overflow-auto">
        {items.length === 0 ? (
          <div className="text-sm text-neutral-500">No comments yet. Start the conversation.</div>
        ) : items.map(c => (
          <div key={c.comment_id} className="flex gap-3" data-testid={`comment-${c.comment_id}`}>
            {c.author_picture ? (
              <img src={c.author_picture} alt="" className="h-8 w-8 rounded-full object-cover flex-shrink-0"/>
            ) : (
              <div className="h-8 w-8 rounded-full bg-indigo-500/20 text-indigo-200 font-mono text-sm flex items-center justify-center flex-shrink-0">
                {(c.author_name || c.author_email || "?")[0].toUpperCase()}
              </div>
            )}
            <div className="flex-1 min-w-0">
              <div className="flex items-baseline gap-2">
                <span className="text-sm font-medium">{c.author_name || c.author_email}</span>
                <span className="text-[10px] font-mono text-neutral-500">{new Date(c.created_at).toLocaleString()}</span>
              </div>
              <div className="mt-1 text-sm text-neutral-200">
                <CommentBody body={c.body}/>
              </div>
              {c.mentions?.length > 0 && (
                <div className="mt-1 text-[10px] font-mono text-neutral-500">
                  mentioned: {c.mentions.join(", ")}
                </div>
              )}
            </div>
            {c.user_id === user?.user_id && (
              <button onClick={()=>del(c.comment_id)} className="text-neutral-500 hover:text-red-400 p-1.5 rounded-md hover:bg-white/[0.05] transition-colors h-8 flex-shrink-0" data-testid={`del-${c.comment_id}`}>
                <Trash2 className="h-3.5 w-3.5"/>
              </button>
            )}
          </div>
        ))}
      </div>

      <form onSubmit={submit} className="flex gap-2">
        <input value={text} onChange={e=>setText(e.target.value)}
          placeholder="Comment. Use @email@company.com to notify someone…"
          data-testid="comment-input"
          className="flex-1 rounded-lg bg-[#0D0E10] border border-white/10 px-3.5 py-2.5 text-sm focus:outline-none focus:border-indigo-500 transition-colors"/>
        <button disabled={busy || !text.trim()} data-testid="comment-submit" className="btn-primary inline-flex items-center gap-2">
          {busy ? <Loader2 className="h-4 w-4 animate-spin"/> : <Send className="h-4 w-4"/>}
        </button>
      </form>
    </div>
  );
}
