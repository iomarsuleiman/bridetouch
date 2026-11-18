import { useState, type ImgHTMLAttributes } from "react";

/** Image that fades in once loaded and falls back to a soft placeholder when
 *  the URL is missing or broken, instead of showing a broken-image icon. */
export function SmartImage({ src, alt = "", className = "", style, ...rest }: ImgHTMLAttributes<HTMLImageElement>) {
  const [state, setState] = useState<"loading" | "loaded" | "error">(src ? "loading" : "error");
  if (!src || state === "error") {
    return (
      <span className={"img-fallback " + className} style={style} role={alt ? "img" : undefined} aria-label={alt || undefined}>
        <svg viewBox="0 0 24 24" width="28" height="28" fill="none" stroke="currentColor" strokeWidth="1.5" aria-hidden="true">
          <rect x="3" y="4" width="18" height="16" rx="3" />
          <circle cx="9" cy="10" r="2" />
          <path d="m4 18 5-5 4 4 3-3 4 4" />
        </svg>
      </span>
    );
  }
  return (
    <img
      {...rest}
      style={style}
      src={src}
      alt={alt}
      decoding="async"
      className={className + " smart-img" + (state === "loaded" ? " is-loaded" : "")}
      ref={(el) => {
        // Cached images can finish before React attaches onLoad.
        if (el?.complete && el.naturalWidth && state === "loading") setState("loaded");
      }}
      onLoad={() => setState("loaded")}
      onError={() => setState("error")}
    />
  );
}
