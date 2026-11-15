import { useEffect, useRef, useState } from "react";

/**
 * Progress (0..1) of a tall "pinned" section: 0 when its top hits the viewport top,
 * 1 when its bottom reaches the viewport bottom. Drives sticky scrollytelling scenes.
 */
export function useScrollProgress<T extends HTMLElement>() {
  const ref = useRef<T>(null);
  const [progress, setProgress] = useState(0);

  useEffect(() => {
    let frame = 0;
    const update = () => {
      frame = 0;
      const el = ref.current;
      if (!el) return;
      const rect = el.getBoundingClientRect();
      const total = rect.height - window.innerHeight;
      const p = total <= 0 ? 0 : Math.min(1, Math.max(0, -rect.top / total));
      setProgress(p);
    };
    const onScroll = () => {
      if (!frame) frame = requestAnimationFrame(update);
    };
    update();
    window.addEventListener("scroll", onScroll, { passive: true });
    window.addEventListener("resize", onScroll);
    return () => {
      window.removeEventListener("scroll", onScroll);
      window.removeEventListener("resize", onScroll);
      cancelAnimationFrame(frame);
    };
  }, []);

  return { ref, progress };
}

/** Maps p from [a,b] to [0,1], clamped. */
export const range = (p: number, a: number, b: number) =>
  Math.min(1, Math.max(0, (p - a) / (b - a)));
