import { useCallback, useEffect, useRef, useState, type ChangeEvent } from "react";
import { Link } from "react-router-dom";
import { toast } from "react-toastify";
import {
  Bookmark,
  Check,
  Heart,
  ImagePlus,
  Loader2,
  MessageCircle,
  MoreHorizontal,
  Pencil,
  Send,
  Share2,
  Trash2,
  UserCheck,
  UserPlus,
  X,
} from "lucide-react";
import { api, endpoints, errMsg, extractList } from "../../../Api";
import Avatar from "../Avatar/avatar";
import ProfileLink from "../LinkProfile/LinkProfile";
import { useMe } from "../../Useme";
import type { Comment, Post } from "../../Pages/Types/types";

const COMMENTS_LIMIT = 10;

function timeAgo(date?: string) {
  if (!date) return "Recently";
  const s = Math.max(1, Math.floor((Date.now() - new Date(date).getTime()) / 1000));
  if (s < 60) return "Just now";
  const m = Math.floor(s / 60);
  if (m < 60) return `${m}m ago`;
  const h = Math.floor(m / 60);
  if (h < 24) return `${h}h ago`;
  const d = Math.floor(h / 24);
  if (d < 7) return `${d}d ago`;
  return new Date(date).toLocaleDateString();
}

const actionBtn =
  "flex min-h-10 items-center gap-2 rounded-xl px-3 text-sm font-semibold text-slate-300 transition-colors hover:bg-white/5 active:scale-95";

const menuBox =
  "absolute z-20 overflow-hidden rounded-xl border border-white/10 bg-[#12143a] py-1 shadow-2xl";

/* Close a popup when you tap outside it */
function useOutsideClose(open: boolean, close: () => void) {
  const ref = useRef<HTMLDivElement>(null);
  useEffect(() => {
    if (!open) return;
    const handler = (e: MouseEvent | TouchEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) close();
    };
    document.addEventListener("mousedown", handler);
    document.addEventListener("touchstart", handler);
    return () => {
      document.removeEventListener("mousedown", handler);
      document.removeEventListener("touchstart", handler);
    };
  }, [open, close]);
  return ref;
}
// Some backends refuse a comment with no text, so an image-only comment
// sends an invisible character, and we hide it when showing the comment.
// Image-only posts/comments send this marker; we hide it when showing them.
const BLANK = "📷";
const cleanText = (s?: string) => {
  const t = (s ?? "").trim();
  return t === BLANK ? "" : t;
};
/* ---------------- Input box: text, and optionally an image ---------------- */
function CommentBox({
  placeholder,
  onSubmit,
  small,
  allowImage = true,
}: {
  placeholder: string;
  // return true when it worked, so the box clears itself
  onSubmit: (text: string, file: File | null) => Promise<boolean>;
  small?: boolean;
  allowImage?: boolean;
}) {
  const [text, setText] = useState("");
  const [file, setFile] = useState<File | null>(null);
  const [preview, setPreview] = useState<string | null>(null);
  const [sending, setSending] = useState(false);
  const fileRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (!file) {
      setPreview(null);
      return;
    }
    const url = URL.createObjectURL(file);
    setPreview(url);
    return () => URL.revokeObjectURL(url);
  }, [file]);

  function pick(e: ChangeEvent<HTMLInputElement>) {
    const f = e.target.files?.[0];
    e.target.value = "";
    if (!f) return;
    if (!f.type.startsWith("image/")) {
      toast.error("Please choose an image");
      return;
    }
    setFile(f);
  }

  // Text OR image is enough, you don't have to write anything with a photo
  async function submit() {
    if (sending || (!text.trim() && !file)) return;
    setSending(true);
    const ok = await onSubmit(text, file);
    setSending(false);
    if (ok) {
      setText("");
      setFile(null);
    }
  }

  const btn = small ? "h-9 w-9" : "h-10 w-10";

  return (
    <div className="space-y-2">
      {preview && (
        <div className="relative inline-block">
          <img src={preview} alt="Selected" className="max-h-32 rounded-xl object-cover" />
          <button
            type="button"
            onClick={() => setFile(null)}
            aria-label="Remove image"
            className="absolute -right-2 -top-2 rounded-full bg-slate-800 p-1 text-white shadow hover:bg-red-500"
          >
            <X className="h-3.5 w-3.5" />
          </button>
        </div>
      )}

      <div className="flex items-center gap-2">
        {allowImage && (
          <>
            <input ref={fileRef} type="file" accept="image/*" onChange={pick} className="hidden" />
            <button
              type="button"
              onClick={() => fileRef.current?.click()}
              aria-label="Add image"
              className={`flex ${btn} shrink-0 items-center justify-center rounded-full text-slate-400 hover:bg-white/5 hover:text-indigo-400`}
            >
              <ImagePlus className="h-5 w-5" />
            </button>
          </>
        )}

        <input
          value={text}
          onChange={(e) => setText(e.target.value)}
          onKeyDown={(e) => e.key === "Enter" && void submit()}
          placeholder={placeholder}
          className={`min-w-0 flex-1 rounded-full border border-indigo-400/15 bg-[#15173f] text-base text-slate-100 placeholder:text-slate-400 focus:border-indigo-400 focus:outline-none ${
            small ? "px-3.5 py-2" : "px-4 py-2.5"
          }`}
        />

        <button
          type="button"
          onClick={() => void submit()}
          disabled={sending || (!text.trim() && !file)}
          aria-label="Send"
          className={`flex ${btn} shrink-0 items-center justify-center rounded-full bg-indigo-500 text-white hover:bg-indigo-400 disabled:opacity-50`}
        >
          {sending ? <Loader2 className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />}
        </button>
      </div>
    </div>
  );
}

