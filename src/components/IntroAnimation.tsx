'use client';

import { useEffect, useState } from 'react';

export function IntroAnimation({ children }: { children: (animateOnce: boolean) => React.ReactNode }) {
  const [shouldAnimate, setShouldAnimate] = useState(false);
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
    if (typeof sessionStorage === 'undefined') return;
    const fired = sessionStorage.getItem('lpw-intro');
    if (!fired) {
      setShouldAnimate(true);
      sessionStorage.setItem('lpw-intro', '1');
    }
  }, []);

  if (!mounted) return <>{children(false)}</>;
  return <span className={shouldAnimate ? 'lpw-intro' : undefined}>{children(shouldAnimate)}</span>;
}
