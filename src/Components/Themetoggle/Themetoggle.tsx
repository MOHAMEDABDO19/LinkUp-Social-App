import { Moon, Sun } from "lucide-react";
import { useTheme } from "../.././/Usetheam";

// Round sun / moon button for the navbar
export default function ThemeToggle({ className = "" }: { className?: string }) {
  const { theme, toggle } = useTheme();
  const light = theme === "light";
  return (
    <button
      type="button"
      onClick={toggle}
      aria-label={light ? "Switch to dark mode" : "Switch to light mode"}
      title={light ? "Dark mode" : "Light mode"}
      className={`flex h-10 w-10 items-center justify-center rounded-xl text-slate-300 transition-colors hover:bg-white/5 hover:text-white focus:outline-none focus-visible:ring-2 focus-visible:ring-indigo-400 ${className}`}
    >
      {light ? <Moon className="h-5 w-5" /> : <Sun className="h-5 w-5" />}
    </button>
  );
}