/* ---------------- Comment, or a reply (isReply = no further replies) ---------------- */
function CommentItem({
  comment,
  postId,
  meId,
  onEdited,
  onRemoved,
  isReply = false,
}: {
  comment: Comment;
  postId: string;
  meId: string | null;
  onEdited: () => void;
  onRemoved: () => void;
  isReply?: boolean;
}) {
  const creator = comment.commentCreator ?? comment.user;
  const mine = !!meId && creator?._id === meId;
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState(comment.content ?? "");
  const [busy, setBusy] = useState(false);

  const [liked, setLiked] = useState(
    !!meId &&
      Array.isArray(comment.likes) &&
      comment.likes.some((l) => (typeof l === "string" ? l : l._id) === meId),
  );
  const [likes, setLikes] = useState(comment.likesCount ?? comment.likes?.length ?? 0);

  // Replies exist only under a comment, not under a reply
  const [showReplies, setShowReplies] = useState(false);
  const [replies, setReplies] = useState<Comment[]>(comment.replies ?? []);
  const [replyCount, setReplyCount] = useState(comment.repliesCount ?? comment.replies?.length ?? 0);
  const [loadingReplies, setLoadingReplies] = useState(false);

  async function toggleLike() {
    const next = !liked;
    setLiked(next);
    setLikes((c) => Math.max(0, c + (next ? 1 : -1)));
    try {
      await api.put(endpoints.commentLike(postId, comment._id));
    } catch (e) {
      setLiked(!next);
      setLikes((c) => Math.max(0, c + (next ? -1 : 1)));
      toast.error(errMsg(e));
    }
  }

  async function save() {
    if (!draft.trim()) return;
    setBusy(true);
    try {
      const fd = new FormData();
      fd.append("content", draft);
      await api.put(endpoints.comment(postId, comment._id), fd);
      setEditing(false);
      onEdited();
    } catch (e) {
      toast.error(errMsg(e));
    } finally {
      setBusy(false);
    }
  }

  async function remove() {
    if (!window.confirm(isReply ? "Delete this reply?" : "Delete this comment?")) return;
    try {
      await api.delete(endpoints.comment(postId, comment._id));
      onRemoved();
    } catch (e) {
      toast.error(errMsg(e));
    }
  }

  // GET /posts/:postId/comments/:commentId/replies
  async function loadReplies() {
    setLoadingReplies(true);
    try {
      const res = await api.get(endpoints.replies(postId, comment._id));
      let list = extractList<Comment>(res.data, "replies");
      if (list.length === 0) list = extractList<Comment>(res.data, "comments");
      setReplies(list);
      setReplyCount(list.length);
    } catch (e) {
      toast.error(errMsg(e));
    } finally {
      setLoadingReplies(false);
    }
  }

  function toggleReplies() {
    const next = !showReplies;
    setShowReplies(next);
    if (next) void loadReplies();
  }

  // POST /posts/:postId/comments/:commentId/replies  (text only)
  async function sendReply(text: string) {
    if (!text.trim()) return false;
    try {
      const fd = new FormData();
      fd.append("content", text);
      await api.post(endpoints.replies(postId, comment._id), fd);
      await loadReplies();
      return true;
    } catch (e) {
      toast.error(errMsg(e));
      return false;
    }
  }

  return (
    <div className="flex items-start gap-2.5">
      <ProfileLink user={creator} className="mt-0.5 shrink-0">
        <Avatar user={creator} className={isReply ? "h-7 w-7" : "h-8 w-8"} />
      </ProfileLink>
      <div className="min-w-0 flex-1">
        <div className="rounded-2xl rounded-tl-md bg-white/5 px-3.5 py-2.5">
          <ProfileLink user={creator} className="text-xs font-bold text-white hover:underline">
            {creator?.name}
          </ProfileLink>
          {editing ? (
            <div className="mt-1.5 flex items-center gap-1.5">
              <input
                autoFocus
                value={draft}
                onChange={(e) => setDraft(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === "Enter") void save();
                  if (e.key === "Escape") setEditing(false);
                }}
                className="min-w-0 flex-1 rounded-lg border border-white/10 bg-[#15173f] px-2.5 py-1.5 text-base text-slate-100 focus:border-indigo-400 focus:outline-none"
              />
              <button
                onClick={() => void save()}
                disabled={busy}
                aria-label="Save"
                className="rounded-lg bg-indigo-500 p-2 text-white disabled:opacity-50"
              >
                {busy ? <Loader2 className="h-4 w-4 animate-spin" /> : <Check className="h-4 w-4" />}
              </button>
              <button
                onClick={() => {
                  setEditing(false);
                  setDraft(comment.content ?? "");
                }}
                aria-label="Cancel"
                className="rounded-lg bg-slate-700 p-2 text-slate-200"
              >
                <X className="h-4 w-4" />
              </button>
            </div>
          ) : (
            <>
              {comment.content && (
                <p className="mt-0.5 whitespace-pre-wrap break-words text-sm text-slate-200">
                  {comment.content}
                </p>
              )}
              {comment.image && (
                <img
                  src={comment.image}
                  alt="Attachment"
                  loading="lazy"
                  className="mt-2 max-h-60 rounded-xl object-cover"
                />
              )}
            </>
          )}
        </div>

        <div className="mt-1 flex items-center gap-3 px-2 text-xs text-slate-500">
          <span>{timeAgo(comment.createdAt)}</span>
          <button
            onClick={() => void toggleLike()}
            aria-pressed={liked}
            className={`flex items-center gap-1 font-semibold ${liked ? "text-rose-400" : "hover:text-rose-400"}`}
          >
            <Heart className={`h-3.5 w-3.5 ${liked ? "fill-rose-500" : ""}`} />
            {likes > 0 && likes}
          </button>

          {/* Reply button: comments only */}
          {!isReply && (
            <button
              onClick={toggleReplies}
              aria-expanded={showReplies}
              className={`font-semibold ${showReplies ? "text-indigo-400" : "hover:text-indigo-400"}`}
            >
              Reply{replyCount > 0 ? ` (${replyCount})` : ""}
            </button>
          )}

          {mine && !editing && (
            <>
              <button onClick={() => setEditing(true)} className="font-semibold hover:text-indigo-400">
                Edit
              </button>
              <button onClick={() => void remove()} className="font-semibold hover:text-red-400">
                Delete
              </button>
            </>
          )}
        </div>

        {!isReply && showReplies && (
          <div className="mt-2 space-y-2.5 border-l border-white/10 pl-3">
            {loadingReplies && replies.length === 0 && (
              <div className="flex py-1 text-slate-500">
                <Loader2 className="h-4 w-4 animate-spin" />
              </div>
            )}

            {replies.map((r) => (
              <CommentItem
                key={r._id}
                comment={r}
                postId={postId}
                meId={meId}
                isReply
                onEdited={() => void loadReplies()}
                onRemoved={() => {
                  setReplyCount((n) => Math.max(0, n - 1));
                  void loadReplies();
                }}
              />
            ))}

            <CommentBox
              small
              allowImage={false}
              placeholder={`Reply to ${creator?.name?.split(" ")[0] ?? "this comment"}...`}
              onSubmit={(text) => sendReply(text)}
            />
          </div>
        )}
      </div>
    </div>
  );
}

