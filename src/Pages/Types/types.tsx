export type User = {
  _id: string;
  name: string;
  username?: string;
  photo?: string;
  email?: string;
  bio?: string;
  // the server may tell us if I already follow this user
  isFollowing?: boolean;
  followersCount?: number;
  followingCount?: number;
  postsCount?: number;
  // the profile request may send these as ids or as full users
  following?: (User | string)[];
  followers?: (User | string)[];
};

type Likes = (string | { _id: string })[];

export type Comment = {
  _id: string;
  content?: string;
  image?: string;
  commentCreator: User;
  user?: User;
  createdAt: string;
  likes?: Likes;
  likesCount?: number;
  repliesCount?: number;
  replies?: Comment[];
};

export type Post = {
  _id: string;
  body?: string;
  image?: string;
  user: User;
  createdAt: string;
  likes?: Likes;
  likesCount?: number;
  commentsCount?: number;
  comments?: Comment[];
  topComment?: Comment | null;
  sharesCount?: number;
  isShare?: boolean;
  sharedPost?: Post | null;
  bookmarked?: boolean;
  isBookmarked?: boolean;
};

// GET /notifications  ->  data.notifications[]
export type AppNotification = {
  _id: string;
  // e.g. "follow_user", "like_post", "comment_post", "share_post"
  type?: string;
  // what the notification points at: "post" | "user" | ...
  entityType?: string;
  entityId?: string;
  isRead?: boolean;
  createdAt?: string;
  message?: string;
  actor?: Partial<User> | null;
  recipient?: Partial<User> | null;
  // for a deleted post the server sends { _id, unavailable: true }
  entity?: (Partial<User> & { _id: string; unavailable?: boolean }) | null;
};