import { type RefObject, useLayoutEffect, useState } from "react";

export interface Size {
  width: number;
  height: number;
}

/** Observe an element's size. Returns undefined until first measurement. */
export function useSize(ref: RefObject<HTMLElement | null>): Size | undefined {
  const [size, setSize] = useState<Size | undefined>(undefined);

  useLayoutEffect(() => {
    const el = ref.current;
    if (!el) return;
    const observer = new ResizeObserver(([entry]) => {
      const target = entry?.target as HTMLElement | undefined;
      if (target) {
        setSize({ width: target.clientWidth, height: target.clientHeight });
      }
    });
    observer.observe(el);
    return () => observer.disconnect();
  }, [ref]);

  return size;
}
