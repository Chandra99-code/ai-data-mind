import React, { useEffect, useState } from "react";
import { Link, useSearchParams } from "react-router-dom";
import { api } from "@/lib/api";
import { CheckCircle2, XCircle, Loader2 } from "lucide-react";

export default function VerifyEmail() {
  const [sp] = useSearchParams();
  const token = sp.get("token") || "";
  const [status, setStatus] = useState("loading");
  const [message, setMessage] = useState("");

  useEffect(() => {
    if (!token) { setStatus("error"); setMessage("Missing token"); return; }
    (async () => {
      try {
        await api.post("/auth/verify-email", { token });
        setStatus("ok");
      } catch (err) {
        setStatus("error");
        setMessage(err?.response?.data?.detail || "Verification failed");
      }
    })();
  }, [token]);

  return (
    <div className="min-h-screen flex items-center justify-center p-6">
      <div className="card-surface p-10 max-w-md text-center">
        <Link to="/" className="inline-flex items-center gap-2 mb-6">
          <div className="h-7 w-7 rounded-md" style={{ background: "linear-gradient(135deg,#6366F1,#8B5CF6)" }} />
          <span className="font-display font-bold">DataMind.ai</span>
        </Link>
        {status === "loading" && (
          <div data-testid="verify-loading">
            <Loader2 className="h-8 w-8 text-indigo-400 mx-auto animate-spin" strokeWidth={1.5}/>
            <h1 className="font-display text-2xl mt-4">Verifying your email…</h1>
          </div>
        )}
        {status === "ok" && (
          <div data-testid="verify-ok">
            <CheckCircle2 className="h-10 w-10 text-emerald-400 mx-auto" strokeWidth={1.5}/>
            <h1 className="font-display text-2xl mt-4">Email verified.</h1>
            <p className="text-sm text-neutral-400 mt-3">You're all set. Enjoy full access to DataMind AI.</p>
            <Link to="/app" className="mt-6 inline-block btn-primary">Open workspace</Link>
          </div>
        )}
        {status === "error" && (
          <div data-testid="verify-error">
            <XCircle className="h-10 w-10 text-red-400 mx-auto" strokeWidth={1.5}/>
            <h1 className="font-display text-2xl mt-4">Verification failed.</h1>
            <p className="text-sm text-neutral-400 mt-3">{message}</p>
            <Link to="/login" className="mt-6 inline-block btn-ghost">Back to sign in</Link>
          </div>
        )}
      </div>
    </div>
  );
}
