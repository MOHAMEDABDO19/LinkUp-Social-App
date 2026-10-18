import { useCallback, useEffect, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import { toast } from "react-toastify";
import { Bell, CheckCheck, Loader2 } from "lucide-react";
import { api, endpoints, errMsg, extractList, nextPageOf } from "../../../Api";
import { useMe } from "../../Useme";
import Avatar from "../Avatar/avatar";
import ProfileLink from "../../Components/LinkProfile/LinkProfile";
import { describe, linkFor, timeAgo, unavailable } from "../../Notificationutils";
import type { AppNotification } from "../../Pages/Types/types";

const LIMIT = 10;
type Tab = "all" | "read";

export default function NotificationBell() {
  const navigate = useNavigate();
  const { unread, refreshUnread } = useMe();

  const [open, setOpen] = useState(false);
  const [tab, setTab] = useState<Tab>("all");
  const [items, setItems] = useState<AppNotification[]>([]);
  const [loading, setLoading] = useState(false);
  const [loadingMore, setLoadingMore] = useState(false);
  const [hasMore, setHasMore] = useState(false);
  const [failed, setFailed] = useState(false);
  const [marking, setMarking] = useState(false);
  const boxRef = useRef<HTMLDivElement>(null);
  const nextPageRef = useRef<number | null>(null);

  // In the Read tab we filter on the client and keep fetching until we find something
  const fetchPage = useCallback(
    async (page: number) => {
      let current: number | null = page;
      while (current !== null) {
        const res = await api.get(endpoints.notifications, {
          params: { page: current, limit: LIMIT },
        });
        const raw = extractList<AppNotification>(res.data, "notifications");
        const next = nextPageOf(res.data, current, raw.length, LIMIT);
        const list = tab === "read" ? raw.filter((n) => n.isRead) : raw;
        if (list.length > 0 || next === null) return { list, nextPage: next };
        current = next;
      }
      return { list: [] as AppNotification[], nextPage: null };
    },
    [tab],
  );

  const loadFirst = useCallback(async () => {
    setLoading(true);
    try {
      const { list, nextPage } = await fetchPage(1);
      setItems(list);
      nextPageRef.current = nextPage;
      setHasMore(nextPage !== null);
      setFailed(false);
    } catch (e) {
      setFailed(true);
      toast.error(errMsg(e));
    } finally {
      setLoading(false);
    }
  }, [fetchPage]);

  async function loadMore() {
    const page = nextPageRef.current;
    if (page === null || loadingMore) return;
    setLoadingMore(true);
    try {
      const { list, nextPage } = await fetchPage(page);
      setItems((prev) => {
        const seen = new Set(prev.map((n) => n._id));
        return [...prev, ...list.filter((n) => !seen.has(n._id))];
      });
      nextPageRef.current = nextPage;
      setHasMore(nextPage !== null);
    } catch (e) {
      toast.error(errMsg(e));
    } finally {
      setLoadingMore(false);
    }
  }

  // Load when the dropdown opens or the tab changes
  useEffect(() => {
    if (!open) return;
    void loadFirst();
    void refreshUnread();
  }, [open, loadFirst, refreshUnread]);

  // Close on outside click / Escape
  useEffect(() => {
    if (!open) return;
    const onDown = (e: MouseEvent | TouchEvent) => {
      if (boxRef.current && !boxRef.current.contains(e.target as Node))
        setOpen(false);
    };
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") setOpen(false);
    };
    document.addEventListener("mousedown", onDown);
    document.addEventListener("touchstart", onDown);
    document.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("mousedown", onDown);
      document.removeEventListener("touchstart", onDown);
      document.removeEventListener("keydown", onKey);
    };
  }, [open]);

  async function markRead(n: AppNotification) {
    if (n.isRead) return;
    setItems((list) =>
      list.map((x) => (x._id === n._id ? { ...x, isRead: true } : x)),
    );
    try {
      await api.patch(endpoints.notificationRead(n._id));
      void refreshUnread();
    } catch (e) {
      setItems((list) =>
        list.map((x) => (x._id === n._id ? { ...x, isRead: false } : x)),
      );
      toast.error(errMsg(e));
    }
  }

  async function markAll() {
    setMarking(true);
    try {
      await api.patch(endpoints.notificationsReadAll);
      setItems((list) => list.map((x) => ({ ...x, isRead: true })));
      void refreshUnread();
    } catch (e) {
      toast.error(errMsg(e));
    } finally {
      setMarking(false);
    }
  }

  // Click a notification: go to the post, or say it's not available
 // Click a notification: go to the post, or say it's not available
