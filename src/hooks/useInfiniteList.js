import { useCallback, useEffect, useRef, useState } from 'react';

// The server caps one request at 200 rows.
const MAX_REQUEST = 200;

const emptyState = { rows: [], total: 0, nextOffset: 0, loading: true, loadingMore: false, error: '' };

/**
 * Server-side list loaded a page at a time as the user scrolls.
 *
 * `fetchPage({ offset, limit })` must resolve to `{ rows, total, nextOffset }`,
 * with nextOffset null after the last page. The list starts over whenever
 * `resetKey` changes (a new search, filter or sort). Responses for an older
 * key are ignored, so a slow page can never land in a newer search's list.
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
    setState(emptyState);
    fetchRef.current({ offset: 0, limit: pageSize })
      .then(page => {
        if (current !== generation.current) return;
        setState({ rows: page.rows, total: page.total, nextOffset: page.nextOffset, loading: false, loadingMore: false, error: '' });
      })
      .catch(error => {
        if (current !== generation.current) return;
        setState({ ...emptyState, loading: false, error: error.message || 'Unable to load.' });
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
        setState(prev => ({ ...prev, rows: [...prev.rows, ...page.rows], total: page.total, nextOffset: page.nextOffset, loadingMore: false }));
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
      setState({ rows, total: page.total, nextOffset: page.nextOffset, loading: false, loadingMore: false, error: '' });
    } catch (error) {
      if (current === generation.current) setState(prev => ({ ...prev, error: error.message || 'Unable to refresh.' }));
    } finally {
      if (current === generation.current) busy.current = false;
    }
  }, [pageSize]);

  return { ...state, hasMore: state.nextOffset !== null, loadMore, reload };
}
