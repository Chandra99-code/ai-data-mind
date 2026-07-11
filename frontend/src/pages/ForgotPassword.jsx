import React, { useState } from "react";
import { Link } from "react-router-dom";
import { api } from "@/lib/api";
import { toast } from "sonner";
import { ArrowRight, Loader2, MailCheck } from "lucide-react";

export default function ForgotPassword() {
  const [email, setEmail] = useState("");
  const [loading, setLoading] = useState(false);
  const [sent, setSent] = useState(false);

  const submit = async (e) => {
    e.preventDefault();
    setLoading(true);
    try {
      await api.post("/auth/forgot-password", { email });
      setSent(true);
    } catch (err) {
      toast.error(err?.response?.data?.detail || "Failed");
    } finally { setLoading(false); }
  };

  return (
    <div className="min-h-screen grid md:grid-cols-2">
      <div className="relative hidden md:flex flex-col justify-between p-10 border-r border-white/[0.06] overflow-hidden">
        <div className="brand-glow absolute -top-20 -left-20 h-[400px] w-[400px]" />
        <Link to="/" className="flex items-center gap-2 relative z-10">
          <div className="h-7 w-7 rounded-md" style={{ background: "linear-gradient(135deg,#6366F1,#8B5CF6)" }} />
          <span className="font-display font-bold">DataMind.ai</span>
        </Link>
        <div className="relative z-10">
          <div className="label-eyebrow mb-3">password reset</div>
          <p className="font-display text-2xl tracking-tight leading-tight">
            We'll email you a secure link to set a new password.
          </p>
        </div>
      </div>
      <div className="flex items-center justify-center p-8">
        <div className="w-full max-w-sm">
          {sent ? (
            <div className="card-surface p-8 text-center" data-testid="forgot-sent">
              <MailCheck className="h-8 w-8 text-emerald-400 mx-auto" strokeWidth={1.5}/>
              <h1 className="font-display text-2xl tracking-tight mt-4">Check your inbox.</h1>
              <p className="text-sm text-neutral-400 mt-3">
                If an account exists for <span className="font-mono text-neutral-200">{email}</span>, we've sent a password reset link. It expires in 1 hour.
              </p>
              <Link to="/login" className="mt-6 inline-block btn-ghost">Back to sign in</Link>
            </div>
          ) : (
            <>
              <h1 className="font-display text-3xl tracking-tighter">Forgot password?</h1>
              <p className="text-sm text-neutral-500 mt-2">Enter your email and we'll send you a reset link.</p>
              <form onSubmit={submit} className="mt-8 space-y-3">
                <input required type="email" placeholder="Email" value={email} onChange={e=>setEmail(e.target.value)}
                  data-testid="forgot-email"
                  className="w-full rounded-lg bg-[#0D0E10] border border-white/10 px-3.5 py-2.5 text-sm focus:outline-none focus:border-indigo-500 transition-colors"/>
                <button disabled={loading} data-testid="forgot-submit"
                  className="w-full btn-primary inline-flex items-center justify-center gap-2">
                  {loading ? <Loader2 className="h-4 w-4 animate-spin"/> : <>Send reset link <ArrowRight className="h-4 w-4"/></>}
                </button>
              </form>
              <p className="text-sm text-neutral-500 mt-6">
                Remembered? <Link to="/login" className="text-indigo-300 hover:text-indigo-200">Sign in</Link>
              </p>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
