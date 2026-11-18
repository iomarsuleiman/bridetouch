import { useRef, useState } from "react";
import { Icon } from "../components/Icon";
import { useAuth } from "@clerk/react";
import { useToast } from "../components/Toast";
import { SmartImage } from "../components/SmartImage";
import { friendlyError } from "../lib/format";

/** Phone photos are often 4–12 MB (and HEIC on iPhone). Resize to at most
 *  2000px and re-encode before upload: faster on mobile data, lighter pages,
 *  and always a format every browser can show. GIFs are left alone. */
async function prepareImage(file: File): Promise<File> {
  if (file.type === "image/gif" || typeof createImageBitmap === "undefined") return file;
  try {
    const bitmap = await createImageBitmap(file);
    const scale = Math.min(1, 2000 / Math.max(bitmap.width, bitmap.height));
    if (scale === 1 && file.size < 1_500_000 && ["image/jpeg", "image/webp", "image/png"].includes(file.type)) return file;
    const canvas = document.createElement("canvas");
    canvas.width = Math.round(bitmap.width * scale);
    canvas.height = Math.round(bitmap.height * scale);
    canvas.getContext("2d")!.drawImage(bitmap, 0, 0, canvas.width, canvas.height);
    bitmap.close?.();
    const encode = (type: string) => new Promise<Blob | null>((resolve) => canvas.toBlob(resolve, type, 0.86));
    // WebP keeps logo transparency; Safari versions without WebP encoding fall back.
    let blob = await encode("image/webp");
    if (!blob || blob.type !== "image/webp") blob = await encode(file.type === "image/png" ? "image/png" : "image/jpeg");
    if (!blob) return file;
    const ext = blob.type.split("/")[1];
    return new File([blob], file.name.replace(/\.[^.]+$/, "") + "." + ext, { type: blob.type });
  } catch {
    return file; // the server still validates type and size
  }
}

// Uploads an image to the R2-backed /images API and hands the stored URL
// to the parent form. Falls back to a manual URL field when no API is
// configured (e.g. VITE_IMAGE_API_URL unset).
export function ImageUpload({
  label,
  value,
  onChange,
}: {
  label: string;
  value: string;
  onChange: (url: string) => void;
}) {
  const { getToken } = useAuth();
  const toast = useToast();
  const fileRef = useRef<HTMLInputElement>(null);
  const [uploading, setUploading] = useState(false);

  const apiUrl = import.meta.env.VITE_IMAGE_API_URL as string | undefined;

  async function upload(original: File) {
    if (original.type && !original.type.startsWith("image/")) {
      toast("Choose an image file");
      return;
    }
    setUploading(true);
    const file = await prepareImage(original);
    if (file.size > 10 * 1024 * 1024) {
      setUploading(false);
      toast("That image is too large. Choose one under 10 MB.");
      return;
    }
    if (!apiUrl) {
      setUploading(false);
      toast("Image uploads aren't set up. Paste an image link instead.");
      return;
    }
    try {
      const token = await getToken({template:"convex"});
      if (!token) throw new Error("Sign in again to upload images");
      const res = await fetch(`${apiUrl.replace(/\/$/, "")}/images`, {
        method: "POST",
        headers: token ? { Authorization: `Bearer ${token}` } : {},
        body: (() => {
          const form = new FormData();
          form.append("file", file);
          return form;
        })(),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(data.error || "Upload failed");
      if (typeof data.url !== "string") throw new Error("Upload returned no image URL");
      onChange(new URL(data.url, apiUrl).href);
      toast("Image uploaded");
    } catch (err) {
      toast(friendlyError(err, "Upload failed. Check your connection and try again."));
    } finally {
      setUploading(false);
      if (fileRef.current) fileRef.current.value = "";
    }
  }

  return (
    <div className="field">
      <label>{label}</label>
      {value ? (
        <div className="image-preview">
          <SmartImage src={value} alt="" />
          <button type="button" className="image-remove" onClick={() => onChange("")} aria-label={`Remove ${label.toLowerCase()}`}>
            <Icon name="close" size="sm" />
          </button>
        </div>
      ) : null}
      <div style={{ display: "flex", gap: 8 }}>
        <input
          aria-label={`${label} URL`}
          placeholder="Paste an image link, or upload →"
          type="text"
          inputMode="url"
          autoCapitalize="none"
          autoCorrect="off"
          spellCheck={false}
          autoComplete="off"
          value={value}
          onChange={(e) => onChange(e.target.value)}
        />
        <button
          type="button"
          className="btn secondary"
          style={{ flex: "none", padding: "11px 14px" }}
          onClick={() => fileRef.current?.click()}
          disabled={uploading}
        >
          {uploading ? <><span className="spinner" aria-hidden="true" /> Uploading…</> : "Upload"}
        </button>
        <input
          ref={fileRef}
          type="file"
          accept="image/*"
          hidden
          onChange={(e) => {
            const file = e.target.files?.[0];
            if (file) upload(file);
          }}
        />
      </div>
    </div>
  );
}
