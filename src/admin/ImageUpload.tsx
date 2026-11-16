import { useRef, useState } from "react";
import { useAuth } from "@clerk/react";
import { useToast } from "../components/Toast";

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

  async function upload(file: File) {
    if (!file.type.startsWith("image/") || file.size > 10 * 1024 * 1024) {
      toast("Choose an image under 10 MB");
      return;
    }
    if (!apiUrl) {
      toast("Image API not configured — paste a URL instead");
      return;
    }
    setUploading(true);
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
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Upload failed");
      if (typeof data.url !== "string") throw new Error("Upload returned no image URL");
      onChange(new URL(data.url, apiUrl).href);
      toast("Image uploaded");
    } catch (err) {
      toast(err instanceof Error ? err.message : "Upload failed");
    } finally {
      setUploading(false);
      if (fileRef.current) fileRef.current.value = "";
    }
  }

  return (
    <div className="field">
      <label>{label}</label>
      {value ? (
        <img
          src={value}
          alt=""
          style={{ width: "100%", height: 140, objectFit: "cover", borderRadius: 11, marginBottom: 8 }}
        />
      ) : null}
      <div style={{ display: "flex", gap: 8 }}>
        <input
          aria-label={`${label} URL`}
          placeholder="Paste an image URL…"
          type="url"
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
          {uploading ? "Uploading…" : "Upload"}
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