function openItem(n: AppNotification) {
  void markRead(n);
  setOpen(false);

  if (unavailable(n)) {
    toast.error("This post is no longer available");
    return;
  }

  const to = linkFor(n);
  if (to) navigate(to);
  else toast.error("This content is not available");
}
  return (
    <div className="relative" ref={boxRef}>
      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        aria-label={unread > 0 ? `Notifications, ${unread} unread` : "Notifications"}
        aria-expanded={open}
        className={`relative flex h-10 w-10 items-center justify-center rounded-xl transition-colors hover:bg-white/5 focus:outline-none focus-visible:ring-2 focus-visible:ring-indigo-400 ${
          open ? "bg-white/5 text-indigo-400" : "text-slate-300 hover:text-white"
        }`}
      >
        <Bell className="h-5 w-5" />
        {unread > 0 && (
          <span className="absolute -right-0.5 -top-0.5 min-w-[1.15rem] rounded-full bg-red-500 px-1 text-center text-[10px] font-bold leading-[1.15rem] text-white ring-2 ring-[#0a0b22]">
            {unread > 99 ? "99+" : unread}
          </span>
        )}
      </button>

      {open && (
        <div className="fixed inset-x-3 top-[4.75rem] z-50 overflow-hidden rounded-2xl border border-white/10 bg-[#12143a] shadow-2xl sm:absolute sm:inset-x-auto sm:right-0 sm:top-full sm:mt-2 sm:w-96">
          <div className="flex items-center justify-between gap-2 border-b border-white/10 px-4 py-3">
            <h2 className="text-base font-bold text-white">Notifications</h2>
            <button
              type="button"
              onClick={() => void markAll()}
              disabled={marking || unread === 0}
              className="flex items-center gap-1.5 rounded-lg px-2 py-1 text-xs font-semibold text-indigo-400 hover:bg-white/5 disabled:opacity-40"
            >
              {marking ? (
                <Loader2 className="h-3.5 w-3.5 animate-spin" />
              ) : (
                <CheckCheck className="h-3.5 w-3.5" />
              )}
              Mark all as read
            </button>
          </div>

          {/* All / Read */}
          <div className="flex gap-1 border-b border-white/10 p-2" role="tablist">
            {(["all", "read"] as const).map((t) => (
              <button
                key={t}
                type="button"
                role="tab"
                aria-selected={tab === t}
                onClick={() => setTab(t)}
                className={`flex-1 rounded-lg py-1.5 text-sm font-semibold transition-colors ${
                  tab === t
                    ? "bg-indigo-500 text-white"
                    : "text-slate-400 hover:text-slate-200"
                }`}
              >
                {t === "all" ? "All" : "Read"}
              </button>
            ))}
          </div>

          <div className="max-h-[60vh] overflow-y-auto">
            {loading && (
              <div className="flex justify-center py-8 text-slate-500">
                <Loader2 className="h-5 w-5 animate-spin" />
              </div>
            )}

            {!loading && failed && (
              <div className="py-8 text-center text-sm text-slate-400">
                Couldn't load notifications.
                <button
                  onClick={() => void loadFirst()}
                  className="mt-2 block w-full text-indigo-400 hover:underline"
                >
                  Try again
                </button>
              </div>
            )}

            {!loading && !failed && items.length === 0 && (
              <p className="py-8 text-center text-sm text-slate-400">
                {tab === "read" ? "No read notifications yet." : "No notifications yet."}
              </p>
            )}

            {!loading && (
              <ul>
                {items.map((n) => {
                  const unreadItem = !n.isRead;
                  return (
                    <li key={n._id}>
                      <div
                        role="button"
                        tabIndex={0}
                        onClick={() => openItem(n)}
                        onKeyDown={(e) => e.key === "Enter" && openItem(n)}
                        className={`flex cursor-pointer items-center gap-3 px-4 py-3 transition-colors hover:bg-white/5 ${
                          unreadItem ? "bg-indigo-500/10" : ""
                        }`}
                      >
                        <ProfileLink
                          user={n.actor}
                          onClick={(e) => {
                            e.stopPropagation();
                            setOpen(false);
                          }}
                        >
                          <Avatar user={n.actor} className="h-10 w-10" />
                        </ProfileLink>
                        <div className="min-w-0 flex-1">
                          <p className="text-sm text-slate-200">
                            {n.actor?.name && (
                              <ProfileLink
                                user={n.actor}
                                onClick={(e) => {
                                  e.stopPropagation();
                                  setOpen(false);
                                }}
                                className="font-semibold text-white hover:underline"
                              >
                                {n.actor.name}{" "}
                              </ProfileLink>
                            )}
                            {describe(n)}
                          </p>
                          <p className="mt-0.5 text-xs text-slate-500">
                            {timeAgo(n.createdAt)}
                            {unavailable(n) && " · Post no longer available"}
                          </p>
                        </div>
                        {unreadItem && (
                          <span
                            aria-label="Unread"
                            className="h-2.5 w-2.5 shrink-0 rounded-full bg-indigo-400"
                          />
                        )}
                      </div>
                    </li>
                  );
                })}
              </ul>
            )}

            {!loading && hasMore && (
              <button
                type="button"
                onClick={() => void loadMore()}
                disabled={loadingMore}
                className="flex w-full items-center justify-center gap-2 border-t border-white/10 py-3 text-sm font-semibold text-indigo-400 hover:bg-white/5 disabled:opacity-60"
              >
                {loadingMore && <Loader2 className="h-4 w-4 animate-spin" />}
                {loadingMore ? "Loading..." : "Load more"}
              </button>
            )}
          </div>
        </div>
      )}
    </div>
  );
}