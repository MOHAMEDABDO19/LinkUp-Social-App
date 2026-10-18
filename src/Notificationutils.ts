import type { AppNotification } from "./Pages/Types/types";

type Loose = Record<string, unknown>;

const asObj = (v: unknown): Loose | null =>
  v && typeof v === "object" ? (v as Loose) : null;

// An id can come as a string or as an object with _id / id
const idOf = (v: unknown): string | null => {
  if (!v) return null;
  if (typeof v === "string") return v;
  const o = asObj(v);
  if (!o) return null;
  const id = o._id ?? o.id;
  return typeof id === "string" ? id : null;
};

export function timeAgo(date?: string) {
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

// The text comes from the type: follow_user, like_post, comment_post, ...
export function describe(n: AppNotification): string {
  if (n.message) return n.message;
  const type = String(n.type ?? "").toLowerCase();
  if (type.includes("follow")) return "started following you";
  if (type.includes("reply")) return "replied to your comment";
  if (type.includes("like") && type.includes("comment")) return "liked your comment";
  if (type.includes("comment")) return "commented on your post";
  if (type.includes("share")) return "shared your post";
  if (type.includes("like")) return "liked your post";
  if (type.includes("mention")) return "mentioned you";
  return "sent you a notification";
}

// A deleted post comes back as { unavailable: true }
export const unavailable = (n: AppNotification) =>
  asObj((n as unknown as Loose).entity)?.unavailable === true;

// Find the post id wherever the API put it
function postIdOf(n: AppNotification): string | null {
  const raw = n as unknown as Loose;
  const kind = String(raw.entityType ?? "").toLowerCase();
  const entity = asObj(raw.entity);

  // The notification is about a post itself (like / share / mention)
  if (kind === "post") return idOf(raw.entityId) ?? idOf(entity);

  // The notification is about a comment or reply: the post is inside it
  return (
    idOf(entity?.post) ??
    idOf(entity?.postId) ??
    idOf(raw.post) ??
    idOf(raw.postId) ??
    null
  );
}

// Where a click goes: the post, or the person's profile for follows
export function linkFor(n: AppNotification): string | null {
  if (unavailable(n)) return null;

  const raw = n as unknown as Loose;
  const type = String(raw.type ?? "").toLowerCase();
  const kind = String(raw.entityType ?? "").toLowerCase();

  if (type.includes("follow")) {
    const actorId = idOf(raw.actor);
    return actorId ? `/profile/${actorId}` : null;
  }

  const postId = postIdOf(n);
  if (postId) return `/posts/${postId}`;

  if (kind === "user") {
    const userId = idOf(raw.entityId);
    if (userId) return `/profile/${userId}`;
  }

  return null;
}