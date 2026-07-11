import React, { useState } from "react";
import { api } from "@/lib/api";
import { useAuth } from "@/lib/auth";
import { toast } from "sonner";
import { CheckCircle2, KeyRound, Link2, Link2Off, Mail, ShieldCheck, Loader2 } from "lucide-react";
import ChangePasswordDialog from "@/components/app/ChangePasswordDialog";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";

function SetPasswordDialog({ open, onOpenChange, onDone }) {
  const [pw, setPw] = useState("");
  const [pw2, setPw2] = useState("");
  const [loading, setLoading] = useState(false);
  const submit = async (e) => {
    e.preventDefault();
    if (pw.length < 6) return toast.error("Min 6 characters");
    if (pw !== pw2) return toast.error("Passwords don't match");
    setLoading(true);
    try {
      await api.post("/auth/set-password", { new_password: pw });
      toast.success("Password set");
      setPw(""); setPw2("");
      onOpenChange(false);
      onDone?.();
    } catch (err) {
      toast.error(err?.response?.data?.detail || "Failed");
    } finally { setLoading(false); }
  };
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="bg-[#151619] border border-white/10 text-neutral-200 sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="font-display text-xl tracking-tight">Set a password</DialogTitle>
          <DialogDescription className="text-neutral-500 text-sm">Add password sign-in to your Google account so you can log in either way.</DialogDescription>
        </DialogHeader>
        <form onSubmit={submit} className="space-y-3 mt-2">
          <input required type="password" minLength={6} placeholder="New password (min 6)" value={pw} onChange={e=>setPw(e.target.value)}
            data-testid="sp-new"
            className="w-full rounded-lg bg-[#0D0E10] border border-white/10 px-3.5 py-2.5 text-sm focus:outline-none focus:border-indigo-500 transition-colors"/>
          <input required type="password" minLength={6} placeholder="Confirm password" value={pw2} onChange={e=>setPw2(e.target.value)}
            data-testid="sp-confirm"
            className="w-full rounded-lg bg-[#0D0E10] border border-white/10 px-3.5 py-2.5 text-sm focus:outline-none focus:border-indigo-500 transition-colors"/>
          <button disabled={loading} data-testid="sp-submit"
            className="w-full btn-primary inline-flex items-center justify-center gap-2 mt-2">
            {loading ? <Loader2 className="h-4 w-4 animate-spin"/> : "Set password"}
          </button>
        </form>
      </DialogContent>
    </Dialog>
  );
}

