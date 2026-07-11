import React, { useEffect, useState } from "react";
import { api } from "@/lib/api";
import { useAuth } from "@/lib/auth";
import { toast } from "sonner";
import { Check, Loader2, Sparkles, ExternalLink, CircleDollarSign } from "lucide-react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";

// Load Razorpay Checkout script once
const useRazorpayScript = () => {
  const [ready, setReady] = useState(!!window.Razorpay);
  useEffect(() => {
    if (window.Razorpay) { setReady(true); return; }
    const s = document.createElement("script");
    s.src = "https://checkout.razorpay.com/v1/checkout.js";
    s.async = true;
    s.onload = () => setReady(true);
    document.body.appendChild(s);
  }, []);
  return ready;
};

const STATUS_COLOR = {
  active: "text-emerald-300 bg-emerald-500/10 border-emerald-500/25",
  authenticated: "text-emerald-300 bg-emerald-500/10 border-emerald-500/25",
  created: "text-amber-300 bg-amber-500/10 border-amber-500/25",
  pending: "text-amber-300 bg-amber-500/10 border-amber-500/25",
  cancelled: "text-neutral-400 bg-white/5 border-white/10",
  completed: "text-neutral-400 bg-white/5 border-white/10",
  halted: "text-red-300 bg-red-500/10 border-red-500/25",
};

