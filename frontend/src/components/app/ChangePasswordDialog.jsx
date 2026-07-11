import React, { useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { api } from "@/lib/api";
import { toast } from "sonner";
import { Loader2 } from "lucide-react";

export default function ChangePasswordDialog({ open, onOpenChange }) {
  const [current, setCurrent] = useState("");
  const [next, setNext] = useState("");
  const [next2, setNext2] = useState("");
  const [loading, setLoading] = useState(false);

  const submit = async (e) => {
    e.preventDefault();
    if (next.length < 6) return toast.error("New password must be at least 6 characters");
    if (next !== next2) return toast.error("New passwords do not match");
    setLoading(true);
    try {
      await api.post("/auth/change-password", { current_password: current, new_password: next });
      toast.success("Password updated");
      setCurrent(""); setNext(""); setNext2("");
      onOpenChange(false);
    } catch (err) {
      toast.error(err?.response?.data?.detail || "Update failed");
    } finally { setLoading(false); }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="bg-[#151619] border border-white/10 text-neutral-200 sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="font-display text-xl tracking-tight">Change password</DialogTitle>
          <DialogDescription className="text-neutral-500 text-sm">
            Enter your current password and choose a new one.
          </DialogDescription>
        </DialogHeader>
        <form onSubmit={submit} className="space-y-3 mt-2">
          <input required type="password" placeholder="Current password" value={current} onChange={e=>setCurrent(e.target.value)}
            data-testid="cp-current"
            className="w-full rounded-lg bg-[#0D0E10] border border-white/10 px-3.5 py-2.5 text-sm focus:outline-none focus:border-indigo-500 transition-colors"/>
          <input required type="password" minLength={6} placeholder="New password (min 6)" value={next} onChange={e=>setNext(e.target.value)}
            data-testid="cp-new"
            className="w-full rounded-lg bg-[#0D0E10] border border-white/10 px-3.5 py-2.5 text-sm focus:outline-none focus:border-indigo-500 transition-colors"/>
          <input required type="password" minLength={6} placeholder="Confirm new password" value={next2} onChange={e=>setNext2(e.target.value)}
            data-testid="cp-confirm"
            className="w-full rounded-lg bg-[#0D0E10] border border-white/10 px-3.5 py-2.5 text-sm focus:outline-none focus:border-indigo-500 transition-colors"/>
          <button disabled={loading} data-testid="cp-submit"
            className="w-full btn-primary inline-flex items-center justify-center gap-2 mt-2">
            {loading ? <Loader2 className="h-4 w-4 animate-spin"/> : "Update password"}
          </button>
        </form>
      </DialogContent>
    </Dialog>
  );
}
