import React, { useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { api } from "@/lib/api";
import { useAuth } from "@/lib/auth";
import { toast } from "sonner";

export default function AuthCallback() {
  const navigate = useNavigate();
  const { refresh } = useAuth();
  const done = React.useRef(false);

  useEffect(() => {
    if (done.current) return;
    done.current = true;
    const hash = window.location.hash;
    const m = hash.match(/session_id=([^&]+)/);
    const sessionId = m?.[1];
    const linkIntent = sessionStorage.getItem("datamind_google_link") === "1";
    sessionStorage.removeItem("datamind_google_link");

    if (!sessionId) {
      navigate("/login", { replace: true });
      return;
    }
    (async () => {
      try {
        if (linkIntent) {
          await api.post("/auth/link-google", null, { headers: { "X-Session-ID": sessionId } });
          await refresh();
          toast.success("Google account connected");
          window.history.replaceState(null, "", "/app/settings");
          navigate("/app/settings", { replace: true });
        } else {
          await api.post("/auth/google/session", null, { headers: { "X-Session-ID": sessionId } });
          await refresh();
          window.history.replaceState(null, "", "/app");
          navigate("/app", { replace: true });
        }
      } catch (e) {
        toast.error(e?.response?.data?.detail || "Google sign-in failed");
        navigate(linkIntent ? "/app/settings" : "/login", { replace: true });
      }
    })();
  }, [navigate, refresh]);

  return (
    <div className="min-h-screen flex items-center justify-center">
      <div className="text-sm font-mono text-neutral-500">Signing you in…</div>
    </div>
  );
}
