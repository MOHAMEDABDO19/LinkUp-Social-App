import { useEffect, useMemo, useState } from "react";
import { toast } from "react-toastify";
import { Image as ImageIcon, Loader2, X } from "lucide-react";
import { api, endpoints, errMsg } from "../../../Api";
import { useMe } from "../../Useme";
import Avatar from "../Avatar/avatar";

const card = "rounded-2xl border border-indigo-500/10 bg-[#0d0f2b]";

// "Add post" box: text + optional photo (POST /posts, formdata: body, image)
export default function Composer({
  onPosted,
  id = "profile-composer",
}: {
  onPosted: () => void;
  id?: string;
}) {
  const { me } = useMe();
  const [content, setContent] = useState("");
  const [image, setImage] = useState<File | null>(null);
  const [submitting, setSubmitting] = useState(false);

  const preview = useMemo(() => (image ? URL.createObjectURL(image) : null), [image]);
  useEffect(() => {
    return () => {
      if (preview) URL.revokeObjectURL(preview);
    };
  }, [preview]);

  async function submit(e: React.FormEvent) {
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
      onPosted();
    } catch (err) {
      toast.error(errMsg(err));
    } finally {
      setSubmitting(false);
    }
  }

  const firstName = me?.name?.split(" ")[0];

  return (
    <form onSubmit={(e) => void submit(e)} className={`${card} p-4`}>
      <div className="flex items-start gap-3">
        <Avatar user={me} className="h-11 w-11" />
        <textarea
          id={id}
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
          <img src={preview} alt="Selected" className="max-h-64 w-full rounded-xl object-cover" />
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
  );
}