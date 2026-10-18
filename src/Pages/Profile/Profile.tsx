import { useCallback, useEffect, useRef, useState } from "react";
import { useParams, useSearchParams } from "react-router-dom";
import { toast } from "react-toastify";
import {
  Camera,
  Loader2,
  Moon,
  Settings,
  Sun,
  UserCheck,
  UserPlus,
  X,
} from "lucide-react";
import { api, endpoints, errMsg, extractList, nextPageOf } from "../../../Api";
import { useMe } from "../../Useme";
import { useTheme } from "../../Usethem";
import Avatar from "../../Components/Avatar/avatar";
import ProfileLink from "../../Components/LinkProfile/LinkProfile";
import Composer from "../../Components/Composer/Composer";
import PostCard from "../../Components/PostCard/PostCard";
import type { Post, User } from "../Types/types";

const LIMIT = 20;
const card = "rounded-2xl border border-indigo-500/10 bg-[#0d0f2b]";
const PASSWORD_RULE =
  /^(?=.*[A-Z])(?=.*[a-z])(?=.*\d)(?=.*[@$!%*?&])[A-Za-z\d@$!%*?&]{6,15}$/;

const inputClass =
  "w-full min-h-11 rounded-xl border border-slate-700/70 bg-[#15173f] px-4 py-2.5 text-base text-white placeholder-slate-500 outline-none transition-all hover:border-slate-600 focus:border-indigo-400 focus:ring-2 focus:ring-indigo-500/30";

