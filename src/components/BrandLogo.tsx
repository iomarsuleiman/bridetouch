export const DEFAULT_LOGO = "/bridetouch-logo.png";

export function BrandLogo({ src, name = "bridetouch" }: { src?: string; name?: string }) {
  return <img className="brand-logo" src={src || DEFAULT_LOGO} alt={`${name} logo`} />;
}
