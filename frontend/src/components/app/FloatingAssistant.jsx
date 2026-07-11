import React, { useEffect, useState } from "react";
import { Link, useLocation } from "react-router-dom";
import { MessageSquare, Sparkles } from "lucide-react";

// Small floating button that opens a link to the full chat page — hidden on chat page itself
export default function FloatingAssistant() {
  const location = useLocation();
  const [visible, setVisible] = useState(true);
  useEffect(() => { setVisible(!location.pathname.startsWith("/app/chat")); }, [location.pathname]);
  if (!visible) return null;
  return (
    <Link to="/app/chat" data-testid="floating-assistant"
      className="fixed bottom-6 right-6 z-40 group inline-flex items-center gap-2 rounded-full bg-white text-black px-4 py-3 shadow-[0_16px_48px_rgba(99,102,241,0.35)] hover:bg-neutral-100 transition-colors">
      <span className="relative flex h-2.5 w-2.5">
        <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-indigo-400 opacity-60"/>
        <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-indigo-500"/>
      </span>
      <Sparkles className="h-4 w-4"/>
      <span className="text-sm font-medium hidden md:inline">Ask DataMind</span>
    </Link>
  );
}
