import React, { useEffect, useRef } from 'react';

/**
 * Calls `onVisible` when it scrolls into view (or within 300px of it), to load
 * the next page of a list. `root` is the scrolling element, or null for the
 * page itself.
 *
 * The observer is rebuilt whenever `rowCount` changes, because an observer only
 * reports changes: if a page loads and the sentinel is still on screen (a tall
 * window, a short page), a fresh observer reports it again and loads the next.
 */
export function LoadMoreSentinel({ onVisible, hasMore, loading, rowCount, root = null, error = '' }) {
  const ref = useRef(null);

  useEffect(() => {
    const node = ref.current;
    if (!node || !hasMore || loading || error) return undefined;
    const observer = new IntersectionObserver(entries => {
      if (entries.some(entry => entry.isIntersecting)) onVisible();
    }, { root, rootMargin: '300px 0px' });
    observer.observe(node);
    return () => observer.disconnect();
  }, [onVisible, hasMore, loading, rowCount, root, error]);

  return <div ref={ref} className="load-more">
    {loading && <><span className="spinner spinner-sm"/>Loading more…</>}
    {!loading && error && <button type="button" className="text-action" onClick={onVisible}>{error} — try again</button>}
  </div>;
}
