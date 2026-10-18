import { useEffect, useRef, useState } from "react";
import { UsersRound, X, ChevronRight, UserPlus } from "lucide-react";

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
  const [isOpen, setIsOpen] = useState(false);

  const panelRef = useRef<HTMLDivElement>(null);
  const justFollowed = useRef<Set<string>>(new Set());

  // Fetch suggested users
  useEffect(() => {
    let cancelled = false;

    api
      .get(endpoints.suggestions, {
        params: { limit: 10 },
      })
      .then((res) => {
        let list = extractList<User>(res.data, "suggestions");

        if (list.length === 0) {
          list = extractList<User>(res.data, "users");
        }

        if (!cancelled) {
          setSuggestions(list);
        }
      })
      .catch((error) => {
        console.error("Failed to load follow suggestions:", error);
      })
      .finally(() => {
        if (!cancelled) {
          setLoading(false);
        }
      });

    return () => {
      cancelled = true;
    };
  }, []);

  // Close the panel with Escape
  useEffect(() => {
    if (!isOpen) return;

    function handleKeyDown(event: KeyboardEvent) {
      if (event.key === "Escape") {
        setIsOpen(false);
      }
    }

    window.addEventListener("keydown", handleKeyDown);

    return () => {
      window.removeEventListener("keydown", handleKeyDown);
    };
  }, [isOpen]);

  // Close when clicking outside the panel and button
  useEffect(() => {
    if (!isOpen) return;

    function handleClickOutside(event: MouseEvent) {
      if (
        panelRef.current &&
        !panelRef.current.contains(event.target as Node)
      ) {
        const target = event.target as HTMLElement;

        if (!target.closest("[data-follow-suggestions-trigger]")) {
          setIsOpen(false);
        }
      }
    }

    document.addEventListener("mousedown", handleClickOutside);

    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
    };
  }, [isOpen]);

  // Filter current user and already-followed users
  const people = suggestions.filter(
    (user) =>
      user._id !== meId &&
      (justFollowed.current.has(user._id) ||
        !isFollowing(user._id, user.isFollowing)),
  );

  const visible = showAll ? people : people.slice(0, 6);

  function follow(user: User) {
    justFollowed.current.add(user._id);
    void toggleFollow(user._id, user.isFollowing);
  }

  // Latest friends
  const friends = (me?.following ?? [])
    .filter(
      (friend): friend is User => typeof friend === "object" && !!friend?._id,
    )
    .slice(0, 5);

  return (
    <>
      {/* Right sidebar: Trending and Latest Friends only */}
      <aside className="space-y-5 xl:sticky xl:top-24">
        {trending.length > 0 && (
          <section className={card}>
            <h2 className="mb-4 text-lg font-bold text-white">Trending</h2>

            <ul className="space-y-3">
              {trending.map(({ tag, count }) => (
                <li
                  key={tag}
                  className="flex items-center justify-between gap-3"
                >
                  <span className="truncate font-medium text-indigo-300">
                    #{tag.replace(/^#/, "")}
                  </span>
                  <span className="shrink-0 text-xs text-slate-400">
                    {count} {count === 1 ? "post" : "posts"}
                  </span>
                </li>
              ))}
            </ul>
          </section>
        )}

        {/* Latest Friends */}
        {friends.length > 0 && (
          <section className={card}>
            <h2 className="mb-4 text-lg font-bold text-white">
              Latest Friends
            </h2>

            <ul className="flex justify-between gap-2">
              {friends.map((friend) => (
                <li key={friend._id} className="w-14">
                  <ProfileLink
                    user={friend}
                    className="flex flex-col items-center gap-1.5"
                  >
                    <Avatar user={friend} className="h-12 w-12" />

                    <span className="w-full truncate text-center text-xs text-slate-300">
                      {friend.name?.split(" ")[0]}
                    </span>
                  </ProfileLink>
                </li>
              ))}
            </ul>
          </section>
        )}
      </aside>

      {/* Floating Follow Suggestions Button */}
      <button
        type="button"
        data-follow-suggestions-trigger
        onClick={() => setIsOpen((open) => !open)}
        aria-label="Who to follow"
        aria-expanded={isOpen}
        className="fixed bottom-24 right-4 z-[90] flex h-12 w-12 items-center justify-center rounded-full border border-white/20 bg-gradient-to-br from-indigo-500 to-violet-600 text-white shadow-lg shadow-indigo-500/30 transition duration-300 hover:scale-110 active:scale-95 sm:bottom-6 sm:right-6 sm:h-14 sm:w-14"
      >
        {isOpen ? (
          <X className="h-6 w-6" />
        ) : (
          <UsersRound className="h-6 w-6" />
        )}

        {!isOpen && people.length > 0 && (
          <span className="absolute -right-1 -top-1 flex h-5 min-w-5 items-center justify-center rounded-full border-2 border-[#08091a] bg-pink-500 px-1 text-[10px] font-bold text-white">
            {people.length > 9 ? "9+" : people.length}
          </span>
        )}
      </button>

      {/* Backdrop on mobile */}
      {isOpen && (
        <div
          className="fixed inset-0 z-[95] bg-black/60 backdrop-blur-[2px] sm:bg-black/30"
          aria-hidden="true"
        />
      )}

      {/* Floating Suggestions Panel */}
      <div
        ref={panelRef}
        aria-label="Follow suggestions"
        aria-hidden={!isOpen}
        className={`fixed bottom-0 right-0 z-[100] flex w-full flex-col overflow-hidden rounded-t-3xl border border-indigo-400/20 bg-[#0b0d24] shadow-2xl shadow-black/50 transition-all duration-300 sm:bottom-24 sm:right-6 sm:w-[390px] sm:rounded-2xl ${
          isOpen
            ? "visible translate-y-0 opacity-100"
            : "invisible translate-y-8 opacity-0 pointer-events-none"
        }`}
        style={{
          maxHeight: "min(75dvh, 620px)",
        }}
      >
        {/* Panel Header */}
        <div className="flex shrink-0 items-center justify-between border-b border-white/10 bg-[#11132f] p-4 sm:p-5">
          <div className="flex items-center gap-3">
            <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-indigo-500/15 text-indigo-400">
              <UserPlus className="h-5 w-5" />
            </div>

            <div>
              <h2 className="text-base font-bold text-white">Who to follow</h2>

              <p className="text-xs text-slate-400">
                Discover people on LinkUp
              </p>
            </div>
          </div>

          <button
            type="button"
            onClick={() => setIsOpen(false)}
            aria-label="Close suggestions"
            className="flex h-9 w-9 items-center justify-center rounded-full text-slate-400 transition hover:bg-white/10 hover:text-white"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* Suggestions List */}
        <div className="min-h-0 flex-1 overflow-y-auto overscroll-contain p-4 sm:p-5">
          {loading ? (
            <div className="space-y-4">
              {[1, 2, 3, 4].map((item) => (
                <div
                  key={item}
                  className="flex animate-pulse items-center gap-3"
                >
                  <div className="h-11 w-11 shrink-0 rounded-full bg-white/10" />

                  <div className="flex-1 space-y-2">
                    <div className="h-3 w-28 rounded bg-white/10" />
                    <div className="h-2.5 w-20 rounded bg-white/5" />
                  </div>

                  <div className="h-9 w-20 rounded-lg bg-white/10" />
                </div>
              ))}
            </div>
          ) : people.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-10 text-center">
              <div className="mb-3 flex h-16 w-16 items-center justify-center rounded-full bg-indigo-500/10 text-indigo-400">
                <UsersRound className="h-8 w-8" />
              </div>

              <p className="font-semibold text-white">
                No suggestions right now
              </p>

              <p className="mt-1 text-sm text-slate-400">
                Check back later to discover new people.
              </p>
            </div>
          ) : (
            <ul className="space-y-4">
              {visible.map((user) => {
                const followed = isFollowing(user._id, user.isFollowing);

                return (
                  <li key={user._id} className="flex items-center gap-3">
                    <ProfileLink user={user} className="shrink-0">
                      <Avatar user={user} className="h-11 w-11" />
                    </ProfileLink>

                    <ProfileLink user={user} className="min-w-0 flex-1">
                      <p className="truncate text-sm font-semibold text-white hover:underline">
                        {user.name}
                      </p>

                      {user.username && (
                        <p className="truncate text-xs text-slate-400">
                          @{user.username}
                        </p>
                      )}
                    </ProfileLink>

                    <button
                      type="button"
                      onClick={() => follow(user)}
                      className={`min-h-9 shrink-0 rounded-lg px-3 text-xs font-semibold transition sm:px-4 sm:text-sm ${
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
          )}

          {/* Show all suggestions */}
          {!loading && people.length > 6 && (
            <button
              type="button"
              onClick={() => setShowAll((previous) => !previous)}
              className="mt-5 flex w-full items-center justify-center gap-2 rounded-xl border border-indigo-400/20 py-3 text-sm font-semibold text-indigo-300 transition hover:bg-indigo-500/10"
            >
              {showAll ? "Show less" : "See all suggestions"}
              <ChevronRight
                className={`h-4 w-4 transition-transform ${
                  showAll ? "rotate-90" : ""
                }`}
              />
            </button>
          )}
        </div>

        {/* Footer */}
        <div className="shrink-0 border-t border-white/10 px-4 py-3 text-center text-xs text-slate-500">
          Find your people on LinkUp 💜
        </div>
      </div>
    </>
  );
}
