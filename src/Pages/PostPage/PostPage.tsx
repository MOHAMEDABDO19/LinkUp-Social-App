import { useEffect, useState } from "react";
import { Link, useNavigate, useParams } from "react-router-dom";
import { toast } from "react-toastify";
import { ArrowLeft } from "lucide-react";
import { api, endpoints, errMsg } from "../../../Api";
import { useMe } from "../../Useme";
import PostCard from "../../Components/PostCard/PostCard";
import type { Post } from "../Types/types";

export default function PostPage() {
  const { id } = useParams();
  const navigate = useNavigate();
  const { meId, isFollowing, toggleFollow } = useMe();

  const [post, setPost] = useState<Post | null>(null);
  const [loading, setLoading] = useState(true);
  const [failed, setFailed] = useState(false);

  useEffect(() => {
    if (!id) return;
    setLoading(true);
    setFailed(false);
    setPost(null);
    api
      .get(endpoints.post(id))
      .then((r) => {
        const d = (r.data as { data?: { post?: Post } & Post; post?: Post })?.data;
        const p = d?.post ?? (d?._id ? (d as Post) : undefined) ?? (r.data as { post?: Post }).post;
        if (p?._id) setPost(p);
        else setFailed(true);
      })
      .catch((e) => {
        setFailed(true);
        toast.error(errMsg(e));
      })
      .finally(() => setLoading(false));
  }, [id]);

  return (
    <div className="mx-auto w-full max-w-2xl space-y-4">
      <Link
        to="/home"
        className="inline-flex min-h-10 items-center gap-2 rounded-xl px-3 text-sm font-semibold text-slate-300 hover:bg-white/5"
      >
        <ArrowLeft className="h-4 w-4" /> Back to feed
      </Link>

      {loading && <div className="h-72 animate-pulse rounded-2xl border border-white/10 bg-slate-900/70" />}

      {!loading && failed && (
        <div className="rounded-2xl border border-white/10 bg-slate-900/70 py-12 text-center text-slate-400">
          This post doesn't exist or was deleted.
        </div>
      )}

      {post && (
        <PostCard
          key={post._id}
          post={post}
          meId={meId}
          following={isFollowing(post.user?._id, post.user?.isFollowing)}
          onFollow={(uid) => void toggleFollow(uid, post.user?.isFollowing)}
          onReposted={() => navigate("/home")}
          onDeleted={() => navigate("/home")}
        />
      )}
    </div>
  );
}