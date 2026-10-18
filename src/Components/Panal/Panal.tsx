import { useEffect, useRef, useState } from "react";
import { Flame } from "lucide-react";
import { api, endpoints, extractList } from "../../../Api";
import { useMe } from "../../Useme";
import Avatar from "../Avatar/avatar";
import ProfileLink from "../LinkProfile/LinkProfile";
import type { User } from "../../Pages/Types/types";

const card = "rounded-2xl border border-indigo-500/10 bg-[#0d0f2b] p-5";

type Props = {
  trending: { tag: string; count: number }[];
};

export default function RightPanel({ trending }: Props) {
  const { me, meId, isFollowing, toggleFollow } = useMe();
  const [suggestions, setSuggestions] = useState<User[]>([]);
  const [loading, setLoading] = useState(true);
  const [showAll, setShowAll] = useState(false);
  // People I followed from this panel stay visible (showing "Following"),
  // so the row doesn't jump away under my finger.
  const justFollowed = useRef<Set<string>>(new Set());

  // Who to follow: GET /users/suggestions?limit=10
  useEffect(() => {
    let cancelled = false;
    api
      .get(endpoints.suggestions, { params: { limit: 10 } })
      .then((res) => {
        let list = extractList<User>(res.data, "suggestions");
        if (list.length === 0) list = extractList<User>(res.data, "users");
        if (!cancelled) setSuggestions(list);
      })
      .catch(() => {
        // the panel just stays empty if this request fails
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, []);

  // Not me, and not someone I already follow
  const people = suggestions.filter(
    (u) =>
      u._id !== meId &&
      (justFollowed.current.has(u._id) || !isFollowing(u._id, u.isFollowing)),
  );
  const visible = showAll ? people : people.slice(0, 4);

  function follow(u: User) {
    justFollowed.current.add(u._id);
    void toggleFollow(u._id, u.isFollowing);
  }

  // Latest friends: the people you follow (only if the profile request returns them as users)
  const friends = (me?.following ?? [])
    .filter((f): f is User => typeof f === "object" && !!f?._id)
    .slice(0, 5);

  return (
    <aside className="space-y-5 xl:sticky xl:top-24">
      {/* Who to follow */}
      <section className={card}>
        <div className="mb-4 flex items-center justify-between">
          <h2 className="text-lg font-bold text-white">Who to follow</h2>
          {people.length > 4 && (
            <button
              onClick={() => setShowAll((s) => !s)}
              className="text-sm font-medium text-indigo-400 hover:text-indigo-300"
            >
              {showAll ? "Show less" : "See all"}
            </button>
          )}
        </div>

        {loading && (
          <div className="space-y-4">
            {[1, 2, 3].map((n) => (
              <div key={n} className="h-11 animate-pulse rounded-xl bg-white/5" />
            ))}
          </div>
        )}

        {!loading && people.length === 0 && (
          <p className="text-sm text-slate-500">No suggestions right now.</p>
        )}

        <ul className="space-y-4">
          {visible.map((u) => {
            const followed = isFollowing(u._id, u.isFollowing);
            return (
              <li key={u._id} className="flex items-center gap-3">
                <ProfileLink user={u} className="shrink-0">
                  <Avatar user={u} className="h-11 w-11" />
                </ProfileLink>
                <ProfileLink user={u} className="min-w-0 flex-1">
                  <p className="truncate text-sm font-semibold text-white hover:underline">{u.name}</p>
                  {u.username && (
                    <p className="truncate text-xs text-slate-400">@{u.username}</p>
                  )}
                </ProfileLink>
                <button
                  onClick={() => follow(u)}
                  className={`min-h-9 shrink-0 rounded-lg px-4 text-sm font-semibold transition-colors ${
                    followed
                      ? "border border-white/10 text-slate-300 hover:bg-white/5"
                      : "bg-indigo-500 text-white hover:bg-indigo-400"
                  }`}
                >
                  {followed ? "Following" : "Follow"}
                </button>
              </li>
            );
          })}
        </ul>
      </section>

      {/* Trending: the hashtags used most in the posts loaded on the page */}
      <section className={card}>
        <h2 className="mb-4 flex items-center gap-2 text-lg font-bold text-white">
          <Flame className="h-5 w-5 text-red-500" />
          Trending
        </h2>

        {trending.length === 0 ? (
          <p className="text-sm text-slate-500">
            No hashtags yet. Add one to a post, like #design.
          </p>
        ) : (
          <ol className="space-y-4">
            {trending.map((t, i) => (
              <li key={t.tag} className="flex items-center gap-3">
                <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-white/5 text-sm font-semibold text-slate-300">
                  {i + 1}
                </span>
                <div className="min-w-0">
                  <p className="truncate text-sm font-semibold text-white">{t.tag}</p>
                  <p className="text-xs text-slate-400">
                    {t.count} {t.count === 1 ? "post" : "posts"}
                  </p>
                </div>
              </li>
            ))}
          </ol>
        )}
      </section>

      {/* Latest friends */}
      {friends.length > 0 && (
        <section className={card}>
          <h2 className="mb-4 text-lg font-bold text-white">Latest Friends</h2>
          <ul className="flex justify-between gap-2">
            {friends.map((f) => (
              <li key={f._id} className="w-14">
                <ProfileLink user={f} className="flex flex-col items-center gap-1.5">
                  <Avatar user={f} className="h-12 w-12" />
                  <span className="w-full truncate text-center text-xs text-slate-300">
                    {f.name?.split(" ")[0]}
                  </span>
                </ProfileLink>
              </li>
            ))}
          </ul>
        </section>
      )}
    </aside>
  );
}