/* ---------------- Post ---------------- */
type Props = {
  post: Post;
  meId: string | null;
  following: boolean;
  onFollow: (userId: string) => void;
  onReposted: () => void;
  onDeleted: (postId: string) => void;
  // true on the Bookmarks page, where every post is already saved
  startSaved?: boolean;
};

export default function PostCard({
  post,
  meId,
  following,
  onFollow,
  onReposted,
  onDeleted,
  startSaved,
}: Props) {
  const mine = !!meId && post.user?._id === meId;

  const [body, setBody] = useState(post.body ?? "");

  const [liked, setLiked] = useState(
    !!meId &&
      Array.isArray(post.likes) &&
      post.likes.some((l) => (typeof l === "string" ? l : l._id) === meId),
  );
  const [likeCount, setLikeCount] = useState(post.likesCount ?? post.likes?.length ?? 0);
  // Saved state is shared (Useme), so a post saved earlier shows as saved here too
  const { isBookmarked, toggleBookmark } = useMe();
  const savedFlag = startSaved ?? post.bookmarked ?? post.isBookmarked;
  const saved = isBookmarked(post._id, savedFlag);
  const [shareCount, setShareCount] = useState(post.sharesCount ?? 0);

  const [menuOpen, setMenuOpen] = useState(false);
  const closeMenu = useCallback(() => setMenuOpen(false), []);
  const menuRef = useOutsideClose(menuOpen, closeMenu);

  const [shareOpen, setShareOpen] = useState(false);
  const closeShare = useCallback(() => setShareOpen(false), []);
  const shareRef = useOutsideClose(shareOpen, closeShare);

  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState(post.body ?? "");
  const [savingEdit, setSavingEdit] = useState(false);

  // Comments live here, loaded from the comments endpoint
  const [showComments, setShowComments] = useState(false);
  const [comments, setComments] = useState<Comment[]>(post.comments ?? []);
  const [commentCount, setCommentCount] = useState(post.commentsCount ?? post.comments?.length ?? 0);
  const [commentsPage, setCommentsPage] = useState(1);
  const [hasMoreComments, setHasMoreComments] = useState(false);
  const [loadingComments, setLoadingComments] = useState(false);

  const loadComments = useCallback(
    async (page = 1) => {
      setLoadingComments(true);
      try {
        const res = await api.get(endpoints.comments(post._id), {
          params: { page, limit: COMMENTS_LIMIT },
        });
        const list = extractList<Comment>(res.data, "comments");
        setComments((prev) => {
          if (page === 1) return list;
          const seen = new Set(prev.map((c) => c._id));
          return [...prev, ...list.filter((c) => !seen.has(c._id))];
        });
        setCommentsPage(page);
        setHasMoreComments(list.length >= COMMENTS_LIMIT);
        if (page === 1 && list.length < COMMENTS_LIMIT) setCommentCount(list.length);
      } catch (e) {
        toast.error(errMsg(e));
      } finally {
        setLoadingComments(false);
      }
    },
    [post._id],
  );

  function toggleComments() {
    const next = !showComments;
    setShowComments(next);
    if (next) void loadComments(1);
  }

  async function toggleLike() {
    const next = !liked;
    setLiked(next);
    setLikeCount((c) => Math.max(0, c + (next ? 1 : -1)));
    try {
      await api.put(endpoints.like(post._id));
    } catch (e) {
      setLiked(!next);
      setLikeCount((c) => Math.max(0, c + (next ? -1 : 1)));
      toast.error(errMsg(e));
    }
  }

  // Saving shows no message, the icon just fills in
  function toggleSave() {
    void toggleBookmark(post._id, savedFlag);
  }

  // Repost to your own feed (POST /posts/:id/share)
  async function repost() {
    setShareOpen(false);
    const caption = window.prompt("Add a caption (optional)", "");
    if (caption === null) return;
    try {
      await api.post(endpoints.share(post._id), { body: caption });
      setShareCount((c) => c + 1);
      toast.success("Shared to your feed");
      onReposted();
    } catch (e) {
      toast.error(errMsg(e));
    }
  }

  // Send the link through the phone's share sheet, or copy it
  async function shareLink() {
    setShareOpen(false);
    const url = `${window.location.origin}/posts/${post._id}`;
    try {
      if (navigator.share) {
        await navigator.share({ title: `${post.user?.name} on Mohamed Abdo`, text: body, url });
      } else {
        await navigator.clipboard.writeText(url);
        toast.success("Link copied");
      }
    } catch {
      // user closed the share sheet
    }
  }

  async function saveEdit() {
    if (!draft.trim()) return;
    setSavingEdit(true);
    try {
      const fd = new FormData();
      fd.append("body", draft);
      await api.put(endpoints.post(post._id), fd);
      setBody(draft);
      setEditing(false);
      toast.success("Post updated");
    } catch (e) {
      toast.error(errMsg(e));
    } finally {
      setSavingEdit(false);
    }
  }

  async function removePost() {
    setMenuOpen(false);
    if (!window.confirm("Delete this post?")) return;
    try {
      await api.delete(endpoints.post(post._id));
      toast.success("Post deleted");
      onDeleted(post._id);
    } catch (e) {
      toast.error(errMsg(e));
    }
  }

  // New top-level comment: text, image, or both
  async function addComment(text: string, file: File | null) {
    try {
      const fd = new FormData();
      if (text.trim()) fd.append("content", text);
      if (file) fd.append("image", file);
      await api.post(endpoints.comments(post._id), fd);
      setCommentCount((c) => c + 1);
      setShowComments(true);
      await loadComments(1);
      return true;
    } catch (e) {
      toast.error(errMsg(e));
      return false;
    }
  }

  return (
    <article className="overflow-hidden rounded-2xl border border-indigo-500/10 bg-[#0d0f2b] shadow-xl shadow-black/20">
      {/* Header */}
      <div className="flex items-center justify-between gap-3 p-4 pb-3">
        <div className="flex min-w-0 items-center gap-3">
          <ProfileLink user={post.user} className="shrink-0">
            <Avatar user={post.user} className="h-12 w-12" />
          </ProfileLink>
          <div className="min-w-0">
            <h3 className="truncate text-[15px] font-bold text-white">
              <ProfileLink user={post.user} className="hover:underline">
                {post.user?.name ?? "Anonymous"}
              </ProfileLink>
            </h3>
            <div className="flex items-center gap-1.5 text-xs text-slate-400">
              {post.user?.username && (
                <>
                  <ProfileLink user={post.user} className="truncate hover:text-indigo-400">
                    @{post.user.username}
                  </ProfileLink>
                  <span>·</span>
                </>
              )}
              <Link to={`/posts/${post._id}`} className="shrink-0 hover:text-indigo-400 hover:underline">
                {timeAgo(post.createdAt)}
              </Link>
            </div>
          </div>
        </div>

        {mine ? (
          <div className="relative" ref={menuRef}>
            <button
              onClick={() => setMenuOpen((o) => !o)}
              aria-label="Post options"
              aria-expanded={menuOpen}
              className="rounded-xl p-2 text-slate-400 transition-colors hover:bg-white/5 hover:text-white"
            >
              <MoreHorizontal className="h-5 w-5" />
            </button>
            {menuOpen && (
              <div className={`${menuBox} right-0 top-full mt-1 w-40`}>
                <button
                  onClick={() => {
                    setMenuOpen(false);
                    setDraft(body);
                    setEditing(true);
                  }}
                  className="flex w-full items-center gap-2.5 px-3.5 py-2.5 text-sm text-slate-200 hover:bg-white/5"
                >
                  <Pencil className="h-4 w-4" /> Edit post
                </button>
                <button
                  onClick={() => void removePost()}
                  className="flex w-full items-center gap-2.5 px-3.5 py-2.5 text-sm text-red-400 hover:bg-red-500/10"
                >
                  <Trash2 className="h-4 w-4" /> Delete post
                </button>
              </div>
            )}
          </div>
        ) : (
          post.user?._id && (
            <button
              onClick={() => onFollow(post.user._id)}
              className={`flex min-h-9 shrink-0 items-center gap-1.5 rounded-full px-3.5 text-xs font-semibold transition-colors ${
                following
                  ? "border border-white/10 text-slate-300 hover:bg-white/5"
                  : "bg-indigo-500 text-white hover:bg-indigo-400"
              }`}
            >
              {following ? <UserCheck className="h-4 w-4" /> : <UserPlus className="h-4 w-4" />}
              {following ? "Following" : "Follow"}
            </button>
          )
        )}
      </div>

      {/* Body */}
      <div className="px-4 pb-3">
        {editing ? (
          <div className="space-y-2">
            <textarea
              autoFocus
              rows={3}
              value={draft}
              onChange={(e) => setDraft(e.target.value)}
              className="w-full resize-none rounded-xl border border-white/10 bg-[#15173f] px-3.5 py-3 text-base text-slate-100 focus:border-indigo-400 focus:outline-none"
            />
            <div className="flex justify-end gap-2">
              <button
                onClick={() => setEditing(false)}
                className="rounded-xl border border-white/10 px-4 py-2 text-sm font-semibold text-slate-300 hover:bg-white/5"
              >
                Cancel
              </button>
              <button
                onClick={() => void saveEdit()}
                disabled={savingEdit}
                className="flex items-center gap-2 rounded-xl bg-indigo-500 px-4 py-2 text-sm font-semibold text-white hover:bg-indigo-400 disabled:opacity-60"
              >
                {savingEdit && <Loader2 className="h-4 w-4 animate-spin" />} Save changes
              </button>
            </div>
          </div>
        ) : (
          body && (
            <p className="whitespace-pre-wrap break-words text-[15px] leading-relaxed text-slate-200">
              {body}
            </p>
          )
        )}
      </div>

      {post.isShare && post.sharedPost && (
        <div className="mx-4 mb-3 overflow-hidden rounded-xl border border-white/10 bg-[#0a0b22]">
          <div className="flex items-center gap-2.5 p-3">
            <ProfileLink user={post.sharedPost.user} className="shrink-0">
              <Avatar user={post.sharedPost.user} className="h-8 w-8" />
            </ProfileLink>
            <div className="min-w-0">
              <ProfileLink
                user={post.sharedPost.user}
                className="block truncate text-sm font-bold text-white hover:underline"
              >
                {post.sharedPost.user?.name}
              </ProfileLink>
              <p className="text-xs text-slate-500">{timeAgo(post.sharedPost.createdAt)}</p>
            </div>
          </div>
          {post.sharedPost.body && (
            <p className="whitespace-pre-wrap break-words px-3 pb-3 text-sm text-slate-300">
              {post.sharedPost.body}
            </p>
          )}
          {post.sharedPost.image && (
            <img src={post.sharedPost.image} alt="Shared post" loading="lazy" className="mx-auto max-h-[70vh] w-full object-contain" />
          )}
        </div>
      )}

      {/* Image sits inside the card with rounded corners, like the design */}
      {post.image && (
        <div className="mx-4 mb-3 overflow-hidden rounded-xl bg-[#0a0b22]">
          <img
            src={post.image}
            alt="Post attachment"
            loading="lazy"
            className="mx-auto max-h-[85vh] w-full object-contain"
          />
        </div>
      )}

      {/* Actions: heart, comments, share, and bookmark on the right */}
      <div className="flex items-center gap-1 px-3 pb-3">
        <button
          onClick={() => void toggleLike()}
          aria-pressed={liked}
          aria-label={liked ? "Unlike" : "Like"}
          className={`${actionBtn} ${liked ? "text-rose-400" : "hover:text-rose-400"}`}
        >
          <Heart className={`h-5 w-5 ${liked ? "fill-rose-500 text-rose-500" : ""}`} />
          {likeCount}
        </button>

        <button
          onClick={toggleComments}
          aria-label="Comments"
          aria-expanded={showComments}
          className={`${actionBtn} ${showComments ? "text-indigo-400" : "hover:text-indigo-400"}`}
        >
          <MessageCircle className="h-5 w-5" />
          {commentCount}
        </button>

        <div className="relative" ref={shareRef}>
          <button
            onClick={() => setShareOpen((o) => !o)}
            aria-label="Share"
            aria-expanded={shareOpen}
            className={`${actionBtn} ${shareOpen ? "text-violet-400" : "hover:text-violet-400"}`}
          >
            <Share2 className="h-5 w-5" />
            {shareCount}
          </button>
          {shareOpen && (
            <div className={`${menuBox} bottom-full left-0 mb-1 w-48`}>
              <button
                onClick={() => void repost()}
                className="flex w-full items-center gap-2.5 px-3.5 py-2.5 text-sm text-slate-200 hover:bg-white/5"
              >
                <Share2 className="h-4 w-4" /> Share to your feed
              </button>
              <button
                onClick={() => void shareLink()}
                className="flex w-full items-center gap-2.5 px-3.5 py-2.5 text-sm text-slate-200 hover:bg-white/5"
              >
                <Send className="h-4 w-4" /> Send link
              </button>
            </div>
          )}
        </div>

        <button
          onClick={toggleSave}
          aria-pressed={saved}
          aria-label={saved ? "Unsave post" : "Save post"}
          className={`${actionBtn} ml-auto ${saved ? "text-amber-400" : "hover:text-amber-400"}`}
        >
          <Bookmark className={`h-5 w-5 ${saved ? "fill-amber-400" : ""}`} />
        </button>
      </div>

      {/* Top comment preview (the feed only sends this one) */}
      {!showComments && post.topComment && (
        <div
          role="button"
          tabIndex={0}
          onClick={toggleComments}
          onKeyDown={(e) => e.key === "Enter" && toggleComments()}
          className="flex w-full cursor-pointer items-start gap-2.5 border-t border-white/5 px-4 pb-4 pt-3 text-left"
        >
          <ProfileLink
            user={post.topComment.commentCreator}
            onClick={(e) => e.stopPropagation()}
            className="mt-0.5 shrink-0"
          >
            <Avatar user={post.topComment.commentCreator} className="h-8 w-8" />
          </ProfileLink>
          <div className="min-w-0 rounded-2xl rounded-tl-md bg-white/5 px-3.5 py-2.5">
            <ProfileLink
              user={post.topComment.commentCreator}
              onClick={(e) => e.stopPropagation()}
              className="text-xs font-bold text-white hover:underline"
            >
              {post.topComment.commentCreator?.name}
            </ProfileLink>
            {post.topComment.content && (
              <p className="mt-0.5 line-clamp-2 break-words text-sm text-slate-200">{post.topComment.content}</p>
            )}
            {post.topComment.image && (
              <img
                src={post.topComment.image}
                alt="Comment attachment"
                loading="lazy"
                className="mt-2 max-h-40 rounded-lg object-cover"
              />
            )}
          </div>
        </div>
      )}

      {/* Comments */}
      {showComments && (
        <div className="space-y-3 border-t border-white/5 p-4">
          {loadingComments && comments.length === 0 && (
            <div className="flex justify-center py-2 text-slate-500">
              <Loader2 className="h-5 w-5 animate-spin" />
            </div>
          )}

          {comments.map((c) => (
            <CommentItem
              key={c._id}
              comment={c}
              postId={post._id}
              meId={meId}
              onEdited={() => void loadComments(1)}
              onRemoved={() => {
                setCommentCount((n) => Math.max(0, n - 1));
                void loadComments(1);
              }}
            />
          ))}

          {hasMoreComments && (
            <button
              onClick={() => void loadComments(commentsPage + 1)}
              disabled={loadingComments}
              className="text-xs font-semibold text-slate-400 hover:text-indigo-400 disabled:opacity-60"
            >
              {loadingComments ? "Loading..." : "View more comments"}
            </button>
          )}

          {!loadingComments && comments.length === 0 && (
            <p className="text-sm text-slate-500">No comments yet. Start the conversation.</p>
          )}

          <div className="pt-1">
            <CommentBox placeholder="Write a comment..." onSubmit={addComment} />
          </div>
        </div>
      )}
    </article>
  );
}