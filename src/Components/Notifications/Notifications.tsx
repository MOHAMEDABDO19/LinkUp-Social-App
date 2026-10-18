import { useCallback, useEffect, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import { toast } from "react-toastify";
import { Bell, CheckCheck, Loader2 } from "lucide-react";
import { api, endpoints, errMsg, extractList, nextPageOf } from "../../../Api";
import { useMe } from "../../Useme";
import Avatar from "../../Components/Avatar/avatar";
import ProfileLink from "../../Components/LinkProfile/LinkProfile";
import { describe, linkFor, timeAgo, unavailable } from "../../Notificationutils";
import type { AppNotification } from "../../Pages//Types/types";

const LIMIT = 10;
const card = "rounded-2xl border border-indigo-500/10 bg-[#0d0f2b]";

type Tab = "all" | "unread";

export default function Notifications() {
  const navigate = useNavigate();
  const { unread, refreshUnread } = useMe();

  const [items, setItems] = useState<AppNotification[]>([]);
  const [tab, setTab] = useState<Tab>("all");
  const [loading, setLoading] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  const [hasMore, setHasMore] = useState(false);
  const [failed, setFailed] = useState(false);
  const [markingAll, setMarkingAll] = useState(false);
  const nextPageRef = useRef<number | null>(null);

  // GET /notifications?unread=false&page=1&limit=10
  const fetchPage = useCallback(
    async (page: number) => {
      const res = await api.get(endpoints.notifications, {
        params: { unread: tab === "unread", page, limit: LIMIT },
      });
      const list = extractList<AppNotification>(res.data, "notifications");
      return { list, nextPage: nextPageOf(res.data, page, list.length, LIMIT) };
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

  useEffect(() => {
    void loadFirst();
    void refreshUnread();
  }, [loadFirst, refreshUnread]);

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

  // PATCH /notifications/:id/read
  async function markRead(n: AppNotification) {
    if (n.isRead) return;
    setItems((list) => list.map((x) => (x._id === n._id ? { ...x, isRead: true } : x)));
    try {
      await api.patch(endpoints.notificationRead(n._id));
      void refreshUnread();
    } catch (e) {
      setItems((list) => list.map((x) => (x._id === n._id ? { ...x, isRead: false } : x)));
      toast.error(errMsg(e));
    }
  }

  // PATCH /notifications/read-all
  async function markAll() {
    setMarkingAll(true);
    try {
      await api.patch(endpoints.notificationsReadAll);
      setItems((list) => list.map((x) => ({ ...x, isRead: true })));
      void refreshUnread();
      toast.success("All notifications marked as read");
    } catch (e) {
      toast.error(errMsg(e));
    } finally {
      setMarkingAll(false);
    }
  }

  function open(n: AppNotification) {
    void markRead(n);
    const to = linkFor(n);
    if (to) navigate(to);
  }

  return (
    <div className="mx-auto w-full max-w-2xl space-y-4 sm:space-y-5">
      <div className="flex items-center justify-between gap-3">
        <h1 className="flex items-center gap-2.5 text-2xl font-bold text-white">
          <Bell className="h-6 w-6 text-indigo-400" />
          Notifications
          {unread > 0 && (
            <span className="rounded-full bg-red-500 px-2 py-0.5 text-xs font-bold text-white">
              {unread > 99 ? "99+" : unread}
            </span>
          )}
        </h1>

        <button
          onClick={() => void markAll()}
          disabled={markingAll || unread === 0}
          className="flex min-h-10 items-center gap-2 rounded-xl border border-white/10 px-4 text-sm font-semibold text-slate-300 transition-colors hover:bg-white/5 disabled:opacity-40"
        >
          {markingAll ? <Loader2 className="h-4 w-4 animate-spin" /> : <CheckCheck className="h-4 w-4" />}
          <span className="hidden sm:inline">Mark all as read</span>
        </button>
      </div>

      {/* All / Unread */}
      <div className={`${card} flex gap-1 p-1`} role="tablist">
        {(["all", "unread"] as const).map((t) => (
          <button
            key={t}
            role="tab"
            aria-selected={tab === t}
            onClick={() => setTab(t)}
            className={`min-h-10 flex-1 rounded-xl text-sm font-semibold transition-colors ${
              tab === t
                ? "bg-indigo-500 text-white shadow-lg shadow-indigo-500/20"
                : "text-slate-400 hover:text-slate-200"
            }`}
          >
            {t === "all" ? "All" : "Unread"}
          </button>
        ))}
      </div>

      {loading &&
        [1, 2, 3, 4].map((n) => <div key={n} className={`${card} h-20 animate-pulse`} />)}

      {!loading && failed && (
        <div className={`${card} py-10 text-center`}>
          <p className="text-slate-300">Couldn't load notifications.</p>
          <button
            onClick={() => void loadFirst()}
            className="mt-3 rounded-xl bg-indigo-500 px-5 py-2 text-sm font-semibold text-white hover:bg-indigo-400"
          >
            Try again
          </button>
        </div>
      )}

      {!loading && !failed && items.length === 0 && (
        <div className={`${card} py-12 text-center text-slate-400`}>
          {tab === "unread" ? "You're all caught up." : "No notifications yet."}
        </div>
      )}

      {!loading && (
        <ul className="space-y-2">
          {items.map((n) => {
            const text = describe(n);
            const unreadItem = !n.isRead;
            const gone = unavailable(n);
            return (
              <li key={n._id}>
                <div
                  role="button"
                  tabIndex={0}
                  onClick={() => open(n)}
                  onKeyDown={(e) => e.key === "Enter" && open(n)}
                  className={`flex w-full cursor-pointer items-center gap-3 rounded-2xl border p-4 text-left transition-colors hover:bg-white/5 ${
                    unreadItem
                      ? "border-indigo-400/30 bg-indigo-500/10"
                      : "border-indigo-500/10 bg-[#0d0f2b]"
                  }`}
                >
                  <ProfileLink user={n.actor} onClick={(e) => { e.stopPropagation(); void markRead(n); }}>
                    <Avatar user={n.actor} className="h-11 w-11" />
                  </ProfileLink>
                  <div className="min-w-0 flex-1">
                    <p className="text-sm text-slate-200">
                      {n.actor?.name && (
                        <ProfileLink
                          user={n.actor}
                          onClick={(e) => { e.stopPropagation(); void markRead(n); }}
                          className="font-semibold text-white hover:underline"
                        >
                          {n.actor.name}{" "}
                        </ProfileLink>
                      )}
                      {text}
                    </p>
                    <p className="mt-0.5 text-xs text-slate-500">
                      {timeAgo(n.createdAt)}
                      {gone && " · This post is no longer available"}
                    </p>
                  </div>
                  {unreadItem && (
                    <span aria-label="Unread" className="h-2.5 w-2.5 shrink-0 rounded-full bg-indigo-400" />
                  )}
                </div>
              </li>
            );
          })}
        </ul>
      )}

      {!loading && hasMore && (
        <div className="flex justify-center py-2">
          <button
            onClick={() => void loadMore()}
            disabled={loadingMore}
            className="flex min-h-10 items-center gap-2 rounded-xl border border-white/10 px-5 text-sm font-semibold text-slate-300 hover:bg-white/5 disabled:opacity-60"
          >
            {loadingMore && <Loader2 className="h-4 w-4 animate-spin" />}
            {loadingMore ? "Loading..." : "Load more"}
          </button>
        </div>
      )}
    </div>
  );
}