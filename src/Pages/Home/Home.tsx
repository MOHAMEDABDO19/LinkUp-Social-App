import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { toast } from "react-toastify";
import { Image as ImageIcon, Loader2, X } from "lucide-react";
import { api, endpoints, errMsg, extractList, nextPageOf, paginationOf } from "../../../Api";
import { useMe } from "../../Useme";
import Avatar from "../../Components/Avatar/avatar";
import PostCard from "../../Components/PostCard/PostCard";
import RightPanel from "../../Components/Panal/Panal";
import type { Post } from "../Types/types";

const LIMIT = 40;

type Tab = "all" | "following";

const card = "rounded-2xl border border-indigo-500/10 bg-[#0d0f2b]";

export default function Home() {
  const [posts, setPosts] = useState<Post[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  const [hasMore, setHasMore] = useState(true);
  const [total, setTotal] = useState<number | null>(null);
  const [failed, setFailed] = useState(false);
  const [tab, setTab] = useState<Tab>("all");

  const [content, setContent] = useState("");
  const [image, setImage] = useState<File | null>(null);
  const [submitting, setSubmitting] = useState(false);

  const nextPageRef = useRef<number | null>(null);
  const busyRef = useRef(false);
  const sentinelRef = useRef<HTMLDivElement>(null);

  const { me, meId, isFollowing, toggleFollow } = useMe();

  const preview = useMemo(
    () => (image ? URL.createObjectURL(image) : null),
    [image],
  );
  useEffect(() => {
    return () => {
      if (preview) URL.revokeObjectURL(preview);
    };
  }, [preview]);

  // Trending = the hashtags used most in the posts on the page
  const trending = useMemo(() => {
    const counts = new Map<string, number>();
    for (const p of posts) {
      const tags = new Set(
        (p.body ?? "").toLowerCase().match(/#[\p{L}\p{N}_]+/gu) ?? [],
      );
      tags.forEach((t) => counts.set(t, (counts.get(t) ?? 0) + 1));
    }
    return [...counts.entries()]
      .sort((a, b) => b[1] - a[1])
      .slice(0, 5)
      .map(([tag, count]) => ({ tag, count }));
  }, [posts]);

  // "All posts" uses GET /posts (the full list, paged by the server).
  // "Following" uses the feed endpoint with only=following.
  const fetchPage = useCallback(
    async (page: number) => {
      const onlyFollowing = tab === "following";
      const params: Record<string, string | number> = { page, limit: LIMIT };
      if (onlyFollowing) params.only = "following";

      const res = await api.get(
        onlyFollowing ? endpoints.feed : endpoints.posts,
        { params },
      );
      const list = extractList<Post>(res.data, "posts");
      return {
        list,
        nextPage: nextPageOf(res.data, page, list.length, LIMIT),
        total: paginationOf(res.data)?.total ?? null,
      };
    },
    [tab],
  );

  // First page. silent = refresh without the skeleton.
  const loadFirst = useCallback(
    async (silent = false) => {
      if (!silent) setLoading(true);
      try {
        const { list, nextPage, total } = await fetchPage(1);
        setTotal(total);
        nextPageRef.current = nextPage;
        setPosts(list);
        setHasMore(nextPage !== null);
        setFailed(false);
      } catch (e) {
        if (!silent) setFailed(true);
        toast.error(errMsg(e));
      } finally {
        setLoading(false);
      }
    },
    [fetchPage],
  );

  // Next pages, appended without duplicates
  const loadMore = useCallback(async () => {
    const page = nextPageRef.current;
    if (busyRef.current || page === null) return;
    busyRef.current = true;
    setLoadingMore(true);
    try {
      const { list, nextPage } = await fetchPage(page);
      setPosts((prev) => {
        const seen = new Set(prev.map((p) => p._id));
        const fresh = list.filter((p) => !seen.has(p._id));
        return fresh.length ? [...prev, ...fresh] : prev;
      });
      nextPageRef.current = nextPage;
      setHasMore(nextPage !== null);
    } catch (e) {
      setHasMore(false);
      toast.error(errMsg(e));
    } finally {
      busyRef.current = false;
      setLoadingMore(false);
    }
  }, [fetchPage]);

  useEffect(() => {
    void loadFirst();
  }, [loadFirst]);

  // Load the next page when the bottom of the feed comes into view
  useEffect(() => {
    const el = sentinelRef.current;
    if (!el || !hasMore || loading) return;
    const io = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) void loadMore();
      },
      { rootMargin: "500px" },
    );
    io.observe(el);
    return () => io.disconnect();
  }, [hasMore, loading, loadMore, posts.length]);

  async function handleCreatePost(e: React.FormEvent) {
    e.preventDefault();
    if (!content.trim() && !image) return;
    setSubmitting(true);
    try {
      const fd = new FormData();
      fd.append("body", content);
      if (image) fd.append("image", image);
      await api.post(endpoints.posts, fd);
      setContent("");
      setImage(null);
      toast.success("Posted");
      await loadFirst(true);
    } catch (err) {
      toast.error(errMsg(err));
    } finally {
      setSubmitting(false);
    }
  }

  const firstName = me?.name?.split(" ")[0];

  return (
    <div className="mx-auto grid w-full max-w-6xl items-start gap-6 xl:grid-cols-[minmax(0,1fr)_20rem]">
      {/* ---------- Center: composer + feed ---------- */}
      <div className="min-w-0 space-y-4 sm:space-y-5">
        {/* Composer */}
        <form
          onSubmit={(e) => void handleCreatePost(e)}
          className={`${card} p-4`}
        >
          <div className="flex items-start gap-3">
            <Avatar user={me} className="h-11 w-11" />
            <textarea
              id="post-composer"
              value={content}
              onChange={(e) => setContent(e.target.value)}
              placeholder={`What's on your mind${firstName ? `, ${firstName}` : ""}?`}
              rows={2}
              disabled={submitting}
              className="min-h-[3.25rem] w-full resize-none rounded-2xl border border-indigo-400/15 bg-[#15173f] px-4 py-3 text-base text-slate-100 placeholder:text-slate-400 focus:border-indigo-400 focus:outline-none disabled:opacity-50"
            />
          </div>

          {preview && (
            <div className="relative mt-3">
              <img
                src={preview}
                alt="Selected"
                className="max-h-64 w-full rounded-xl object-cover"
              />
              <button
                type="button"
                onClick={() => setImage(null)}
                aria-label="Remove image"
                className="absolute right-2 top-2 rounded-full bg-slate-950/80 p-1.5 text-white"
              >
                <X className="h-4 w-4" />
              </button>
            </div>
          )}

          <div className="mt-3 flex items-center justify-between gap-3">
            <label className="flex min-h-10 cursor-pointer items-center gap-2 rounded-xl px-3 text-sm font-medium text-slate-300 transition-colors hover:bg-white/5">
              <ImageIcon className="h-5 w-5 text-emerald-400" />
              <span>Photo</span>
              <input
                type="file"
                accept="image/*"
                className="hidden"
                onChange={(e) => setImage(e.target.files?.[0] ?? null)}
              />
            </label>
            <button
              type="submit"
              disabled={submitting || (!content.trim() && !image)}
              className="flex min-h-10 items-center gap-2 rounded-xl bg-indigo-500 px-6 text-sm font-semibold text-white shadow-lg shadow-indigo-500/20 transition-colors hover:bg-indigo-400 disabled:opacity-50"
            >
              {submitting && <Loader2 className="h-4 w-4 animate-spin" />}
              {submitting ? "Posting..." : "Post"}
            </button>
          </div>
        </form>

        {/* Feed filter */}
        <div className={`${card} flex gap-1 p-1`} role="tablist">
          {(["all", "following"] as const).map((t) => (
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
              {t === "all" ? "All posts" : "Following"}
            </button>
          ))}
        </div>

        {!loading && posts.length > 0 && total !== null && (
          <p className="px-1 text-xs text-slate-500">
            Showing {posts.length.toLocaleString()} of {total.toLocaleString()}{" "}
            posts
          </p>
        )}

        {loading &&
          [1, 2, 3].map((n) => (
            <div key={n} className={`${card} h-60 animate-pulse`} />
          ))}

        {!loading && failed && (
          <div className={`${card} py-10 text-center`}>
            <p className="text-slate-300">Couldn't load posts.</p>
            <button
              onClick={() => void loadFirst()}
              className="mt-3 rounded-xl bg-indigo-500 px-5 py-2 text-sm font-semibold text-white hover:bg-indigo-400"
            >
              Try again
            </button>
          </div>
        )}

        {!loading && !failed && posts.length === 0 && (
          <div className={`${card} py-12 text-center text-slate-400`}>
            {tab === "following"
              ? "No posts from people you follow yet."
              : "No posts yet. Write the first one above."}
          </div>
        )}

        {!loading &&
          posts.map((post) => (
            <PostCard
              key={post._id}
              post={post}
              meId={meId}
              following={isFollowing(post.user?._id, post.user?.isFollowing)}
              onFollow={(id) => void toggleFollow(id, post.user?.isFollowing)}
              onReposted={() => void loadFirst(true)}
              onDeleted={(id) =>
                setPosts((list) => list.filter((p) => p._id !== id))
              }
            />
          ))}

        {/* Bottom of the feed: loads more automatically, button as a backup */}
        {!loading && !failed && posts.length > 0 && (
          <div ref={sentinelRef} className="flex justify-center py-4">
            {hasMore ? (
              <button
                onClick={() => void loadMore()}
                disabled={loadingMore}
                className="flex min-h-10 items-center gap-2 rounded-xl border border-white/10 px-5 text-sm font-semibold text-slate-300 hover:bg-white/5 disabled:opacity-60"
              >
                {loadingMore && <Loader2 className="h-4 w-4 animate-spin" />}
                {loadingMore ? "Loading..." : "Load more"}
              </button>
            ) : (
              <p className="text-sm text-slate-500">You're all caught up.</p>
            )}
          </div>
        )}
      </div>

      {/* ---------- Right column (desktop only) ---------- */}
      <div className="hidden xl:block">
        <RightPanel trending={trending} />
      </div>
    </div>
  );
}