import React, { useCallback, useEffect, useRef, useState } from "react";
import { useNavigate, useParams, useSearchParams } from "react-router-dom";
import { api, API_URL } from "@/lib/api";
import { renderMarkdown } from "@/lib/markdown";
import DOMPurify from "dompurify";
import { Send, Loader2, MessageSquare, Database } from "lucide-react";

const SUGGESTIONS = [
  "Summarize this dataset and its key characteristics",
  "What are the top drivers of the target variable?",
  "Which columns need cleaning?",
  "Suggest 3 dashboards I should build",
];

export default function ChatPage() {
  const params = useParams();
  const [sp] = useSearchParams();
  const nav = useNavigate();
  const [conv, setConv] = useState(params.id || null);
  const [messages, setMessages] = useState([]);
  const [text, setText] = useState("");
  const [streaming, setStreaming] = useState(false);
  const [datasets, setDatasets] = useState([]);
  const [datasetId, setDatasetId] = useState(sp.get("dataset") || "");
  const [convList, setConvList] = useState([]);
  const [models, setModels] = useState([]);
  const [modelKey, setModelKey] = useState("claude");
  const bottomRef = useRef(null);
  const idBase = useRef(0);
  const nextId = () => (++idBase.current);
  const [msgIds, setMsgIds] = useState([]);

  const refreshList = useCallback(() => api.get("/chat/conversations").then(r => setConvList(r.data)), []);

  useEffect(() => {
    api.get("/datasets").then(r => setDatasets(r.data));
    api.get("/models").then(r => { setModels(r.data.models); setModelKey(r.data.default); });
    refreshList();
  }, [refreshList]);
  useEffect(() => {
    if (params.id) {
      api.get(`/chat/${params.id}`).then(r => { setMessages(r.data); setMsgIds(r.data.map(() => nextId())); });
      setConv(params.id);
    } else {
      setMessages([]); setMsgIds([]); setConv(null);
    }
  }, [params.id]);
  useEffect(() => { bottomRef.current?.scrollIntoView({ behavior: "smooth" }); }, [messages, streaming]);

  const send = async (msg) => {
    const message = (msg ?? text).trim();
    if (!message || streaming) return;
    setText("");
    const localMsgs = [...messages, { role: "user", content: message }];
    setMessages(localMsgs);
    setMsgIds(prev => [...prev, nextId(), nextId()]);
    setStreaming(true);
    setMessages(prev => [...prev, { role: "assistant", content: "" }]);

    const token = localStorage.getItem("datamind_token");
    try {
      const res = await fetch(`${API_URL}/chat/stream`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          ...(token ? { Authorization: `Bearer ${token}` } : {}),
        },
        credentials: "include",
        body: JSON.stringify({ message, dataset_id: datasetId || null, conversation_id: conv, model: modelKey }),
      });
      const reader = res.body.getReader();
      const decoder = new TextDecoder();
      let buffer = "";
      let assistant = "";
      let newConv = conv;
      while (true) {
        const { value, done } = await reader.read();
        if (done) break;
        buffer += decoder.decode(value, { stream: true });
        const lines = buffer.split("\n\n");
        buffer = lines.pop() || "";
        for (const l of lines) {
          if (!l.startsWith("data:")) continue;
          const j = JSON.parse(l.slice(5).trim());
          if (j.type === "conversation") {
            newConv = j.conversation_id;
            if (!conv) { setConv(newConv); window.history.replaceState(null, "", `/app/chat/${newConv}`); }
          } else if (j.type === "delta") {
            assistant += j.content;
            setMessages(prev => {
              const arr = [...prev];
              arr[arr.length - 1] = { role: "assistant", content: assistant };
              return arr;
            });
          }
        }
      }
      refreshList();
    } catch (e) {
      setMessages(prev => {
        const arr = [...prev];
        arr[arr.length - 1] = { role: "assistant", content: "*Error reaching AI. Please try again.*" };
        return arr;
      });
    } finally { setStreaming(false); }
  };

  return (
    <div className="grid grid-cols-1 lg:grid-cols-[280px_1fr] gap-6 h-[calc(100vh-140px)]">
      {/* Sidebar */}
      <aside className="card-surface p-4 flex flex-col min-h-0">
        <button onClick={() => nav("/app/chat")} data-testid="new-chat-btn"
          className="btn-primary w-full inline-flex items-center justify-center gap-2 mb-4">
          <MessageSquare className="h-4 w-4"/> New chat
        </button>
        <div className="label-eyebrow mb-2">context</div>
        <select value={datasetId} onChange={e=>setDatasetId(e.target.value)} data-testid="chat-dataset-select"
          className="w-full mb-4 rounded-md bg-[#0D0E10] border border-white/10 px-3 py-2 text-xs focus:outline-none focus:border-indigo-500 transition-colors">
          <option value="">(no dataset)</option>
          {datasets.map(d => <option key={d.dataset_id} value={d.dataset_id}>{d.name}</option>)}
        </select>
        <div className="label-eyebrow mb-2">history</div>
        <div className="flex-1 overflow-auto space-y-1 -mx-2 px-2">
          {convList.length === 0 && <div className="text-xs text-neutral-500 py-2">No conversations yet</div>}
          {convList.map(c => (
            <button key={c.conversation_id} onClick={() => nav(`/app/chat/${c.conversation_id}`)}
              className={`w-full text-left px-2 py-2 rounded-md text-xs transition-colors ${conv === c.conversation_id ? "bg-white/[0.06] text-white" : "text-neutral-400 hover:bg-white/[0.03]"}`}>
              <div className="truncate">{c.last_message?.slice(0,60) || "conversation"}</div>
              <div className="text-[10px] font-mono text-neutral-500 mt-0.5">{c.count} messages</div>
            </button>
          ))}
        </div>
      </aside>

      {/* Main chat */}
      <section className="card-surface flex flex-col min-h-0">
        <div className="p-4 border-b border-white/[0.06] flex items-center justify-between">
          <div className="flex items-center gap-2">
            <MessageSquare className="h-4 w-4 text-indigo-400"/>
            <span className="text-sm">DataMind AI</span>
            <select value={modelKey} onChange={e=>setModelKey(e.target.value)} data-testid="chat-model-select"
              className="ml-2 rounded-full bg-indigo-500/15 border border-indigo-500/25 text-indigo-200 text-[11px] font-mono px-2 py-1 focus:outline-none focus:border-indigo-400 transition-colors">
              {models.map(m => <option key={m.key} value={m.key} className="bg-[#151619] text-neutral-200">{m.label}</option>)}
            </select>
          </div>
          {datasetId && <div className="text-xs font-mono text-neutral-500 inline-flex items-center gap-1"><Database className="h-3 w-3"/> {datasets.find(d=>d.dataset_id===datasetId)?.name}</div>}
        </div>

        <div className="flex-1 overflow-auto p-6 space-y-6">
          {messages.length === 0 && (
            <div className="max-w-2xl mx-auto text-center py-16">
              <h2 className="font-display text-3xl tracking-tighter">Ask anything about your data.</h2>
              <p className="mt-3 text-neutral-500 text-sm">Attach a dataset from the sidebar for grounded answers.</p>
              <div className="mt-8 grid grid-cols-2 gap-3">
                {SUGGESTIONS.map(s => (
                  <button key={s} onClick={()=>send(s)} data-testid="chat-suggestion"
                    className="card-surface p-4 text-left text-sm hover:border-indigo-500/40 transition-colors">{s}</button>
                ))}
              </div>
            </div>
          )}
          {messages.map((m, i) => {
            const key = msgIds[i] ?? `msg-${i}`;
            return (
            <div key={key} className={m.role === "user" ? "flex justify-end" : ""}>
              <div className={`max-w-3xl ${m.role === "user" ? "bg-indigo-500/15 border border-indigo-500/25" : "bg-[#0E0F12] border border-white/[0.06]"} rounded-xl px-4 py-3`}>
                {m.role === "user" ? (
                  <p className="text-sm leading-relaxed whitespace-pre-wrap">{m.content}</p>
                ) : (
                  <div className="md-content text-sm text-neutral-200" dangerouslySetInnerHTML={{ __html: DOMPurify.sanitize(renderMarkdown(m.content || (streaming && i === messages.length - 1 ? "▋" : ""))) }}/>
                )}
              </div>
            </div>
          );})}
          <div ref={bottomRef}/>
        </div>

        <div className="p-4 border-t border-white/[0.06]">
          <form onSubmit={e => { e.preventDefault(); send(); }} className="flex gap-2">
            <input value={text} onChange={e=>setText(e.target.value)} placeholder="Ask a question…"
              data-testid="chat-input"
              className="flex-1 rounded-lg bg-[#0D0E10] border border-white/10 px-4 py-2.5 text-sm focus:outline-none focus:border-indigo-500 transition-colors"/>
            <button disabled={streaming || !text.trim()} data-testid="chat-send" className="btn-primary inline-flex items-center gap-2">
              {streaming ? <Loader2 className="h-4 w-4 animate-spin"/> : <Send className="h-4 w-4"/>}
            </button>
          </form>
        </div>
      </section>
    </div>
  );
}
