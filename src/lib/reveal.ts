import { useEffect } from "react";

/** Fades `.reveal` elements up as they scroll into view. Elements added later
 *  (new pages, filtered results) are picked up automatically. Without
 *  IntersectionObserver, or with reduced motion, everything shows at once. */
export function useScrollReveal() {
  useEffect(() => {
    const reduce = window.matchMedia?.("(prefers-reduced-motion: reduce)").matches;
    if (reduce || !("IntersectionObserver" in window)) {
      document.documentElement.classList.add("no-reveal");
      return;
    }
    const io = new IntersectionObserver(
      (entries) => {
        for (const entry of entries) {
          if (!entry.isIntersecting) continue;
          const el = entry.target as HTMLElement;
          // Stagger siblings in the same row a little.
          const siblings = el.parentElement ? [...el.parentElement.children].filter((c) => c.classList.contains("reveal")) : [];
          const index = Math.max(0, siblings.indexOf(el));
          el.style.setProperty("--reveal-delay", `${(index % 4) * 70}ms`);
          el.classList.add("in");
          io.unobserve(el);
        }
      },
      { rootMargin: "0px 0px -8% 0px", threshold: 0.08 },
    );
    const scan = () => document.querySelectorAll(".reveal:not(.in)").forEach((el) => io.observe(el));
    scan();
    const mo = new MutationObserver(scan);
    mo.observe(document.body, { childList: true, subtree: true });
    return () => {
      io.disconnect();
      mo.disconnect();
    };
  }, []);
}