export default function SettingsPage() {
  const { user, refresh } = useAuth();
  const [cpOpen, setCpOpen] = useState(false);
  const [spOpen, setSpOpen] = useState(false);
  const [unlinkLoading, setUnlinkLoading] = useState(false);

  if (!user) return null;

  const providers = user.providers || (user.has_password ? ["email"] : []);
  const hasGoogle = providers.includes("google");
  const hasPassword = !!user.has_password;

  const linkGoogle = () => {
    // Mark intent so AuthCallback links instead of logging in
    sessionStorage.setItem("datamind_google_link", "1");
    // REMINDER: DO NOT HARDCODE THE URL, OR ADD ANY FALLBACKS OR REDIRECT URLS, THIS BREAKS THE AUTH
    const redirectUrl = window.location.origin + "/app/settings";
    window.location.href = `https://auth.emergentagent.com/?redirect=${encodeURIComponent(redirectUrl)}`;
  };

  const unlinkGoogle = async () => {
    if (!window.confirm("Disconnect your Google account?")) return;
    setUnlinkLoading(true);
    try {
      await api.post("/auth/unlink-google");
      toast.success("Google disconnected");
      await refresh();
    } catch (err) {
      toast.error(err?.response?.data?.detail || "Failed");
    } finally { setUnlinkLoading(false); }
  };

  return (
    <div className="space-y-10 max-w-3xl">
      <div>
        <div className="label-eyebrow">settings</div>
        <h1 className="font-display text-4xl tracking-tighter mt-2">Account.</h1>
        <p className="text-neutral-500 mt-2">Manage your profile and sign-in methods.</p>
      </div>

      {/* Profile */}
      <section className="card-surface p-6">
        <h2 className="font-display text-xl tracking-tight mb-4">Profile</h2>
        <div className="flex items-center gap-4">
          {user.picture ? (
            <img src={user.picture} alt="" className="h-14 w-14 rounded-full object-cover border border-white/10"/>
          ) : (
            <div className="h-14 w-14 rounded-full flex items-center justify-center bg-indigo-500/20 text-indigo-200 font-mono text-xl border border-white/10">
              {(user.name || user.email || "?")[0].toUpperCase()}
            </div>
          )}
          <div className="flex-1">
            <div className="text-lg">{user.name || "—"}</div>
            <div className="text-sm text-neutral-500 font-mono flex items-center gap-2 mt-1">
              <Mail className="h-3.5 w-3.5"/> {user.email}
              {user.email_verified && <span className="inline-flex items-center gap-1 text-emerald-300 text-[10px] font-mono px-2 py-0.5 rounded-full bg-emerald-500/10 border border-emerald-500/20" data-testid="verified-badge">
                <CheckCircle2 className="h-3 w-3"/> verified
              </span>}
            </div>
          </div>
          {hasGoogle && (
            <span className="inline-flex items-center gap-2 rounded-full border border-indigo-500/30 bg-indigo-500/10 text-indigo-200 text-[11px] font-mono px-3 py-1.5" data-testid="google-connected-badge">
              <GoogleIcon/> Google connected
            </span>
          )}
        </div>
      </section>

      {/* Security */}
      <section className="card-surface p-6">
        <div className="flex items-center gap-2 mb-1">
          <ShieldCheck className="h-4 w-4 text-indigo-300" strokeWidth={1.5}/>
          <h2 className="font-display text-xl tracking-tight">Security</h2>
        </div>
        <p className="text-sm text-neutral-500 mb-6">Choose how you sign in. Keep at least one method active.</p>

        <div className="space-y-3">
          {/* Email/Password row */}
          <div className="rounded-lg border border-white/[0.08] p-4 flex items-center justify-between" data-testid="method-password">
            <div className="flex items-center gap-3">
              <KeyRound className="h-4 w-4 text-neutral-400" strokeWidth={1.5}/>
              <div>
                <div className="text-sm">Password</div>
                <div className="text-xs text-neutral-500 mt-0.5">
                  {hasPassword ? "Sign in with email and password." : "Not set up. Add a password for a fallback sign-in method."}
                </div>
              </div>
            </div>
            <div className="flex items-center gap-2">
              {hasPassword ? (
                <>
                  <span className="text-[10px] font-mono px-2 py-1 rounded-full bg-emerald-500/10 text-emerald-300 border border-emerald-500/20">active</span>
                  <button onClick={()=>setCpOpen(true)} data-testid="change-password-btn" className="btn-ghost text-xs px-3 py-1.5">Change</button>
                </>
              ) : (
                <button onClick={()=>setSpOpen(true)} data-testid="set-password-btn" className="btn-primary text-xs px-3 py-1.5">Set password</button>
              )}
            </div>
          </div>

          {/* Google row */}
          <div className="rounded-lg border border-white/[0.08] p-4 flex items-center justify-between" data-testid="method-google">
            <div className="flex items-center gap-3">
              <GoogleIcon/>
              <div>
                <div className="text-sm">Google</div>
                <div className="text-xs text-neutral-500 mt-0.5">
                  {hasGoogle ? "Signed in with Google connected to your account." : "Connect Google to sign in with one click."}
                </div>
              </div>
            </div>
            <div className="flex items-center gap-2">
              {hasGoogle ? (
                <>
                  <span className="text-[10px] font-mono px-2 py-1 rounded-full bg-indigo-500/10 text-indigo-300 border border-indigo-500/20">connected</span>
                  <button onClick={unlinkGoogle} disabled={unlinkLoading || !hasPassword}
                    data-testid="unlink-google-btn"
                    title={!hasPassword ? "Set a password before disconnecting Google" : ""}
                    className="btn-ghost text-xs px-3 py-1.5 inline-flex items-center gap-1 disabled:opacity-40">
                    {unlinkLoading ? <Loader2 className="h-3 w-3 animate-spin"/> : <Link2Off className="h-3 w-3"/>} Disconnect
                  </button>
                </>
              ) : (
                <button onClick={linkGoogle} data-testid="link-google-btn"
                  className="btn-primary text-xs px-3 py-1.5 inline-flex items-center gap-1">
                  <Link2 className="h-3 w-3"/> Connect Google
                </button>
              )}
            </div>
          </div>

          {!hasPassword && hasGoogle && (
            <div className="text-xs text-amber-300/80 mt-2 px-1" data-testid="password-suggestion">
              Tip: add a password so you can sign in even if Google is unavailable.
            </div>
          )}
        </div>
      </section>

      <ChangePasswordDialog open={cpOpen} onOpenChange={setCpOpen}/>
      <SetPasswordDialog open={spOpen} onOpenChange={setSpOpen} onDone={refresh}/>
    </div>
  );
}

function GoogleIcon() {
  return (
    <svg viewBox="0 0 24 24" className="h-4 w-4"><path fill="#fff" d="M21.35 11.1H12v3.2h5.35c-.23 1.22-1.6 3.6-5.35 3.6-3.22 0-5.85-2.67-5.85-5.9s2.63-5.9 5.85-5.9c1.83 0 3.06.78 3.76 1.45l2.56-2.47C16.75 3.7 14.6 2.8 12 2.8 6.9 2.8 2.8 6.9 2.8 12s4.1 9.2 9.2 9.2c5.31 0 8.83-3.72 8.83-8.96 0-.6-.06-1.06-.15-1.14z"/></svg>
  );
}
