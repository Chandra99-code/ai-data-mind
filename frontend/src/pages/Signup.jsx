import React, { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { useAuth } from "@/lib/auth";
import { toast } from "sonner";
import { ArrowRight, Loader2 } from "lucide-react";

export default function Signup() {
  const nav = useNavigate();
  const { signup } = useAuth();
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);

  const submit = async (e) => {
    e.preventDefault();
    setLoading(true);
    try {
      await signup(email, password, name);
      toast.success("Workspace ready");
      nav("/app");
    } catch (err) {
      toast.error(err?.response?.data?.detail || "Signup failed");
    } finally { setLoading(false); }
  };

  const handleGoogle = () => {
    // REMINDER: DO NOT HARDCODE THE URL, OR ADD ANY FALLBACKS OR REDIRECT URLS, THIS BREAKS THE AUTH
    const redirectUrl = window.location.origin + "/app";
    window.location.href = `https://auth.emergentagent.com/?redirect=${encodeURIComponent(redirectUrl)}`;
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
          <div className="label-eyebrow mb-3">what you'll get in the next 60 seconds</div>
          <ul className="space-y-3 text-sm text-neutral-300">
            <li>— Upload any CSV or Excel file</li>
            <li>— Instant AI exploratory analysis</li>
            <li>— A senior data scientist in chat</li>
            <li>— One-click ML models and forecasts</li>
          </ul>
        </div>
      </div>
      <div className="flex items-center justify-center p-8">
        <div className="w-full max-w-sm">
          <h1 className="font-display text-3xl tracking-tighter">Create your workspace.</h1>
          <p className="text-sm text-neutral-500 mt-2">No credit card required.</p>

          <button onClick={handleGoogle} data-testid="signup-google-btn"
            className="mt-8 w-full inline-flex items-center justify-center gap-3 rounded-full border border-white/10 bg-white/[0.02] hover:bg-white/[0.05] px-4 py-2.5 text-sm text-neutral-200 transition-colors">
            <svg viewBox="0 0 24 24" className="h-4 w-4"><path fill="#fff" d="M21.35 11.1H12v3.2h5.35c-.23 1.22-1.6 3.6-5.35 3.6-3.22 0-5.85-2.67-5.85-5.9s2.63-5.9 5.85-5.9c1.83 0 3.06.78 3.76 1.45l2.56-2.47C16.75 3.7 14.6 2.8 12 2.8 6.9 2.8 2.8 6.9 2.8 12s4.1 9.2 9.2 9.2c5.31 0 8.83-3.72 8.83-8.96 0-.6-.06-1.06-.15-1.14z"/></svg>
            Continue with Google
          </button>

          <div className="flex items-center gap-3 my-6">
            <div className="flex-1 hairline" />
            <span className="text-xs font-mono text-neutral-500">or</span>
            <div className="flex-1 hairline" />
          </div>

          <form onSubmit={submit} className="space-y-3">
            <input required placeholder="Full name" value={name} onChange={e=>setName(e.target.value)}
              data-testid="signup-name"
              className="w-full rounded-lg bg-[#0D0E10] border border-white/10 px-3.5 py-2.5 text-sm focus:outline-none focus:border-indigo-500 transition-colors"/>
            <input required type="email" placeholder="Email" value={email} onChange={e=>setEmail(e.target.value)}
              data-testid="signup-email"
              className="w-full rounded-lg bg-[#0D0E10] border border-white/10 px-3.5 py-2.5 text-sm focus:outline-none focus:border-indigo-500 transition-colors"/>
            <input required type="password" minLength={6} placeholder="Password (min 6)" value={password} onChange={e=>setPassword(e.target.value)}
              data-testid="signup-password"
              className="w-full rounded-lg bg-[#0D0E10] border border-white/10 px-3.5 py-2.5 text-sm focus:outline-none focus:border-indigo-500 transition-colors"/>
            <button disabled={loading} data-testid="signup-submit"
              className="w-full btn-primary inline-flex items-center justify-center gap-2">
              {loading ? <Loader2 className="h-4 w-4 animate-spin"/> : <>Create workspace <ArrowRight className="h-4 w-4"/></>}
            </button>
          </form>
          <p className="text-sm text-neutral-500 mt-6">
            Already have an account? <Link to="/login" className="text-indigo-300 hover:text-indigo-200" data-testid="signup-to-login">Sign in</Link>
          </p>
        </div>
      </div>
    </div>
  );
}
