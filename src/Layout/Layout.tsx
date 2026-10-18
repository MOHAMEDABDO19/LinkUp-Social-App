import { useState } from "react";
import { Outlet, useLocation } from "react-router-dom";
import { ToastContainer } from "react-toastify";
import Navbar from "../Components/Navbar/Navbar";
import Sidebar from "../Components/SideBar/SideBare";
import { MeProvider } from "../Useme";

export default function Layout() {
  // Desktop: shrinking the sidebar to icons is remembered after refresh
  const [collapsed, setCollapsed] = useState(
    () => localStorage.getItem("sidebarCollapsed") === "true",
  );
  function toggleCollapse() {
    setCollapsed((prev) => {
      localStorage.setItem("sidebarCollapsed", String(!prev));
      return !prev;
    });
  }

  // Re-checked on every page change, so it updates after login / logout
  useLocation();
  const isLoggedIn = Boolean(localStorage.getItem("token"));

  return (
    <MeProvider>
      <div className="min-h-dvh bg-[#070816] text-slate-100">
        <Navbar isLoggedIn={isLoggedIn} collapsed={collapsed} />
        <Sidebar
          isLoggedIn={isLoggedIn}
          collapsed={collapsed}
          onToggleCollapse={toggleCollapse}
        />

        {/* Space for the sidebar only when it exists, and for the bottom bar on mobile */}
        <main
          className={`min-h-dvh pt-[4.5rem] transition-[padding] duration-300 ${
            isLoggedIn ? (collapsed ? "lg:pl-20" : "lg:pl-72") : ""
          }`}
        >
          <div className={`p-4 sm:p-6 lg:p-8 ${isLoggedIn ? "pb-28 lg:pb-8" : ""}`}>
            <Outlet />
          </div>
        </main>

        {/* The only toast container in the app */}
        <ToastContainer position="top-center" theme="dark" autoClose={2500} />
      </div>
    </MeProvider>
  );
}