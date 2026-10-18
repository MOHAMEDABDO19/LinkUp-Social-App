import { NavLink, useLocation, useNavigate } from "react-router-dom";
import { toast } from "react-toastify";
import {
  Bookmark,
  ChevronLeft,
  Home,
  LogOut,
  Plus,
  Settings,
  User,
  type LucideIcon,
} from "lucide-react";
import { useMe } from "../../Useme";
import Avatar from "../Avatar/avatar";
import { BrandName, LogoMark } from "../Avatar/logo";

type NavItem = { label: string; to: string; Icon: LucideIcon };

// Notifications live in the bell at the top navbar, not here.
const items: NavItem[] = [
  { label: "Home", to: "/home", Icon: Home },
  { label: "Bookmarks", to: "/bookmarks", Icon: Bookmark },
  { label: "Profile", to: "/profile", Icon: User },
  // opens my profile with the settings panel (theme + change password) already open
  { label: "Settings", to: "/profile?settings=1", Icon: Settings },
];

type SidebarProps = {
  isLoggedIn: boolean;
  collapsed: boolean;
  onToggleCollapse: () => void;
};

export default function Sidebar({ isLoggedIn, collapsed, onToggleCollapse }: SidebarProps) {
  const navigate = useNavigate();
  const { me } = useMe();
  const { search } = useLocation();

  // Profile and Settings are the same page, so tell them apart by the ?settings part
  const onSettings = search.includes("settings=1");
  const on = (to: string, isActive: boolean) =>
    to.includes("settings") ? isActive && onSettings : to === "/profile" ? isActive && !onSettings : isActive;

  // Ask before logging out (desktop button and mobile tab both use this)
  function handleLogout() {
    if (!window.confirm("Are you sure you want to log out?")) return;
    localStorage.removeItem("token");
    toast.success("Logged out successfully");
    navigate("/login");
  }

  // Go to Home and put the cursor in the "What's on your mind" box
  function handleCreatePost() {
    navigate("/home");
    setTimeout(() => document.getElementById("post-composer")?.focus(), 80);
  }

  if (!isLoggedIn) return null;

  // Text that disappears when the desktop sidebar is shrunk to icons
  const hide = collapsed ? "hidden" : "";

  return (
    <>
      {/* ---------- Desktop: full-height side panel ---------- */}
      <aside
        className={`fixed inset-y-0 left-0 z-40 hidden flex-col border-r border-white/5 bg-[#0a0b22] transition-[width] duration-300 lg:flex ${
          collapsed ? "w-20" : "w-72"
        }`}
      >
        {/* Purple wave at the bottom */}
        <svg
          aria-hidden="true"
          viewBox="0 0 288 160"
          preserveAspectRatio="none"
          className="pointer-events-none absolute inset-x-0 bottom-0 h-40 w-full"
        >
          <defs>
            <linearGradient id="sidebar-wave" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0" stopColor="#4f46e5" stopOpacity="0.28" />
              <stop offset="1" stopColor="#7c3aed" stopOpacity="0.5" />
            </linearGradient>
          </defs>
          <path
            d="M0 70 C50 20 100 110 160 85 C215 62 255 25 288 45 L288 160 L0 160 Z"
            fill="url(#sidebar-wave)"
          />
        </svg>

        <div className="relative z-10 flex h-full flex-col">
          {/* Logo */}
          <NavLink
            to="/home"
            className={`flex h-[4.5rem] shrink-0 items-center gap-3 px-6 ${
              collapsed ? "justify-center px-0" : ""
            }`}
          >
            <LogoMark className="h-10 w-10" />
            <span className={hide}>
              <BrandName className="text-2xl" />
            </span>
          </NavLink>

          {/* Links */}
          <nav className="flex-1 space-y-1.5 overflow-y-auto px-4 py-3">
            {items.map(({ label, to, Icon }) => (
              <NavLink
                key={to}
                to={to}
                title={collapsed ? label : undefined}
                className={({ isActive }) =>
                  `flex items-center gap-4 rounded-xl px-4 py-3 text-base font-medium transition-all focus:outline-none focus-visible:ring-2 focus-visible:ring-indigo-400 ${
                    collapsed ? "justify-center px-0" : ""
                  } ${
                    on(to, isActive)
                      ? "bg-gradient-to-r from-indigo-500 to-indigo-400 text-white shadow-lg shadow-indigo-500/30"
                      : "text-slate-300 hover:bg-white/5 hover:text-white"
                  }`
                }
              >
                <Icon className="h-5 w-5 shrink-0" />
                <span className={hide}>{label}</span>
              </NavLink>
            ))}
          </nav>

          {/* Bottom: user card, Create Post, footer */}
          <div className="shrink-0 px-4 pb-2">
            <div className="border-t border-white/10 pt-4">
              <div
                className={`flex items-center gap-3 px-1 ${
                  collapsed ? "flex-col gap-2 px-0" : ""
                }`}
              >
                <Avatar user={me} className="h-11 w-11" />

                <div className={`min-w-0 flex-1 ${hide}`}>
                  <p className="truncate text-sm font-semibold text-white">
                    {me?.name ?? "..."}
                  </p>
                  {me?.username && (
                    <p className="truncate text-xs text-slate-400">@{me.username}</p>
                  )}
                </div>

                <button
                  type="button"
                  onClick={handleLogout}
                  aria-label="Logout"
                  title="Logout"
                  className="rounded-lg p-2 text-slate-400 transition-colors hover:bg-red-500/10 hover:text-red-400 focus:outline-none focus-visible:ring-2 focus-visible:ring-red-500"
                >
                  <LogOut className="h-5 w-5" />
                </button>
              </div>
            </div>

            <button
              type="button"
              onClick={handleCreatePost}
              title={collapsed ? "Create Post" : undefined}
              className="mt-4 flex w-full items-center justify-center gap-2 rounded-xl bg-gradient-to-r from-indigo-600 to-violet-500 py-3 text-base font-semibold text-white shadow-lg shadow-indigo-600/30 transition-all hover:from-indigo-500 hover:to-violet-400 focus:outline-none focus-visible:ring-2 focus-visible:ring-indigo-300"
            >
              <Plus className="h-5 w-5" />
              <span className={hide}>Create Post</span>
            </button>

            <p className={`pb-3 pt-5 text-center text-xs text-indigo-300/80 ${hide}`}>
              More Friends <span className="mx-1">•</span> More Moments
            </p>
          </div>
        </div>

        {/* Handle in the middle of the edge: shrink / expand */}
        <button
          type="button"
          onClick={onToggleCollapse}
          aria-label={collapsed ? "Expand sidebar" : "Collapse sidebar"}
          title={collapsed ? "Expand sidebar" : "Collapse sidebar"}
          className="absolute left-[calc(100%-1px)] top-1/2 z-40 flex h-14 w-5 -translate-y-1/2 items-center justify-center rounded-r-xl border border-l-0 border-white/10 bg-[#0a0b22] text-slate-400 transition-colors hover:bg-[#12143a] hover:text-white focus:outline-none focus-visible:ring-2 focus-visible:ring-indigo-400"
        >
          <ChevronLeft
            className={`h-3.5 w-3.5 transition-transform duration-300 ${
              collapsed ? "rotate-180" : ""
            }`}
          />
        </button>
      </aside>

      {/* ---------- Mobile: bottom tab bar ---------- */}
      <nav
        aria-label="Main"
        className="fixed inset-x-0 bottom-0 z-40 border-t border-white/10 bg-[#0a0b22]/95 pb-[env(safe-area-inset-bottom)] backdrop-blur lg:hidden"
      >
        <ul className="mx-auto flex max-w-md items-stretch justify-around">
          {items.map(({ label, to, Icon }) => (
            <li key={to} className="flex-1">
              <NavLink
                to={to}
                className={({ isActive }) =>
                  `flex min-h-16 flex-col items-center justify-center gap-1 text-[11px] font-semibold transition-colors ${
                    on(to, isActive) ? "text-indigo-400" : "text-slate-500 active:text-slate-300"
                  }`
                }
              >
                <Icon className="h-[22px] w-[22px]" />
                {label}
              </NavLink>
            </li>
          ))}
          <li className="flex-1">
            <button
              type="button"
              onClick={handleLogout}
              className="flex min-h-16 w-full flex-col items-center justify-center gap-1 text-[11px] font-semibold text-slate-500 transition-colors active:text-red-400"
            >
              <LogOut className="h-[22px] w-[22px]" />
              Logout
            </button>
          </li>
        </ul>
      </nav>
    </>
  );
}