import React, { useState } from "react";
import { Link, NavLink, Outlet, useNavigate } from "react-router-dom";
import { useAuth } from "@/lib/auth";
import { Home, Database, MessageSquare, Sparkles, FileBarChart2, LogOut, Bell, KeyRound, Settings } from "lucide-react";
import ChangePasswordDialog from "@/components/app/ChangePasswordDialog";
import { DropdownMenu, DropdownMenuTrigger, DropdownMenuContent, DropdownMenuItem, DropdownMenuSeparator } from "@/components/ui/dropdown-menu";

const nav = [
  { to: "/app", icon: Home, label: "Overview", end: true, testid: "nav-overview" },
  { to: "/app/datasets", icon: Database, label: "Datasets", testid: "nav-datasets" },
  { to: "/app/chat", icon: MessageSquare, label: "AI Chat", testid: "nav-chat" },
  { to: "/app/ml", icon: Sparkles, label: "ML Studio", testid: "nav-ml" },
  { to: "/app/reports", icon: FileBarChart2, label: "Reports", testid: "nav-reports" },
];

export default function DashboardLayout() {
  const { user, logout } = useAuth();
  const nav_ = useNavigate();
  const [cpOpen, setCpOpen] = useState(false);

  const doLogout = async () => { await logout(); nav_("/", { replace: true }); };

  return (
    <div className="min-h-screen grid" style={{ gridTemplateColumns: "260px 1fr" }}>
      {/* Sidebar */}
      <aside className="border-r border-white/[0.06] bg-[#08090A] flex flex-col">
        <Link to="/app" className="flex items-center gap-2 px-6 py-5 border-b border-white/[0.06]">
          <div className="h-7 w-7 rounded-md" style={{ background: "linear-gradient(135deg,#6366F1,#8B5CF6)" }} />
          <span className="font-display font-bold">DataMind.ai</span>
        </Link>
        <nav className="flex-1 p-3 space-y-1">
          {nav.map(item => (
            <NavLink key={item.to} to={item.to} end={item.end} data-testid={item.testid}
              className={({ isActive }) =>
                `flex items-center gap-3 px-3 py-2 rounded-md text-sm transition-colors duration-200 ${
                  isActive ? "bg-white/[0.06] text-white" : "text-neutral-400 hover:text-white hover:bg-white/[0.03]"
                }`}>
              <item.icon className="h-4 w-4" strokeWidth={1.5} />
              {item.label}
            </NavLink>
          ))}
        </nav>
        <div className="p-3 border-t border-white/[0.06]">
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <button className="w-full flex items-center gap-3 px-2 py-2 rounded-md hover:bg-white/[0.03] transition-colors" data-testid="user-menu-btn">
                {user?.picture ? (
                  <img src={user.picture} alt="" className="h-8 w-8 rounded-full object-cover"/>
                ) : (
                  <div className="h-8 w-8 rounded-full flex items-center justify-center bg-indigo-500/20 text-indigo-200 font-mono text-sm">
                    {(user?.name || user?.email || "?")[0].toUpperCase()}
                  </div>
                )}
                <div className="flex-1 min-w-0 text-left">
                  <div className="text-sm truncate">{user?.name || "User"}</div>
                  <div className="text-xs text-neutral-500 truncate">{user?.email}</div>
                </div>
              </button>
            </DropdownMenuTrigger>
            <DropdownMenuContent side="top" align="end" className="bg-[#151619] border border-white/10 text-neutral-200 w-56">
              <DropdownMenuItem onClick={()=>nav_("/app/settings")} data-testid="menu-settings" className="cursor-pointer focus:bg-white/5">
                <Settings className="h-4 w-4 mr-2" strokeWidth={1.5}/> Account settings
              </DropdownMenuItem>
              <DropdownMenuItem onClick={()=>setCpOpen(true)} data-testid="menu-change-password" className="cursor-pointer focus:bg-white/5">
                <KeyRound className="h-4 w-4 mr-2" strokeWidth={1.5}/> Change password
              </DropdownMenuItem>
              <DropdownMenuSeparator className="bg-white/10"/>
              <DropdownMenuItem onClick={doLogout} data-testid="menu-logout" className="cursor-pointer focus:bg-white/5 text-red-300 focus:text-red-200">
                <LogOut className="h-4 w-4 mr-2" strokeWidth={1.5}/> Sign out
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </aside>

      <ChangePasswordDialog open={cpOpen} onOpenChange={setCpOpen}/>

      {/* Main */}
      <main className="min-w-0">
        <div className="glass sticky top-0 z-30 border-b border-white/[0.06]">
          <div className="flex items-center justify-between px-8 py-3">
            <div className="text-xs font-mono text-neutral-500">workspace / {user?.name?.toLowerCase().replace(/\s+/g,'-') || "personal"}</div>
            <div className="flex items-center gap-2">
              <button className="p-2 rounded-md hover:bg-white/[0.05] transition-colors" data-testid="notifications-btn">
                <Bell className="h-4 w-4 text-neutral-400" strokeWidth={1.5} />
              </button>
            </div>
          </div>
        </div>
        <div className="p-8">
          <Outlet />
        </div>
      </main>
    </div>
  );
}
