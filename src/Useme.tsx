import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from "react";
import { toast } from "react-toastify";
import { api, endpoints, errMsg, extractList, nextPageOf, tokenUserId } from "../Api";
import type { Post, User } from "./Pages/Types/types";

type MeState = {
  me: User | null;
  meId: string | null;
  // number of unread notifications (shown on the bell and the notifications page)
  unread: number;
  refreshMe: () => Promise<void>;
  refreshUnread: () => Promise<void>;
  // Do I follow this user? `serverFlag` is the isFollowing field the server may
  // send inside a post / profile / suggestion.
  isFollowing: (userId?: string | null, serverFlag?: boolean) => boolean;
  // PUT /users/:id/follow (a toggle), updates instantly and rolls back on error
  toggleFollow: (userId: string, serverFlag?: boolean) => Promise<void>;
  // Same idea for saved posts: one shared answer for every PostCard
  isBookmarked: (postId?: string | null, serverFlag?: boolean) => boolean;
  // PUT /posts/:id/bookmark (a toggle)
  toggleBookmark: (postId: string, serverFlag?: boolean) => Promise<void>;
  refreshBookmarks: () => Promise<void>;
};

const noop = async () => {};

const MeContext = createContext<MeState>({
  me: null,
  meId: null,
  unread: 0,
  refreshMe: noop,
  refreshUnread: noop,
  isFollowing: () => false,
  toggleFollow: noop,
  isBookmarked: () => false,
  toggleBookmark: noop,
  refreshBookmarks: noop,
});

// Put this once around the app (Layout does it). The profile, the unread count,
// the "who do I follow" list and the saved posts are loaded one time and shared by
// the navbar, the sidebar and every page, so a Follow / Save button looks the same everywhere.
export function MeProvider({ children }: { children: ReactNode }) {
  const [me, setMe] = useState<User | null>(null);
  const [unread, setUnread] = useState(0);
  // Follow changes made in this session. They win over whatever the lists say,
  // because lists that were loaded earlier are out of date after a follow.
  const [overrides, setOverrides] = useState<Record<string, boolean>>({});
  // Ids of my saved posts (from GET /users/bookmarks) + changes made in this session
  const [savedIds, setSavedIds] = useState<Set<string>>(new Set());
  const [saveOverrides, setSaveOverrides] = useState<Record<string, boolean>>({});
  const token = localStorage.getItem("token");

  const meId = me?._id ?? tokenUserId();

  const refreshMe = useCallback(async () => {
    if (!localStorage.getItem("token")) return;
    try {
      const r = await api.get(endpoints.me);
      const d = r.data as { data?: { user?: User } & User; user?: User };
      const u = d?.data?.user ?? d?.user ?? (d?.data as User | undefined);
      if (u?._id) setMe(u);
    } catch {
      // falls back to the id inside the token
    }
  }, []);

  const refreshUnread = useCallback(async () => {
    if (!localStorage.getItem("token")) return;
    try {
      const r = await api.get(endpoints.unreadCount);
      const d = r.data as { data?: { unreadCount?: number }; unreadCount?: number };
      const n = d?.data?.unreadCount ?? d?.unreadCount;
      if (typeof n === "number") setUnread(n);
    } catch {
      // keep the old number
    }
  }, []);

  // Reads every page of my saved posts, so each post in the feed knows if it is saved
  const refreshBookmarks = useCallback(async () => {
    if (!localStorage.getItem("token")) return;
    try {
      const ids = new Set<string>();
      let page: number | null = 1;
      for (let i = 0; i < 10 && page !== null; i++) {
        const res = await api.get(endpoints.bookmarks, { params: { page, limit: 50 } });
        let list = extractList<Post>(res.data, "bookmarks");
        if (list.length === 0) list = extractList<Post>(res.data, "posts");
        list.forEach((p) => p?._id && ids.add(p._id));
        page = nextPageOf(res.data, page, list.length, 50);
      }
      setSavedIds(ids);
      setSaveOverrides({});
    } catch {
      // keep what we had
    }
  }, []);

  // Load the profile when the token changes (login / logout)
  useEffect(() => {
    setOverrides({});
    setSaveOverrides({});
    setSavedIds(new Set());
    if (!token) {
      setMe(null);
      setUnread(0);
      return;
    }
    void refreshMe();
    void refreshUnread();
    void refreshBookmarks();
  }, [token, refreshMe, refreshUnread, refreshBookmarks]);

  // Keep the bell number fresh
  useEffect(() => {
    if (!token) return;
    const t = window.setInterval(() => void refreshUnread(), 60_000);
    const onFocus = () => void refreshUnread();
    window.addEventListener("focus", onFocus);
    return () => {
      window.clearInterval(t);
      window.removeEventListener("focus", onFocus);
    };
  }, [token, refreshUnread]);

  // Ids of the people I follow, taken from my profile (ids or full users)
  const followingIds = useMemo(() => {
    const s = new Set<string>();
    for (const f of me?.following ?? []) {
      const id = typeof f === "string" ? f : f?._id;
      if (id) s.add(id);
    }
    return s;
  }, [me]);

  const isFollowing = useCallback(
    (userId?: string | null, serverFlag?: boolean) => {
      if (!userId) return false;
      if (userId in overrides) return overrides[userId];
      return serverFlag === true || followingIds.has(userId);
    },
    [overrides, followingIds],
  );

  const toggleFollow = useCallback(
    async (userId: string, serverFlag?: boolean) => {
      if (!userId || userId === meId) return;
      const was = isFollowing(userId, serverFlag);
      setOverrides((o) => ({ ...o, [userId]: !was }));
      try {
        await api.put(endpoints.follow(userId));
        void refreshMe();
      } catch (err) {
        setOverrides((o) => ({ ...o, [userId]: was }));
        toast.error(errMsg(err));
      }
    },
    [isFollowing, meId, refreshMe],
  );

  const isBookmarked = useCallback(
    (postId?: string | null, serverFlag?: boolean) => {
      if (!postId) return false;
      if (postId in saveOverrides) return saveOverrides[postId];
      return serverFlag === true || savedIds.has(postId);
    },
    [saveOverrides, savedIds],
  );

  const toggleBookmark = useCallback(
    async (postId: string, serverFlag?: boolean) => {
      const was = isBookmarked(postId, serverFlag);
      setSaveOverrides((o) => ({ ...o, [postId]: !was }));
      try {
        await api.put(endpoints.bookmark(postId));
      } catch (err) {
        setSaveOverrides((o) => ({ ...o, [postId]: was }));
        toast.error(errMsg(err));
      }
    },
    [isBookmarked],
  );

  const value = useMemo<MeState>(
    () => ({
      me,
      meId,
      unread,
      refreshMe,
      refreshUnread,
      isFollowing,
      toggleFollow,
      isBookmarked,
      toggleBookmark,
      refreshBookmarks,
    }),
    [
      me,
      meId,
      unread,
      refreshMe,
      refreshUnread,
      isFollowing,
      toggleFollow,
      isBookmarked,
      toggleBookmark,
      refreshBookmarks,
    ],
  );

  return <MeContext.Provider value={value}>{children}</MeContext.Provider>;
}

// The logged-in user. meId works right away from the token,
// and `me` (name + photo) fills in when the profile request returns.
export function useMe() {
  return useContext(MeContext);
}