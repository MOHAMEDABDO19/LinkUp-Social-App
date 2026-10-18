import type { MouseEvent, ReactNode } from "react";
import { Link } from "react-router-dom";
import type { User } from "../../Pages/Types/types";

// Wrap a photo or a name: clicking goes to that person's profile.
// (Your own id opens your own profile too, Profile.tsx handles that.)
export default function ProfileLink({
  user,
  className = "",
  onClick,
  children,
}: {
  user?: Partial<User> | null;
  className?: string;
  onClick?: (e: MouseEvent) => void;
  children: ReactNode;
}) {
  if (!user?._id) return <span className={className}>{children}</span>;
  return (
    <Link to={`/profile/${user._id}`} onClick={onClick} className={className}>
      {children}
    </Link>
  );
}