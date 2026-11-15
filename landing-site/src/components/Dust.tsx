import { useEffect, useState, type CSSProperties } from "react";

type P = { left: number; top: number; size: number; dur: number; delay: number; dx: number; o: number };

/** Floating ambient particles; generated after mount to avoid hydration mismatch. */
export function Dust({ count = 36 }: { count?: number }) {
  const [parts, setParts] = useState<P[]>([]);
  useEffect(() => {
    setParts(
      Array.from({ length: count }, () => ({
        left: Math.random() * 100,
        top: 60 + Math.random() * 50,
        size: 1 + Math.random() * 3,
        dur: 18 + Math.random() * 22,
        delay: -Math.random() * 40,
        dx: (Math.random() - 0.5) * 120,
        o: 0.15 + Math.random() * 0.35,
      })),
    );
  }, [count]);
  return (
    <div aria-hidden className="pointer-events-none fixed inset-0 z-0 overflow-hidden">
      {parts.map((p, i) => (
        <span
          key={i}
          className="dust"
          style={{
            left: `${p.left}%`, top: `${p.top}%`, width: p.size, height: p.size,
            animationDuration: `${p.dur}s`, animationDelay: `${p.delay}s`,
            "--dx": `${p.dx}px`, "--o": p.o,
          } as CSSProperties}
        />
      ))}
    </div>
  );
}
