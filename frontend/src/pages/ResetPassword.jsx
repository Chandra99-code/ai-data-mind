import React, { useState } from "react";
import { Link, useSearchParams, useNavigate } from "react-router-dom";
import { api } from "@/lib/api";
import { toast } from "sonner";
import { Loader2, CheckCircle2 } from "lucide-react";

export default function ResetPassword() {
  const [sp] = useSearchParams();
  const nav = useNavigate();
  const token = sp.get("token") || "";
  const [pw, setPw] = useState("");
  const [pw2, setPw2] = useState("");
  const [loading, setLoading] = useState(false);
  const [done, setDone] = useState(false);

  const submit = async (e) => {
    e.preventDefault();
    if (pw.length < 6) return toast.error("Password must be at least 6 characters");
    if (pw !== pw2) return toast.error("Passwords do not match");
    setLoading(true);
    try {
      await api.post("/auth/reset-password", { token, new_password: pw });
      setDone(true);
      setTimeout(() => nav("/login", { replace: true }), 2000);
    } catch (err) {
      toast.error(err?.response?.data?.detail || "Reset failed");
    } finally { setLoading(false); }
  };

  if (!token) {
    return (
      <div className="min-h-screen flex items-center justify-center p-6">
        <div className="card-surface p-8 max-w-sm text-center">
          <h1 className="font-display text-2xl">Missing token</h1>
          <p className="text-sm text-neutral-500 mt-2">This link is invalid. Please request a new one.</p>
          <Link to="/forgot-password" className="mt-6 inline-block btn-primary">Request new link</Link>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex items-center justify-center p-6">
      <div className="w-full max-w-sm">
        <Link to="/" className="flex items-center gap-2 mb-8">
          <div className="h-7 w-7 rounded-md" style={{ background: "linear-gradient(135deg,#6366F1,#8B5CF6)" }} />
          <span className="font-display font-bold">DataMind.ai</span>
        </Link>
        {done ? (
          <div className="card-surface p-8 text-center" data-testid="reset-done">
            <CheckCircle2 className="h-8 w-8 text-emerald-400 mx-auto" strokeWidth={1.5}/>
            <h1 className="font-display text-2xl tracking-tight mt-4">Password updated.</h1>
            <p className="text-sm text-neutral-400 mt-2">Redirecting to sign in…</p>
          </div>
        ) : (
          <>
            <h1 className="font-display text-3xl tracking-tighter">Set a new password.</h1>
            <p className="text-sm text-neutral-500 mt-2">Choose something you'll remember.</p>
            <form onSubmit={submit} className="mt-8 space-y-3">
              <input required type="password" minLength={6} placeholder="New password (min 6)" value={pw} onChange={e=>setPw(e.target.value)}
                data-testid="reset-password-input"
                className="w-full rounded-lg bg-[#0D0E10] border border-white/10 px-3.5 py-2.5 text-sm focus:outline-none focus:border-indigo-500 transition-colors"/>
              <input required type="password" minLength={6} placeholder="Confirm password" value={pw2} onChange={e=>setPw2(e.target.value)}
                data-testid="reset-password-confirm"
                className="w-full rounded-lg bg-[#0D0E10] border border-white/10 px-3.5 py-2.5 text-sm focus:outline-none focus:border-indigo-500 transition-colors"/>
              <button disabled={loading} data-testid="reset-submit"
                className="w-full btn-primary inline-flex items-center justify-center gap-2">
                {loading ? <Loader2 className="h-4 w-4 animate-spin"/> : "Update password"}
              </button>
            </form>
          </>
        )}
      </div>
    </div>
  );
}
