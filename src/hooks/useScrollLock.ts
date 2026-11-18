import { useEffect } from "react";

let locks = 0;
let savedY = 0;

/** Locks page scrolling while an overlay is open. `overflow: hidden` alone does
 *  not stop iOS Safari from scrolling the page behind a sheet or modal (or
 *  from jumping when the keyboard opens), so the body is pinned in place and
 *  the scroll position restored afterwards. Nested locks are reference-counted. */
export function useScrollLock(active: boolean) {
  useEffect(() => {
    if (!active) return;
    const body = document.body;
    if (locks++ === 0) {
      savedY = window.scrollY;
      const gutter = window.innerWidth - document.documentElement.clientWidth;
      Object.assign(body.style, {
        position: "fixed",
        top: `-${savedY}px`,
        left: "0",
        right: "0",
        overflow: "hidden",
        paddingRight: gutter > 0 ? `${gutter}px` : "",
      });
    }
    return () => {
      if (--locks === 0) {
        Object.assign(body.style, { position: "", top: "", left: "", right: "", overflow: "", paddingRight: "" });
        window.scrollTo({ top: savedY, behavior: "instant" as ScrollBehavior });
      }
    };
  }, [active]);
}

/** True on phones/tablets, where autofocus pops the keyboard and shifts layout. */
export const isTouch = () => typeof window !== "undefined" && !!window.matchMedia?.("(pointer: coarse)").matches;
