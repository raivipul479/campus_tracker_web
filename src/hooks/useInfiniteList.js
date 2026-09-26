import { useCallback, useEffect, useRef, useState } from 'react';

// The server caps one request at 200 rows.
const MAX_REQUEST = 200;

const emptyState = { key: undefined, rows: [], total: 0, nextOffset: 0, meta: null, loading: true, loadingMore: false, error: '' };

/**
 * Server-side list loaded a page at a time as the user scrolls.
 *
 * `fetchPage({ offset, limit })` must resolve to `{ rows, total, nextOffset }`,
 * with nextOffset null after the last page. The list starts over whenever
 * `resetKey` changes (a new search, filter or sort). Responses for an older
 * key are ignored, so a slow page can never land in a newer search's list.
 *
 * `meta` is the latest response itself, for anything it carries besides the
 * rows (a report's summary figures, for example).
 *
 * Rows are tagged with the key they were loaded for. On the render where the
 * key changes, before the effect below resets the list, the previous rows are
 * hidden rather than drawn under the new search or mode.
 *
 * `reload()` refetches everything loaded so far in place, keeping the scroll
 * position, for use after an add, edit or delete.
 */
export function useInfiniteList(fetchPage, resetKey, pageSize = 50) {
  const [state, setState] = useState(emptyState);
  const fetchRef = useRef(fetchPage);
  fetchRef.current = fetchPage;
  const generation = useRef(0);
  const busy = useRef(false);
  const stateRef = useRef(state);
  stateRef.current = state;

  useEffect(() => {
    const current = ++generation.current;
    busy.current = true;
    setState({ ...emptyState, key: resetKey });
    fetchRef.current({ offset: 0, limit: pageSize })
      .then(page => {
        if (current !== generation.current) return;
        setState({ key: resetKey, rows: page.rows, total: page.total, nextOffset: page.nextOffset, meta: page, loading: false, loadingMore: false, error: '' });
      })
      .catch(error => {
        if (current !== generation.current) return;
        setState({ ...emptyState, key: resetKey, loading: false, error: error.message || 'Unable to load.' });
      })
      .finally(() => { if (current === generation.current) busy.current = false; });
  }, [resetKey, pageSize]);

  const loadMore = useCallback(() => {
    const { nextOffset } = stateRef.current;
    if (busy.current || nextOffset === null) return;
    const current = generation.current;
    busy.current = true;
    setState(prev => ({ ...prev, loadingMore: true, error: '' }));
    fetchRef.current({ offset: nextOffset, limit: pageSize })
      .then(page => {
        if (current !== generation.current) return;
        setState(prev => ({ ...prev, rows: [...prev.rows, ...page.rows], total: page.total, nextOffset: page.nextOffset, meta: page, loadingMore: false }));
      })
      .catch(error => {
        if (current !== generation.current) return;
        setState(prev => ({ ...prev, loadingMore: false, error: error.message || 'Unable to load more.' }));
      })
      .finally(() => { if (current === generation.current) busy.current = false; });
  }, [pageSize]);

  const reload = useCallback(async () => {
    const current = ++generation.current;
    busy.current = true;
    const wanted = Math.max(stateRef.current.rows.length, pageSize);
    try {
      let rows = [];
      let page = { total: 0, nextOffset: 0 };
      while (rows.length < wanted && page.nextOffset !== null) {
        page = await fetchRef.current({ offset: rows.length, limit: Math.min(MAX_REQUEST, wanted - rows.length) });
        if (current !== generation.current) return;
        rows = [...rows, ...page.rows];
      }
      setState(prev => ({ key: prev.key, rows, total: page.total, nextOffset: page.nextOffset, meta: page, loading: false, loadingMore: false, error: '' }));
    } catch (error) {
      if (current === generation.current) setState(prev => ({ ...prev, error: error.message || 'Unable to refresh.' }));
    } finally {
      if (current === generation.current) busy.current = false;
    }
  }, [pageSize]);

  if (state.key !== resetKey) return { ...emptyState, key: resetKey, hasMore: false, loadMore, reload };
  return { ...state, hasMore: state.nextOffset !== null, loadMore, reload };
}
