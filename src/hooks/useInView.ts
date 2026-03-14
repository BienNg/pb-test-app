import { useEffect, useRef, useState } from 'react';

export interface UseInViewOptions {
  /** Fraction of element that must be visible (0–1). Default 0.1 */
  threshold?: number;
  /** Root margin (e.g. "0px 0px -50px 0px" to trigger slightly before fully in view). Default "0px" */
  rootMargin?: string;
  /** If true, trigger only once when first visible (sticky). Default true */
  triggerOnce?: boolean;
}

/**
 * Returns a ref and whether the element is currently in view.
 * Use the ref on the element you want to observe.
 */
export function useInView(options: UseInViewOptions = {}) {
  const {
    threshold = 0.1,
    rootMargin = '0px',
    triggerOnce = true,
  } = options;

  const ref = useRef<HTMLDivElement | null>(null);
  const [inView, setInView] = useState(false);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;

    const observer = new IntersectionObserver(
      (entries) => {
        const [entry] = entries;
        if (!entry) return;
        if (entry.isIntersecting) {
          setInView(true);
          if (triggerOnce && ref.current) {
            observer.unobserve(ref.current);
          }
        } else if (!triggerOnce) {
          setInView(false);
        }
      },
      { threshold, rootMargin }
    );

    observer.observe(el);
    return () => observer.disconnect();
  }, [threshold, rootMargin, triggerOnce]);

  return { ref, inView };
}
