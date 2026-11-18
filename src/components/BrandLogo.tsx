export const DEFAULT_LOGO = "/bridetouch-logo.png";

export function BrandLogo({ src, name = "bridetouch" }: { src?: string; name?: string }) {
  return (
    <img
      className="brand-logo"
      src={src || DEFAULT_LOGO}
      alt={`${name} logo`}
      onError={(e) => {
        // A broken custom logo falls back to the built-in one.
        if (!e.currentTarget.src.endsWith(DEFAULT_LOGO)) e.currentTarget.src = DEFAULT_LOGO;
        else e.currentTarget.style.visibility = "hidden";
      }}
    />
  );
}
