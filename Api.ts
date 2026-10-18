import axios from "axios";

// One place to change if an endpoint or method differs on your backend.
export const api = axios.create({ baseURL: "https://route-posts.routemisr.com" });

api.interceptors.request.use((config) => {
  const token = localStorage.getItem("token");
  if (token) config.headers.Authorization = `Bearer ${token}`;
  return config;
});

export const endpoints = {
  posts: "/posts", // GET all, POST create (formdata: body, image)
  post: (id: string) => `/posts/${id}`, // GET one, PUT edit, DELETE remove
  like: (id: string) => `/posts/${id}/like`, // PUT toggle
  bookmark: (id: string) => `/posts/${id}/bookmark`, // PUT toggle
  share: (id: string) => `/posts/${id}/share`, // POST { body } (repost)
  feed: "/posts/feed", // GET ?only=following&limit=10 (also page/limit, hasImage)
  comments: (postId: string) => `/posts/${postId}/comments`, // GET list, POST create (formdata: content, image)
  comment: (postId: string, commentId: string) =>
    `/posts/${postId}/comments/${commentId}`, // PUT edit (formdata), DELETE remove
  commentLike: (postId: string, commentId: string) =>
    `/posts/${postId}/comments/${commentId}/like`, // PUT toggle
  replies: (postId: string, commentId: string) =>
    `/posts/${postId}/comments/${commentId}/replies`, // GET list, POST create (formdata: content)  <- check the path in Postman
  follow: (userId: string) => `/users/${userId}/follow`, // PUT toggle
  me: "/users/profile-data", // GET current user
  suggestions: "/users/suggestions", // GET ?limit=10  (who to follow)
  bookmarks: "/users/bookmarks", // GET saved posts
  userProfile: (userId: string) => `/users/${userId}/profile`, // GET
  userPosts: (userId: string) => `/users/${userId}/posts`, // GET
  uploadPhoto: "/users/upload-photo", // PUT formdata: photo
  changePassword: "/users/change-password", // PATCH { password, newPassword }

  // Notifications
  notifications: "/notifications", // GET ?unread=false&page=1&limit=10
  unreadCount: "/notifications/unread-count", // GET -> { data: { unreadCount } }
  notificationRead: (id: string) => `/notifications/${id}/read`, // PATCH
  notificationsReadAll: "/notifications/read-all", // PATCH
};

export function errMsg(e: unknown): string {
  if (axios.isAxiosError(e)) {
    const m = (e.response?.data as { message?: string } | undefined)?.message;
    return m ?? e.message;
  }
  return "Something went wrong";
}

// Fallback: read the user id from the JWT if the profile request fails.
export function tokenUserId(): string | null {
  try {
    const part = localStorage.getItem("token")?.split(".")[1];
    if (!part) return null;
    const json = atob(part.replace(/-/g, "+").replace(/_/g, "/"));
    const p = JSON.parse(json) as { user?: string; id?: string; _id?: string };
    return p.user ?? p.id ?? p._id ?? null;
  } catch {
    return null;
  }
}

// The API wraps lists differently from one response to another
// ({ posts }, { data: { posts } }, ...), so dig the array out by key.
export function extractList<T>(res: unknown, key: string): T[] {
  if (Array.isArray(res)) return res as T[];
  if (res && typeof res === "object") {
    const o = res as Record<string, unknown>;
    if (o[key] !== undefined) return extractList<T>(o[key], key);
    if (o.data !== undefined) return extractList<T>(o.data, key);
  }
  return [];
}

type Pagination = {
  nextPage?: number | null;
  currentPage?: number;
  numberOfPages?: number;
  total?: number;
};

export function paginationOf(res: unknown): Pagination | undefined {
  return (res as { meta?: { pagination?: Pagination } } | undefined)?.meta?.pagination;
}

// The server sends { currentPage, numberOfPages, total } (no nextPage),
// so work out the next page from those. Falls back to "full page = maybe more".
export function nextPageOf(
  res: unknown,
  page: number,
  listLength: number,
  limit: number,
): number | null {
  const pg = paginationOf(res);
  if (pg) {
    if (pg.nextPage !== undefined) return pg.nextPage ?? null;
    if (typeof pg.numberOfPages === "number") {
      return page < pg.numberOfPages ? page + 1 : null;
    }
  }
  return listLength >= limit ? page + 1 : null;
}