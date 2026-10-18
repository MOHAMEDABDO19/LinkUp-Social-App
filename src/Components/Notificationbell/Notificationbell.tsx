import { useCallback, useEffect, useRef, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { toast } from "react-toastify";
import { Bell, CheckCheck, Loader2 } from "lucide-react";
import { api, endpoints, errMsg, extractList } from "../../../Api";
import { useMe } from "../../Useme";
import Avatar from "../Avatar/avatar";
import ProfileLink from "../../Components/LinkProfile/LinkProfile";
import type { AppNotification } from "../../Pages/Types/types";

type NotificationWithDetails = AppNotification & {
  type?: string;
  message?: string;
  post?: { _id?: string; id?: string } | null;
  postId?: string;
};

function describe(notification: AppNotification): string {
  const item = notification as NotificationWithDetails;
  if (item.message) return item.message;

  switch (item.type?.toLowerCase()) {
    case "like":
    case "post_like":
      return "liked your post.";
    case "comment":
    case "post_comment":
      return "commented on your post.";
    case "follow":
      return "started following you.";
    case "mention":
      return "mentioned you.";
    default:
      return "sent you a notification.";
  }
}

function linkFor(notification: AppNotification): string | undefined {
  const item = notification as NotificationWithDetails;
  const postId = item.post?._id ?? item.post?.id ?? item.postId;
  return postId ? `/posts/${postId}` : undefined;
}

function timeAgo(value: string): string {
  const timestamp = new Date(value).getTime();
  if (!Number.isFinite(timestamp)) return "";

  const seconds = Math.max(0, Math.floor((Date.now() - timestamp) / 1000));
  if (seconds < 60) return "just now";
  if (seconds < 3600) return `${Math.floor(seconds / 60)}m ago`;
  if (seconds < 86400) return `${Math.floor(seconds / 3600)}h ago`;
  if (seconds < 604800) return `${Math.floor(seconds / 86400)}d ago`;
  return new Date(timestamp).toLocaleDateString();
}

function unavailable(notification: AppNotification): boolean {
  const item = notification as NotificationWithDetails;
  return Boolean(item.postId && !item.post);
}

// The bell for the top navbar: red badge with the unread number,
// and a dropdown with the latest notifications.
export default function NotificationBell() {
  const navigate = useNavigate();
  const { unread, refreshUnread } = useMe();

  const [open, setOpen] = useState(false);
  const [items, setItems] = useState<AppNotification[]>([]);
  const [loading, setLoading] = useState(false);
  const [failed, setFailed] = useState(false);
  const [marking, setMarking] = useState(false);
  const boxRef = useRef<HTMLDivElement>(null);

  // GET /notifications?unread=false&page=1&limit=10
  const load = useCallback(async () => {
    setLoading(true);
    try {
      const res = await api.get(endpoints.notifications, {
        params: { unread: false, page: 1, limit: 10 },
      });
      setItems(extractList<AppNotification>(res.data, "notifications"));
      setFailed(false);
    } catch (e) {
      setFailed(true);
      toast.error(errMsg(e));
    } finally {
      setLoading(false);
    }
  }, []);

  // Refresh when it opens, close on outside click / Escape
  useEffect(() => {
    if (!open) return;
    void load();
    void refreshUnread();
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
  }, [open, load, refreshUnread]);

  // PATCH /notifications/:id/read
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

  // PATCH /notifications/read-all
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

  function openItem(n: AppNotification) {
    void markRead(n);
    const to = linkFor(n);
    setOpen(false);
    if (to) navigate(to);
  }

  return (
    <div className="relative" ref={boxRef}>
      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        aria-label={
          unread > 0 ? `Notifications, ${unread} unread` : "Notifications"
        }
        aria-expanded={open}
        className={`relative flex h-10 w-10 items-center justify-center rounded-xl transition-colors hover:bg-white/5 focus:outline-none focus-visible:ring-2 focus-visible:ring-indigo-400 ${
          open
            ? "bg-white/5 text-indigo-400"
            : "text-slate-300 hover:text-white"
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

          <div className="max-h-[60vh] overflow-y-auto">
            {loading && items.length === 0 && (
              <div className="flex justify-center py-8 text-slate-500">
                <Loader2 className="h-5 w-5 animate-spin" />
              </div>
            )}

            {!loading && failed && (
              <div className="py-8 text-center text-sm text-slate-400">
                Couldn't load notifications.
                <button
                  onClick={() => void load()}
                  className="mt-2 block w-full text-indigo-400 hover:underline"
                >
                  Try again
                </button>
              </div>
            )}

            {!loading && !failed && items.length === 0 && (
              <p className="py-8 text-center text-sm text-slate-400">
                No notifications yet.
              </p>
            )}

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
                          {timeAgo(n.createdAt ?? "")}
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
          </div>

          <Link
            to="/notifications"
            onClick={() => setOpen(false)}
            className="block border-t border-white/10 py-3 text-center text-sm font-semibold text-indigo-400 hover:bg-white/5"
          >
            See all notifications
          </Link>
        </div>
      )}
    </div>
  );
}
