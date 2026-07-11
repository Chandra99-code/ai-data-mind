import React, { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { useAuth } from "@/lib/auth";
import { toast } from "sonner";
import { ArrowRight, Loader2 } from "lucide-react";

function GoogleButton({ label = "Continue with Google" }) {
  const handleGoogle = () => {
    // REMINDER: DO NOT HARDCODE THE URL, OR ADD ANY FALLBACKS OR REDIRECT URLS, THIS BREAKS THE AUTH
    const redirectUrl = window.location.origin + "/app";
    window.location.href = `https://auth.emergentagent.com/?redirect=${encodeURIComponent(redirectUrl)}`;
  };
  return (
    <button onClick={handleGoogle} data-testid="google-signin-btn"
      className="w-full inline-flex items-center justify-center gap-3 rounded-full border border-white/10 bg-white/[0.02] hover:bg-white/[0.05] px-4 py-2.5 text-sm text-neutral-200 transition-colors duration-200">
      <svg viewBox="0 0 24 24" className="h-4 w-4"><path fill="#fff" d="M21.35 11.1H12v3.2h5.35c-.23 1.22-1.6 3.6-5.35 3.6-3.22 0-5.85-2.67-5.85-5.9s2.63-5.9 5.85-5.9c1.83 0 3.06.78 3.76 1.45l2.56-2.47C16.75 3.7 14.6 2.8 12 2.8 6.9 2.8 2.8 6.9 2.8 12s4.1 9.2 9.2 9.2c5.31 0 8.83-3.72 8.83-8.96 0-.6-.06-1.06-.15-1.14z"/></svg>
      {label}
    </button>
  );
}

export default function Login() {
  const nav = useNavigate();
  const { login } = useAuth();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);

  const submit = async (e) => {
    e.preventDefault();
    setLoading(true);
    try {
      await login(email, password);
      toast.success("Welcome back");
      nav("/app");
    } catch (err) {
      toast.error(err?.response?.data?.detail || "Sign in failed");
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
          <div className="label-eyebrow mb-3">from analyst → action, in minutes</div>
          <p className="font-display text-3xl tracking-tight leading-tight">
            "The fastest path from raw CSV to executive summary I've ever used."
          </p>
          <p className="mt-4 text-sm text-neutral-500">Marcus Ito, Product Lead — Vantage</p>
        </div>
      </div>
      <div className="flex items-center justify-center p-8">
        <div className="w-full max-w-sm">
          <h1 className="font-display text-3xl tracking-tighter">Welcome back.</h1>
          <p className="text-sm text-neutral-500 mt-2">Sign in to your workspace.</p>

          <div className="mt-8"><GoogleButton /></div>
          <div className="flex items-center gap-3 my-6">
            <div className="flex-1 hairline" />
            <span className="text-xs font-mono text-neutral-500">or</span>
            <div className="flex-1 hairline" />
          </div>
          <form onSubmit={submit} className="space-y-3">
            <input required type="email" placeholder="Email" value={email} onChange={e=>setEmail(e.target.value)}
              data-testid="login-email"
              className="w-full rounded-lg bg-[#0D0E10] border border-white/10 px-3.5 py-2.5 text-sm focus:outline-none focus:border-indigo-500 transition-colors duration-200"/>
            <input required type="password" placeholder="Password" value={password} onChange={e=>setPassword(e.target.value)}
              data-testid="login-password"
              className="w-full rounded-lg bg-[#0D0E10] border border-white/10 px-3.5 py-2.5 text-sm focus:outline-none focus:border-indigo-500 transition-colors duration-200"/>
            <button disabled={loading} data-testid="login-submit"
              className="w-full btn-primary inline-flex items-center justify-center gap-2">
              {loading ? <Loader2 className="h-4 w-4 animate-spin"/> : <>Sign in <ArrowRight className="h-4 w-4"/></>}
            </button>
          </form>
          <p className="text-sm text-neutral-500 mt-6">
            Don't have an account? <Link to="/signup" className="text-indigo-300 hover:text-indigo-200" data-testid="login-to-signup">Create one</Link>
          </p>
        </div>
      </div>
    </div>
  );
}
