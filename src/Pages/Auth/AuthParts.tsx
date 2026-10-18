import type { ReactNode } from "react";

/* ---------- Icons ---------- */
const svgProps = {
  width: 17,
  height: 17,
  viewBox: "0 0 24 24",
  fill: "none",
  stroke: "currentColor",
  strokeWidth: 2,
  strokeLinecap: "round" as const,
  strokeLinejoin: "round" as const,
  "aria-hidden": true,
};

export const MailIcon = () => (
  <svg {...svgProps}>
    <rect x="2" y="4" width="20" height="16" rx="2" />
    <path d="m22 7-10 6L2 7" />
  </svg>
);
export const LockIcon = () => (
  <svg {...svgProps}>
    <rect x="3" y="11" width="18" height="11" rx="2" />
    <path d="M7 11V7a5 5 0 0 1 10 0v4" />
  </svg>
);
export const UserIcon = () => (
  <svg {...svgProps}>
    <path d="M19 21v-2a4 4 0 0 0-4-4H9a4 4 0 0 0-4 4v2" />
    <circle cx="12" cy="7" r="4" />
  </svg>
);
export const CalendarIcon = () => (
  <svg {...svgProps}>
    <rect x="3" y="4" width="18" height="18" rx="2" />
    <path d="M16 2v4M8 2v4M3 10h18" />
  </svg>
);
export const UsersIcon = () => (
  <svg {...svgProps}>
    <path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2" />
    <circle cx="9" cy="7" r="4" />
    <path d="M22 21v-2a4 4 0 0 0-3-3.87M16 3.13a4 4 0 0 1 0 7.75" />
  </svg>
);
export const EyeIcon = () => (
  <svg {...svgProps}>
    <path d="M2 12s3.5-7 10-7 10 7 10 7-3.5 7-10 7-10-7-10-7Z" />
    <circle cx="12" cy="12" r="3" />
  </svg>
);
export const EyeOffIcon = () => (
  <svg {...svgProps}>
    <path d="M17.94 17.94A10.07 10.07 0 0 1 12 19c-6.5 0-10-7-10-7a18.5 18.5 0 0 1 5.06-5.94M9.9 4.24A9.12 9.12 0 0 1 12 4c6.5 0 10 7 10 7a18.5 18.5 0 0 1-2.16 3.19M1 1l22 22" />
    <path d="M14.12 14.12a3 3 0 1 1-4.24-4.24" />
  </svg>
);
export const ChevronIcon = () => (
  <svg {...svgProps} width={15} height={15}>
    <path d="m6 9 6 6 6-6" />
  </svg>
);
export const LoginIcon = () => (
  <svg {...svgProps} width={22} height={22}>
    <path d="M15 3h4a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2h-4" />
    <path d="m10 17 5-5-5-5" />
    <path d="M15 12H3" />
  </svg>
);
export const AddUserIcon = () => (
  <svg {...svgProps} width={22} height={22}>
    <path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2" />
    <circle cx="9" cy="7" r="4" />
    <path d="M19 8v6M22 11h-6" />
  </svg>
);

/* ---------- Field ---------- */
type FieldProps = {
  id: string;
  label: string;
  icon: ReactNode;
  error?: string;
  trailing?: ReactNode;
  children: ReactNode;
};

export function Field({ id, label, icon, error, trailing, children }: FieldProps) {
  return (
    <div>
      <label htmlFor={id} className="mb-1.5 block text-sm font-medium text-slate-300">
        {label}
      </label>
      <div className="group relative">
        <span className="pointer-events-none absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-500 transition-colors group-focus-within:text-blue-400">
          {icon}
        </span>
        {children}
        {trailing}
      </div>
      {error && (
        <p role="alert" className="mt-1 text-xs text-red-400">
          {error}
        </p>
      )}
    </div>
  );
}

// text-base keeps the input at 16px, so iPhones don't zoom in when you tap it
export const inputClass = (hasError: boolean, extra = "pr-3") =>
  [
    "w-full min-h-12 rounded-xl border bg-slate-800/50 py-3 pl-11 text-base text-white placeholder-slate-500 outline-none transition-all focus:ring-2",
    hasError
      ? "border-red-500/60 focus:border-red-500 focus:ring-red-500/30"
      : "border-slate-700/70 hover:border-slate-600 focus:border-blue-500 focus:ring-blue-500/30",
    extra,
  ].join(" ");

export const toggleClass =
  "absolute right-1.5 top-1/2 -translate-y-1/2 rounded-lg p-2.5 text-slate-400 transition-colors hover:text-slate-200 focus:outline-none focus-visible:ring-2 focus-visible:ring-blue-500";

export const submitClass =
  "mt-1 flex min-h-12 w-full items-center justify-center gap-2 rounded-xl bg-gradient-to-r from-blue-600 to-violet-600 py-3 text-base font-semibold text-white shadow-lg shadow-blue-600/25 transition-all hover:from-blue-500 hover:to-violet-500 focus:outline-none focus-visible:ring-2 focus-visible:ring-blue-400 focus-visible:ring-offset-2 focus-visible:ring-offset-slate-900 active:scale-[0.99] disabled:cursor-not-allowed disabled:opacity-50";

/* ---------- Card with the animated frame ---------- */
const flow =
  "bg-[linear-gradient(90deg,#2563eb_0%,#7c3aed_25%,#06b6d4_50%,#7c3aed_75%,#2563eb_100%)] bg-[length:200%_100%]";

export function AuthShell({
  title,
  icon,
  wide = false,
  footer,
  children,
}: {
  title: string;
  icon: ReactNode;
  wide?: boolean;
  footer: ReactNode;
  children: ReactNode;
}) {
  return (
    <div className="flex min-h-[calc(100dvh-8rem)] items-center justify-center py-2">
      <div className={`relative w-full ${wide ? "max-w-2xl" : "max-w-md"}`}>
        <div
          aria-hidden="true"
          className={`absolute -inset-1 rounded-[1.75rem] blur-lg ${flow} [animation:reg-flow_10s_linear_infinite,reg-pulse_4s_ease-in-out_infinite] motion-reduce:[animation:none]`}
        />
        <div
          className={`relative rounded-3xl p-[2px] ${flow} [animation:reg-flow_10s_linear_infinite] motion-reduce:[animation:none]`}
        >
          <div className="rounded-[1.4rem] bg-slate-900 p-5 sm:p-8">
            <div className="mb-5 text-center">
              <div className="mx-auto mb-3 flex h-12 w-12 items-center justify-center rounded-xl bg-gradient-to-br from-blue-500 to-violet-600 text-white shadow-lg shadow-blue-600/30">
                {icon}
              </div>
              <h1 className="bg-gradient-to-r from-blue-400 via-violet-400 to-cyan-300 bg-clip-text text-3xl font-extrabold tracking-tight text-transparent sm:text-4xl">
                {title}
              </h1>
            </div>

            {children}

            <div className="mt-5 flex items-center gap-3 text-xs text-slate-500">
              <span className="h-px flex-1 bg-slate-800" />
              or
              <span className="h-px flex-1 bg-slate-800" />
            </div>
            <p className="mt-4 text-center text-sm text-slate-400 sm:text-base">{footer}</p>
          </div>
        </div>
      </div>
    </div>
  );
}

export function LoadingOverlay() {
  return (
    <div
      role="status"
      aria-label="Loading"
      className="fixed inset-0 z-[60] flex items-center justify-center bg-slate-950/80 backdrop-blur-sm"
    >
      <div className="h-12 w-12 animate-spin rounded-full border-4 border-slate-700 border-t-blue-500" />
    </div>
  );
}