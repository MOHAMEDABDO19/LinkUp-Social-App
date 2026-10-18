import { useState } from "react";
import type { User } from "../../Pages/Types/types";

export default function Avatar({
  user,
  className = "h-10 w-10",
}: {
  user?: Partial<User> | null;
  className?: string;
}) {
  const [failed, setFailed] = useState(false);
  const initial = (user?.name?.trim()?.[0] ?? "?").toUpperCase();

  if (user?.photo && !failed) {
    return (
      <img
        src={user.photo}
        alt={user.name ?? "User"}
        onError={() => setFailed(true)}
        className={`${className} shrink-0 rounded-full object-cover ring-2 ring-white/10`}
      />
    );
  }
  return (
    <span
      aria-label={user?.name ?? "User"}
      className={`${className} flex shrink-0 items-center justify-center rounded-full bg-gradient-to-br from-blue-500 to-violet-600 text-sm font-bold text-white ring-2 ring-white/10`}
    >
      {initial}
    </span>
  );
}
