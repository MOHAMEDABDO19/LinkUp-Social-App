import { useMe } from "./Useme";

// Follow state now lives in MeProvider (one shared source for the whole app),
// so this hook only forwards to it. Prefer `useMe()` in new code.
export function useFollow() {
  const { isFollowing, toggleFollow } = useMe();
  return { isFollowing, toggleFollow };
}