import type { AppNotification } from "./Pages/Types/types";

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
export const unavailable = (n: AppNotification) => n.entity?.unavailable === true;

// Where a click goes: the post, or the person's profile for follows
export function linkFor(n: AppNotification): string | null {
  if (n.entityType === "post" && n.entityId && !unavailable(n)) return `/posts/${n.entityId}`;
  if (n.entityType === "user" && n.entityId) return `/profile/${n.entityId}`;
  if (String(n.type).includes("follow") && n.actor?._id) return `/profile/${n.actor._id}`;
  return null;
}