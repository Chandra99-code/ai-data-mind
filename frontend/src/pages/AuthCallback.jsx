import React, { useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { api } from "@/lib/api";
import { useAuth } from "@/lib/auth";

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
    if (!sessionId) {
      navigate("/login", { replace: true });
      return;
    }
    (async () => {
      try {
        await api.post("/auth/google/session", null, { headers: { "X-Session-ID": sessionId } });
        await refresh();
        window.history.replaceState(null, "", "/app");
        navigate("/app", { replace: true });
      } catch (e) {
        console.error(e);
        navigate("/login", { replace: true });
      }
    })();
  }, [navigate, refresh]);

  return (
    <div className="min-h-screen flex items-center justify-center">
      <div className="text-sm font-mono text-neutral-500">Signing you in…</div>
    </div>
  );
}