export default function BillingPage() {
  const { user, refresh } = useAuth();
  const [plans, setPlans] = useState([]);
  const [keyId, setKeyId] = useState("");
  const [configured, setConfigured] = useState(false);
  const [current, setCurrent] = useState(null);
  const [invoices, setInvoices] = useState([]);
  const [loading, setLoading] = useState(false);
  const [cancelOpen, setCancelOpen] = useState(false);
  const rzpReady = useRazorpayScript();

  const load = async () => {
    const p = await api.get("/billing/plans").then(r => r.data);
    setPlans(p.plans); setKeyId(p.razorpay_key_id); setConfigured(p.configured);
    const sub = await api.get("/billing/subscription").then(r => r.data);
    setCurrent(sub);
    const inv = await api.get("/billing/invoices").then(r => r.data);
    setInvoices(inv.items);
  };
  useEffect(() => { load(); }, []);

  const subscribe = async (planKey) => {
    if (!rzpReady) return toast.error("Razorpay is still loading…");
    if (!configured) return toast.error("Razorpay is not configured on the server");
    setLoading(true);
    try {
      const { data } = current?.subscription && current.subscription.status === "active"
        ? await api.post("/billing/change-plan", { plan_key: planKey })
        : await api.post("/billing/subscribe", { plan_key: planKey });

      // Free downgrade shortcut
      if (data?.plan_key === "free") { toast.success("Downgraded to Free"); await refresh(); await load(); setLoading(false); return; }

      const rzp = new window.Razorpay({
        key: data.razorpay_key_id || keyId,
        subscription_id: data.subscription_id,
        name: "DataMind AI",
        description: `${planKey.charAt(0).toUpperCase() + planKey.slice(1)} — monthly subscription`,
        theme: { color: "#6366F1" },
        prefill: { email: user?.email, name: user?.name || "" },
        handler: async (resp) => {
          try {
            await api.post("/billing/verify", {
              razorpay_payment_id: resp.razorpay_payment_id,
              razorpay_subscription_id: resp.razorpay_subscription_id,
              razorpay_signature: resp.razorpay_signature,
            });
            toast.success("Payment verified — subscription active");
            await refresh(); await load();
          } catch (e) {
            toast.error(e?.response?.data?.detail || "Verification failed");
          }
        },
        modal: { ondismiss: () => setLoading(false) },
      });
      rzp.open();
    } catch (e) {
      toast.error(e?.response?.data?.detail || "Failed to start checkout");
    } finally {
      setTimeout(() => setLoading(false), 800);
    }
  };

  const cancel = async (atCycleEnd) => {
    setLoading(true);
    try {
      await api.post("/billing/cancel", { at_cycle_end: atCycleEnd });
      toast.success(atCycleEnd ? "Cancellation scheduled at end of cycle" : "Subscription cancelled");
      await refresh(); await load();
      setCancelOpen(false);
    } catch (e) {
      toast.error(e?.response?.data?.detail || "Cancel failed");
    } finally { setLoading(false); }
  };

  const currentPlan = current?.plan_key || "free";
  const sub = current?.subscription;
  const isActive = sub && ["active", "authenticated"].includes(sub.status);

  return (
    <div className="space-y-10 max-w-5xl">
      <div>
        <div className="label-eyebrow">billing</div>
        <h1 className="font-display text-4xl tracking-tighter mt-2">Plan & billing.</h1>
        <p className="text-neutral-500 mt-2">Manage your subscription, invoices, and upgrades.</p>
      </div>

      {/* Current plan card */}
      <section className="card-surface p-6" data-testid="current-plan-card">
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div>
            <div className="label-eyebrow">current plan</div>
            <div className="flex items-baseline gap-3 mt-2">
              <div className="font-display text-3xl tracking-tight">{current?.plan?.label || "Free"}</div>
              <div className="font-mono text-sm text-neutral-500">
                ₹{(current?.plan?.amount_paise || 0) / 100}<span className="text-neutral-600">/mo</span>
              </div>
            </div>
            {sub && (
              <div className="mt-3 flex items-center gap-2 text-xs font-mono">
                <span className={`px-2 py-1 rounded-full border ${STATUS_COLOR[sub.status] || "text-neutral-400 bg-white/5 border-white/10"}`}>{sub.status}</span>
                {sub.current_end && <span className="text-neutral-500">renews {new Date(sub.current_end * 1000).toLocaleDateString()}</span>}
                {sub.cancel_at_cycle_end && <span className="text-amber-300">cancels at cycle end</span>}
              </div>
            )}
          </div>
          {isActive && (
            <button onClick={()=>setCancelOpen(true)} data-testid="cancel-btn" className="btn-ghost text-sm">Cancel subscription</button>
          )}
        </div>
      </section>

      {/* Plans */}
      <section>
        <h2 className="font-display text-2xl tracking-tight mb-6">Choose a plan</h2>
        <div className="grid md:grid-cols-3 gap-6">
          {plans.map(p => {
            const isCurrent = p.key === currentPlan;
            return (
              <div key={p.key} className={`card-surface p-6 flex flex-col ${p.key === "pro" ? "ring-1 ring-indigo-500/40" : ""}`} data-testid={`plan-card-${p.key}`}>
                <div className="flex items-center justify-between">
                  <div className="label-eyebrow">{p.key === "pro" ? "recommended" : p.key === "business" ? "for teams" : "starter"}</div>
                  {isCurrent && <span className="text-[10px] font-mono px-2 py-1 rounded-full bg-indigo-500/15 text-indigo-300">current</span>}
                </div>
                <h3 className="font-display text-2xl mt-3">{p.label}</h3>
                <div className="mt-3 flex items-baseline gap-1">
                  <span className="font-display text-4xl tracking-tighter">₹{p.amount}</span>
                  <span className="text-neutral-500 text-sm">/mo</span>
                </div>
                <ul className="mt-5 space-y-2 text-sm text-neutral-300 flex-1">
                  {p.features.map(f => (
                    <li key={f} className="flex items-center gap-2"><Check className="h-4 w-4 text-emerald-400" strokeWidth={2}/> {f}</li>
                  ))}
                </ul>
                <div className="mt-6">
                  {isCurrent ? (
                    <button disabled className="btn-ghost w-full opacity-60 cursor-not-allowed">Current plan</button>
                  ) : p.key === "free" ? (
                    <button onClick={()=>subscribe("free")} disabled={loading} data-testid={`downgrade-${p.key}`} className="btn-ghost w-full">Downgrade to Free</button>
                  ) : (
                    <button onClick={()=>subscribe(p.key)} disabled={loading || !rzpReady} data-testid={`subscribe-${p.key}`}
                      className="btn-primary w-full inline-flex items-center justify-center gap-2">
                      {loading ? <Loader2 className="h-4 w-4 animate-spin"/> : <><Sparkles className="h-4 w-4"/> {isActive ? "Switch to " + p.label : "Subscribe"}</>}
                    </button>
                  )}
                </div>
              </div>
            );
          })}
        </div>
        {!configured && (
          <div className="mt-4 text-xs text-amber-300 font-mono">
            Razorpay is not configured on the server — set RAZORPAY_KEY_ID / RAZORPAY_KEY_SECRET in the backend to enable checkout.
          </div>
        )}
      </section>

      {/* Billing history */}
      <section className="card-surface p-6">
        <div className="flex items-center gap-2 mb-4">
          <CircleDollarSign className="h-4 w-4 text-indigo-300" strokeWidth={1.5}/>
          <h2 className="font-display text-xl tracking-tight">Billing history</h2>
        </div>
        {invoices.length === 0 ? (
          <div className="text-sm text-neutral-500 py-4">No billing history yet.</div>
        ) : (
          <div className="overflow-auto">
            <table className="w-full text-sm">
              <thead className="text-left text-xs font-mono text-neutral-500 uppercase tracking-wider">
                <tr>
                  <th className="py-3">Plan</th>
                  <th className="py-3">Amount</th>
                  <th className="py-3">Status</th>
                  <th className="py-3">Started</th>
                  <th className="py-3">Invoices</th>
                </tr>
              </thead>
              <tbody>
                {invoices.map(row => (
                  <tr key={row.subscription_id} className="border-t border-white/[0.06]" data-testid={`invoice-row-${row.subscription_id}`}>
                    <td className="py-3">{row.plan_label}</td>
                    <td className="py-3 font-mono">₹{row.amount}<span className="text-neutral-500">/mo</span></td>
                    <td className="py-3"><span className={`text-[10px] font-mono px-2 py-1 rounded-full border ${STATUS_COLOR[row.status] || "text-neutral-400 bg-white/5 border-white/10"}`}>{row.status}</span></td>
                    <td className="py-3 font-mono text-xs text-neutral-500">{row.created_at?.slice(0,10)}</td>
                    <td className="py-3">
                      {row.invoices?.length ? (
                        <div className="flex flex-col gap-1">
                          {row.invoices.map(inv => (
                            <a key={inv.invoice_id} href={inv.short_url} target="_blank" rel="noreferrer"
                               className="text-indigo-300 hover:text-indigo-200 inline-flex items-center gap-1 text-xs font-mono">
                              {inv.invoice_number || inv.invoice_id.slice(-8)} · ₹{inv.amount} <ExternalLink className="h-3 w-3"/>
                            </a>
                          ))}
                        </div>
                      ) : <span className="text-neutral-500 text-xs">—</span>}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>

      {/* Cancel dialog */}
      <Dialog open={cancelOpen} onOpenChange={setCancelOpen}>
        <DialogContent className="bg-[#151619] border border-white/10 text-neutral-200 sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="font-display text-xl tracking-tight">Cancel subscription</DialogTitle>
            <DialogDescription className="text-neutral-500 text-sm">
              You can keep access until the end of your current cycle or cancel immediately.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-3 mt-2">
            <button onClick={()=>cancel(true)} disabled={loading} data-testid="cancel-cycle-end"
              className="btn-ghost w-full">Cancel at end of cycle</button>
            <button onClick={()=>cancel(false)} disabled={loading} data-testid="cancel-now"
              className="btn-primary w-full">Cancel immediately</button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