// /profile = my page, /profile/:userId = someone else's page
export default function Profile() {
  const { userId } = useParams<{ userId: string }>();
  const { meId, refreshMe, isFollowing, toggleFollow } = useMe();

  const own = !userId || userId === meId;
  const targetId = own ? meId : userId;

  const [profile, setProfile] = useState<User | null>(null);
  const [loadingProfile, setLoadingProfile] = useState(true);
  const [uploading, setUploading] = useState(false);
  const fileRef = useRef<HTMLInputElement>(null);

  const [posts, setPosts] = useState<Post[]>([]);
  const [loadingPosts, setLoadingPosts] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  const [hasMore, setHasMore] = useState(false);
  const nextPageRef = useRef<number | null>(null);

  // Followers count as the server sent it, plus my own follow/unfollow since then
  const [followerDelta, setFollowerDelta] = useState(0);

  // Change password
  const [showPassword, setShowPassword] = useState(false);
  const [oldPassword, setOldPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [savingPassword, setSavingPassword] = useState(false);

  const { theme, setTheme } = useTheme();

  const [searchParams, setSearchParams] = useSearchParams();
  const [photoOpen, setPhotoOpen] = useState(false);

  // /profile?settings=1 (the sidebar's Settings link) opens the settings panel
  useEffect(() => {
    if (own && searchParams.get("settings")) setShowPassword(true);
  }, [own, searchParams]);

  // ...and scrolls to it once the page has loaded
  useEffect(() => {
    if (showPassword && !loadingProfile && searchParams.get("settings")) {
      document
        .getElementById("settings")
        ?.scrollIntoView({ behavior: "smooth", block: "start" });
    }
  }, [showPassword, loadingProfile, searchParams]);

  function closeSettings() {
    setShowPassword(false);
    if (searchParams.has("settings")) setSearchParams({}, { replace: true });
  }

  // Opens the picture in full size (works on anyone's profile)
  useEffect(() => {
    if (!photoOpen) return;
    const onKey = (e: KeyboardEvent) =>
      e.key === "Escape" && setPhotoOpen(false);
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [photoOpen]);

  // Followers / Following list (opens when you tap the number)
  const [listKind, setListKind] = useState<"followers" | "following" | null>(
    null,
  );
  const [listPeople, setListPeople] = useState<User[]>([]);
  const [listLoading, setListLoading] = useState(false);

  // The profile may send these lists as full users or as plain ids.
  // Full users are shown as they are; ids are looked up one by one (first 30).
  async function openList(kind: "followers" | "following") {
    if (!profile) return;
    setListKind(kind);
    setListPeople([]);
    setListLoading(true);
    const entries =
      (kind === "followers" ? profile.followers : profile.following) ?? [];
    const people: User[] = [];
    const ids: string[] = [];
    for (const e of entries) {
      if (typeof e === "string") ids.push(e);
      else if (e?._id) people.push(e);
    }
    const fetched = await Promise.allSettled(
      ids.slice(0, 30).map((id) => api.get(endpoints.userProfile(id))),
    );
    for (const r of fetched) {
      if (r.status !== "fulfilled") continue;
      const d = r.value.data as { data?: { user?: User } & User; user?: User };
      const u = d?.data?.user ?? d?.user ?? (d?.data as User | undefined);
      if (u?._id) people.push(u);
    }
    setListPeople(people);
    setListLoading(false);
  }

  // My own profile: GET /users/profile-data. Someone else: GET /users/:id/profile
  const loadProfile = useCallback(async () => {
    if (!targetId) return;
    try {
      const res = own
        ? await api.get(endpoints.me)
        : await api.get(endpoints.userProfile(targetId));
      const d = res.data as { data?: { user?: User } & User; user?: User };
      const u = d?.data?.user ?? d?.user ?? (d?.data as User | undefined);
      if (u?._id) setProfile(u);
    } catch (e) {
      toast.error(errMsg(e));
    } finally {
      setLoadingProfile(false);
    }
  }, [own, targetId]);

  // Their posts: GET /users/:id/posts
  const fetchPosts = useCallback(
    async (page: number) => {
      const res = await api.get(endpoints.userPosts(targetId as string), {
        params: { page, limit: LIMIT },
      });
      const list = extractList<Post>(res.data, "posts");
      return { list, nextPage: nextPageOf(res.data, page, list.length, LIMIT) };
    },
    [targetId],
  );

  const loadPosts = useCallback(async () => {
    if (!targetId) return;
    setLoadingPosts(true);
    try {
      const { list, nextPage } = await fetchPosts(1);
      setPosts(list);
      nextPageRef.current = nextPage;
      setHasMore(nextPage !== null);
    } catch (e) {
      toast.error(errMsg(e));
    } finally {
      setLoadingPosts(false);
    }
  }, [fetchPosts, targetId]);

  useEffect(() => {
    setLoadingProfile(true);
    setProfile(null);
    setFollowerDelta(0);
    void loadProfile();
    void loadPosts();
  }, [loadProfile, loadPosts]);

  async function loadMore() {
    const page = nextPageRef.current;
    if (page === null || loadingMore) return;
    setLoadingMore(true);
    try {
      const { list, nextPage } = await fetchPosts(page);
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

  // PUT /users/upload-photo (formdata: photo)
  async function uploadPhoto(file: File) {
    setUploading(true);
    try {
      const fd = new FormData();
      fd.append("photo", file);
      await api.put(endpoints.uploadPhoto, fd);
      toast.success("Profile photo updated");
      await Promise.all([loadProfile(), refreshMe()]);
    } catch (e) {
      toast.error(errMsg(e));
    } finally {
      setUploading(false);
      if (fileRef.current) fileRef.current.value = "";
    }
  }

  // PATCH /users/change-password (the server sends back a fresh token)
  async function changePassword(e: React.FormEvent) {
    e.preventDefault();
    if (!oldPassword) return toast.error("Enter your current password");
    if (!PASSWORD_RULE.test(newPassword)) {
      return toast.error(
        "New password: 6-15 characters with an uppercase letter, a lowercase letter, a number and a special character",
      );
    }
    setSavingPassword(true);
    try {
      const res = await api.patch(endpoints.changePassword, {
        password: oldPassword,
        newPassword,
      });
      const d = res.data as { data?: { token?: string }; token?: string };
      const token = d?.data?.token ?? d?.token;
      if (token) localStorage.setItem("token", token);
      toast.success("Password changed");
      setOldPassword("");
      setNewPassword("");
      setShowPassword(false);
    } catch (err) {
      toast.error(errMsg(err));
    } finally {
      setSavingPassword(false);
    }
  }

  async function handleFollow() {
    if (!profile) return;
    const was = isFollowing(profile._id, profile.isFollowing);
    setFollowerDelta((d) => d + (was ? -1 : 1));
    await toggleFollow(profile._id, profile.isFollowing);
  }

  if (loadingProfile) {
    return (
      <div className="mx-auto w-full max-w-2xl space-y-4">
        <div className={`${card} h-64 animate-pulse`} />
      </div>
    );
  }

  if (!profile) {
    return (
      <div
        className={`${card} mx-auto max-w-2xl py-12 text-center text-slate-400`}
      >
        Couldn't load this profile.
      </div>
    );
  }

  const followers =
    (profile.followersCount ?? profile.followers?.length ?? 0) + followerDelta;
  const followingCount =
    profile.followingCount ?? profile.following?.length ?? 0;
  const postsCount = profile.postsCount ?? posts.length;
  const followed = isFollowing(profile._id, profile.isFollowing);

  return (
    <div className="mx-auto w-full max-w-2xl space-y-4 sm:space-y-5">
      {/* Header */}
      <section className={`${card} overflow-hidden`}>
        <div className="h-28 bg-gradient-to-r from-indigo-600/60 via-violet-600/50 to-blue-500/40 sm:h-40" />

        <div className="px-5 pb-5">
          <div className="-mt-12 flex items-end justify-between gap-3 sm:-mt-14">
            <div className="relative rounded-full bg-[#0d0f2b] p-1">
              <button
                type="button"
                onClick={() => profile.photo && setPhotoOpen(true)}
                aria-label="View photo"
                className={`block rounded-full ${profile.photo ? "cursor-zoom-in" : "cursor-default"}`}
              >
                <Avatar
                  user={profile}
                  className="h-24 w-24 text-3xl sm:h-28 sm:w-28"
                />
              </button>
              {own && (
                <>
                  <button
                    onClick={() => fileRef.current?.click()}
                    disabled={uploading}
                    aria-label="Change profile photo"
                    className="absolute bottom-1 right-1 flex h-9 w-9 items-center justify-center rounded-full bg-indigo-500 text-white shadow-lg ring-2 ring-[#0d0f2b] transition-colors hover:bg-indigo-400 disabled:opacity-60"
                  >
                    {uploading ? (
                      <Loader2 className="h-4 w-4 animate-spin" />
                    ) : (
                      <Camera className="h-4 w-4" />
                    )}
                  </button>
                  <input
                    ref={fileRef}
                    type="file"
                    accept="image/*"
                    className="hidden"
                    onChange={(e) => {
                      const f = e.target.files?.[0];
                      if (f) void uploadPhoto(f);
                    }}
                  />
                </>
              )}
            </div>

            {own ? (
              <button
                onClick={() =>
                  showPassword ? closeSettings() : setShowPassword(true)
                }
                aria-label="Settings"
                aria-expanded={showPassword}
                className="flex min-h-10 items-center gap-2 rounded-xl border border-white/10 px-4 text-sm font-semibold text-slate-300 transition-colors hover:bg-white/5"
              >
                <Settings className="h-4 w-4" />
                <span className="hidden sm:inline">Settings</span>
              </button>
            ) : (
              <button
                onClick={() => void handleFollow()}
                className={`flex min-h-10 items-center gap-2 rounded-xl px-5 text-sm font-semibold transition-colors ${
                  followed
                    ? "border border-white/10 text-slate-300 hover:bg-white/5"
                    : "bg-indigo-500 text-white shadow-lg shadow-indigo-500/20 hover:bg-indigo-400"
                }`}
              >
                {followed ? (
                  <UserCheck className="h-4 w-4" />
                ) : (
                  <UserPlus className="h-4 w-4" />
                )}
                {followed ? "Following" : "Follow"}
              </button>
            )}
          </div>

          <h1 className="mt-3 text-2xl font-bold text-white">{profile.name}</h1>
          {profile.username && (
            <p className="text-sm text-slate-400">@{profile.username}</p>
          )}
          {own && profile.email && (
            <p className="mt-1 text-sm text-slate-500">{profile.email}</p>
          )}
          {profile.bio && (
            <p className="mt-3 text-sm text-slate-300">{profile.bio}</p>
          )}

          <div className="mt-4 grid grid-cols-3 gap-2 border-t border-white/5 pt-4 text-center">
            <div>
              <p className="text-xl font-bold text-white">
                {postsCount.toLocaleString()}
              </p>
              <p className="text-xs text-slate-400">Posts</p>
            </div>
            <button
              type="button"
              onClick={() => void openList("followers")}
              className="rounded-xl py-1 transition-colors hover:bg-white/5"
            >
              <p className="text-xl font-bold text-white">
                {Math.max(0, followers).toLocaleString()}
              </p>
              <p className="text-xs text-slate-400">Followers</p>
            </button>
            <button
              type="button"
              onClick={() => void openList("following")}
              className="rounded-xl py-1 transition-colors hover:bg-white/5"
            >
              <p className="text-xl font-bold text-white">
                {followingCount.toLocaleString()}
              </p>
              <p className="text-xs text-slate-400">Following</p>
            </button>
          </div>
        </div>
      </section>

      {/* Change password (my profile only) */}
      {own && showPassword && (
        <section id="settings" className={`${card} scroll-mt-24 space-y-5 p-5`}>
          <div className="flex items-center justify-between">
            <h2 className="flex items-center gap-2 text-lg font-bold text-white">
              <Settings className="h-5 w-5 text-indigo-400" /> Settings
            </h2>
            <button
              type="button"
              onClick={closeSettings}
              aria-label="Close settings"
              className="rounded-lg p-1.5 text-slate-400 hover:bg-white/5 hover:text-white"
            >
              <X className="h-5 w-5" />
            </button>
          </div>

          <div>
            <h3 className="mb-2 text-sm font-semibold text-slate-300">
              Appearance
            </h3>
            <div className="flex gap-2">
              {(["dark", "light"] as const).map((t) => (
                <button
                  key={t}
                  type="button"
                  onClick={() => setTheme(t)}
                  aria-pressed={theme === t}
                  className={`flex min-h-10 flex-1 items-center justify-center gap-2 rounded-xl border text-sm font-semibold transition-colors ${
                    theme === t
                      ? "border-indigo-400 bg-indigo-500/15 text-indigo-400"
                      : "border-white/10 text-slate-300 hover:bg-white/5"
                  }`}
                >
                  {t === "dark" ? (
                    <Moon className="h-4 w-4" />
                  ) : (
                    <Sun className="h-4 w-4" />
                  )}
                  {t === "dark" ? "Dark" : "Light"}
                </button>
              ))}
            </div>
          </div>

          <form onSubmit={(e) => void changePassword(e)} className="space-y-3">
            <h3 className="text-sm font-semibold text-slate-300">
              Change password
            </h3>
            <input
              type="password"
              autoComplete="current-password"
              placeholder="Current password"
              value={oldPassword}
              onChange={(e) => setOldPassword(e.target.value)}
              className={inputClass}
            />
            <input
              type="password"
              autoComplete="new-password"
              placeholder="New password"
              value={newPassword}
              onChange={(e) => setNewPassword(e.target.value)}
              className={inputClass}
            />
            <div className="flex justify-end gap-2 pt-1">
              <button
                type="button"
                onClick={closeSettings}
                className="rounded-xl border border-white/10 px-4 py-2 text-sm font-semibold text-slate-300 hover:bg-white/5"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={savingPassword}
                className="flex items-center gap-2 rounded-xl bg-indigo-500 px-5 py-2 text-sm font-semibold text-white hover:bg-indigo-400 disabled:opacity-60"
              >
                {savingPassword && <Loader2 className="h-4 w-4 animate-spin" />}
                Save
              </button>
            </div>
          </form>
        </section>
      )}

      {/* Followers / Following list */}
      {listKind && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4"
          onClick={() => setListKind(null)}
        >
          <div
            role="dialog"
            aria-label={listKind === "followers" ? "Followers" : "Following"}
            onClick={(e) => e.stopPropagation()}
            className={`${card} flex max-h-[70vh] w-full max-w-md flex-col overflow-hidden shadow-2xl`}
          >
            <div className="flex items-center justify-between border-b border-white/10 px-5 py-4">
              <h2 className="text-lg font-bold text-white">
                {listKind === "followers" ? "Followers" : "Following"}
              </h2>
              <button
                type="button"
                onClick={() => setListKind(null)}
                aria-label="Close"
                className="rounded-lg p-1.5 text-slate-400 hover:bg-white/5 hover:text-white"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            <div className="overflow-y-auto p-4">
              {listLoading && (
                <div className="flex justify-center py-6 text-slate-500">
                  <Loader2 className="h-5 w-5 animate-spin" />
                </div>
              )}

              {!listLoading && listPeople.length === 0 && (
                <p className="py-6 text-center text-sm text-slate-400">
                  {(listKind === "followers" ? followers : followingCount) > 0
                    ? "The server didn't send this list."
                    : listKind === "followers"
                      ? "No followers yet."
                      : "Not following anyone yet."}
                </p>
              )}

              <ul className="space-y-3">
                {listPeople.map((p) => {
                  const isMe = p._id === meId;
                  const f = isFollowing(p._id, p.isFollowing);
                  return (
                    <li key={p._id} className="flex items-center gap-3">
                      <ProfileLink
                        user={p}
                        onClick={() => setListKind(null)}
                        className="shrink-0"
                      >
                        <Avatar user={p} className="h-11 w-11" />
                      </ProfileLink>
                      <ProfileLink
                        user={p}
                        onClick={() => setListKind(null)}
                        className="min-w-0 flex-1"
                      >
                        <p className="truncate text-sm font-semibold text-white hover:underline">
                          {p.name}
                        </p>
                        {p.username && (
                          <p className="truncate text-xs text-slate-400">
                            @{p.username}
                          </p>
                        )}
                      </ProfileLink>
                      {!isMe && (
                        <button
                          onClick={() =>
                            void toggleFollow(p._id, p.isFollowing)
                          }
                          className={`min-h-9 shrink-0 rounded-lg px-4 text-sm font-semibold transition-colors ${
                            f
                              ? "border border-white/10 text-slate-300 hover:bg-white/5"
                              : "bg-indigo-500 text-white hover:bg-indigo-400"
                          }`}
                        >
                          {f ? "Following" : "Follow"}
                        </button>
                      )}
                    </li>
                  );
                })}
              </ul>
            </div>
          </div>
        </div>
      )}

      {/* Full-size profile photo */}
      {photoOpen && profile.photo && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/85 p-4"
          onClick={() => setPhotoOpen(false)}
        >
          <button
            type="button"
            onClick={() => setPhotoOpen(false)}
            aria-label="Close photo"
            className="absolute right-4 top-4 rounded-full bg-white/10 p-2 text-white hover:bg-white/20"
          >
            <X className="h-6 w-6" />
          </button>
          <img
            src={profile.photo}
            alt={profile.name}
            onClick={(e) => e.stopPropagation()}
            className="max-h-[85vh] max-w-full rounded-2xl object-contain"
          />
        </div>
      )}

      {/* Add post (my own profile only) */}
      {own && <Composer onPosted={() => void loadPosts()} />}

      {/* Posts */}
      <h2 className="px-1 text-lg font-bold text-white">Posts</h2>

      {loadingPosts &&
        [1, 2].map((n) => (
          <div key={n} className={`${card} h-60 animate-pulse`} />
        ))}

      {!loadingPosts && posts.length === 0 && (
        <div className={`${card} py-12 text-center text-slate-400`}>
          {own ? "You haven't posted anything yet." : "No posts yet."}
        </div>
      )}

      {!loadingPosts &&
        posts.map((post) => (
          <PostCard
            key={post._id}
            post={post}
            meId={meId}
            following={isFollowing(post.user?._id, post.user?.isFollowing)}
            onFollow={(id) => void toggleFollow(id, post.user?.isFollowing)}
            onReposted={() => void loadPosts()}
            onDeleted={(id) =>
              setPosts((list) => list.filter((p) => p._id !== id))
            }
          />
        ))}

      {!loadingPosts && hasMore && (
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
