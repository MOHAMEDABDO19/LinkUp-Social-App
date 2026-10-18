import { useCallback, useEffect, useRef, useState } from "react";
import { toast } from "react-toastify";
import { Bookmark, Loader2 } from "lucide-react";
import { api, endpoints, errMsg, extractList, nextPageOf } from "../../../Api";
import { useMe } from "../../Useme";
import PostCard from "../../Components/PostCard/PostCard";
import type { Post } from "../../Pages/Types/types";

const LIMIT = 20;
const card = "rounded-2xl border border-indigo-500/10 bg-[#0d0f2b]";

// Saved posts: GET /users/bookmarks
export default function Bookmarks() {
  const [posts, setPosts] = useState<Post[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  const [hasMore, setHasMore] = useState(false);
  const [failed, setFailed] = useState(false);
  const nextPageRef = useRef<number | null>(null);

  const { meId, isFollowing, toggleFollow, isBookmarked, refreshBookmarks } = useMe();

  // A post you un-save here disappears from the list right away
  const shown = posts.filter((p) => isBookmarked(p._id, true));

  const fetchPage = useCallback(async (page: number) => {
    const res = await api.get(endpoints.bookmarks, { params: { page, limit: LIMIT } });
    let list = extractList<Post>(res.data, "bookmarks");
    if (list.length === 0) list = extractList<Post>(res.data, "posts");
    return { list, nextPage: nextPageOf(res.data, page, list.length, LIMIT) };
  }, []);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const { list, nextPage } = await fetchPage(1);
      setPosts(list);
      nextPageRef.current = nextPage;
      setHasMore(nextPage !== null);
      setFailed(false);
      void refreshBookmarks();
    } catch (e) {
      setFailed(true);
      toast.error(errMsg(e));
    } finally {
      setLoading(false);
    }
  }, [fetchPage, refreshBookmarks]);

  useEffect(() => {
    void load();
  }, [load]);

  async function loadMore() {
    const page = nextPageRef.current;
    if (page === null || loadingMore) return;
    setLoadingMore(true);
    try {
      const { list, nextPage } = await fetchPage(page);
      setPosts((prev) => {
        const seen = new Set(prev.map((p) => p._id));
        return [...prev, ...list.filter((p) => !seen.has(p._id))];
      });
      nextPageRef.current = nextPage;
      setHasMore(nextPage !== null);
    } catch (e) {
      toast.error(errMsg(e));
    } finally {
      setLoadingMore(false);
    }
  }

  return (
    <div className="mx-auto w-full max-w-2xl space-y-4 sm:space-y-5">
      <h1 className="flex items-center gap-2.5 text-2xl font-bold text-white">
        <Bookmark className="h-6 w-6 text-indigo-400" />
        Bookmarks
      </h1>

      {loading &&
        [1, 2].map((n) => (
          <div key={n} className={`${card} h-60 animate-pulse`} />
        ))}

      {!loading && failed && (
        <div className={`${card} py-10 text-center`}>
          <p className="text-slate-300">Couldn't load your bookmarks.</p>
          <button
            onClick={() => void load()}
            className="mt-3 rounded-xl bg-indigo-500 px-5 py-2 text-sm font-semibold text-white hover:bg-indigo-400"
          >
            Try again
          </button>
        </div>
      )}

      {!loading && !failed && shown.length === 0 && (
        <div className={`${card} py-12 text-center text-slate-400`}>
          Nothing saved yet. Tap the bookmark on a post to keep it here.
        </div>
      )}

      {!loading &&
        shown.map((post) => (
          <PostCard
            key={post._id}
            post={post}
            meId={meId}
            startSaved
            following={isFollowing(post.user?._id, post.user?.isFollowing)}
            onFollow={(id) => void toggleFollow(id, post.user?.isFollowing)}
            onReposted={() => void load()}
            onDeleted={(id) =>
              setPosts((list) => list.filter((p) => p._id !== id))
            }
          />
        ))}

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