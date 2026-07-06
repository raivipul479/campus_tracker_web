import { useEffect } from 'react';

export function useDebouncedEffect(effect, deps, delay = 300) {
  useEffect(() => {
    const timer = window.setTimeout(effect, delay);
    return () => window.clearTimeout(timer);
  }, deps);
}
