import { useEffect, useRef, useState } from "react";
import { Link, NavLink, useNavigate } from "react-router-dom";
import { toast } from "react-toastify";
import { Bookmark, ChevronDown, LogOut, Moon, Sun, User } from "lucide-react";
import { useMe } from "../../Useme";
import { useTheme } from "../../Usethem";
import Avatar from "../Avatar/avatar";
import { BrandName, LogoMark } from "../Avatar/logo";
import NotificationBell from "../Notificationbell/Notificationbell";

type Props = { isLoggedIn: boolean; collapsed: boolean };

const iconBtn =
  "flex h-10 w-10 items-center justify-center rounded-xl text-slate-300 transition-colors hover:bg-white/5 hover:text-white focus:outline-none focus-visible:ring-2 focus-visible:ring-indigo-400";

// Top bar: app name, theme switch, notifications bell, and the profile photo.
// No search. The photo's arrow + menu exist on mobile only.
export default function Navbar({ isLoggedIn, collapsed }: Props) {
  const navigate = useNavigate();
  const { me } = useMe();
  const { theme, toggle } = useTheme();
  const light = theme === "light";

  const [menuOpen, setMenuOpen] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);

  // Close the mobile menu on outside tap / Escape
  useEffect(() => {
    if (!menuOpen) return;
    const onDown = (e: MouseEvent | TouchEvent) => {
      if (menuRef.current && !menuRef.current.contains(e.target as Node))
        setMenuOpen(false);
    };
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") setMenuOpen(false);
    };
    document.addEventListener("mousedown", onDown);
    document.addEventListener("touchstart", onDown);
    document.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("mousedown", onDown);
      document.removeEventListener("touchstart", onDown);
      document.removeEventListener("keydown", onKey);
    };
  }, [menuOpen]);

  function handleLogout() {
    setMenuOpen(false);
    localStorage.removeItem("token");
    toast.success("Logged out successfully");
    navigate("/login");
  }

  const themeButton = (
    <button
      type="button"
      onClick={toggle}
      aria-label={light ? "Switch to dark mode" : "Switch to light mode"}
      title={light ? "Dark mode" : "Light mode"}
      className={iconBtn}
    >
      {light ? <Moon className="h-5 w-5" /> : <Sun className="h-5 w-5" />}
    </button>
  );

  const menuItem =
    "flex w-full items-center gap-3 px-4 py-3 text-left text-sm font-medium text-slate-200 hover:bg-white/5";

  return (
    <header
      className={`fixed inset-x-0 top-0 z-30 h-[4.5rem] border-b border-white/5 bg-[#0a0b22]/95 backdrop-blur transition-[padding] duration-300 ${
        isLoggedIn ? (collapsed ? "lg:pl-20" : "lg:pl-72") : ""
      }`}
    >
      <div className="flex h-full items-center justify-between gap-3 px-4 sm:px-6 lg:px-8">
        {/* App name: always on mobile; on desktop the sidebar already shows it */}
        <NavLink
          to={isLoggedIn ? "/home" : "/login"}
          className={`flex items-center gap-2.5 ${isLoggedIn ? "lg:invisible" : ""}`}
        >
          <LogoMark className="h-10 w-10" />
          <BrandName className="text-xl sm:text-2xl" />
        </NavLink>

        <div className="flex items-center gap-1.5 sm:gap-2">
          {themeButton}

          {isLoggedIn ? (
            <>
              {/* Saved posts */}
              <NavLink
                to="/bookmarks"
                aria-label="Bookmarks"
                title="Bookmarks"
                className={({ isActive }) =>
                  `${iconBtn} ${isActive ? "bg-white/5 text-indigo-400" : ""}`
                }
              >
                <Bookmark className="h-5 w-5" />
              </NavLink>

              <NotificationBell />

              {/* Desktop: plain photo, opens my profile (no arrow) */}
              <Link
                to="/profile"
                aria-label="My profile"
                className="ml-1 hidden rounded-full lg:block"
              >
                <Avatar user={me} className="h-10 w-10" />
              </Link>

              {/* Mobile: photo + arrow, opens a menu */}
              <div className="relative lg:hidden" ref={menuRef}>
                <button
                  type="button"
                  onClick={() => setMenuOpen((o) => !o)}
                  aria-label="Account menu"
                  aria-expanded={menuOpen}
                  className="flex items-center gap-1 rounded-full py-1 pl-1 pr-1.5 hover:bg-white/5"
                >
                  <Avatar user={me} className="h-9 w-9" />
                  <ChevronDown
                    className={`h-4 w-4 text-slate-400 transition-transform ${menuOpen ? "rotate-180" : ""}`}
                  />
                </button>

                {menuOpen && (
                  <div className="absolute right-0 top-full z-50 mt-2 w-60 overflow-hidden rounded-2xl border border-white/10 bg-[#12143a] shadow-2xl">
                    <div className="flex items-center gap-3 border-b border-white/10 px-4 py-3">
                      <Avatar user={me} className="h-10 w-10" />
                      <div className="min-w-0">
                        <p className="truncate text-sm font-semibold text-white">
                          {me?.name ?? "..."}
                        </p>
                        {me?.username && (
                          <p className="truncate text-xs text-slate-400">
                            @{me.username}
                          </p>
                        )}
                      </div>
                    </div>

                    <Link
                      to="/profile"
                      onClick={() => setMenuOpen(false)}
                      className={menuItem}
                    >
                      <User className="h-4 w-4" /> My profile
                    </Link>
                    <Link
                      to="/bookmarks"
                      onClick={() => setMenuOpen(false)}
                      className={menuItem}
                    >
                      <Bookmark className="h-4 w-4" /> Bookmarks
                    </Link>
                    <button type="button" onClick={toggle} className={menuItem}>
                      {light ? (
                        <Moon className="h-4 w-4" />
                      ) : (
                        <Sun className="h-4 w-4" />
                      )}
                      {light ? "Dark mode" : "Light mode"}
                    </button>
                    <button
                      type="button"
                      onClick={handleLogout}
                      className={`${menuItem} border-t border-white/10 text-red-400 hover:bg-red-500/10`}
                    >
                      <LogOut className="h-4 w-4" /> Logout
                    </button>
                  </div>
                )}
              </div>
            </>
          ) : (
            <>
              <Link
                to="/login"
                className="rounded-xl px-4 py-2 text-sm font-semibold text-slate-300 hover:bg-white/5 hover:text-white"
              >
                Login
              </Link>
              <Link
                to="/register"
                className="rounded-xl bg-indigo-500 px-4 py-2 text-sm font-semibold text-white hover:bg-indigo-400"
              >
                Register
              </Link>
            </>
          )}
        </div>
      </div>
    </header>
  );
}
