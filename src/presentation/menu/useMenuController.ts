import { useCallback, useEffect, useRef, useState } from 'react';

import type { GetMenu } from '../../application/menu/GetMenu';
import type { MenuItem } from '../../application/menu/MenuItem';

export type MenuQueryStatus =
  | 'initial-loading'
  | 'refreshing'
  | 'success'
  | 'empty'
  | 'stale-cache'
  | 'failure';

export interface MenuController {
  items: MenuItem[];
  status: MenuQueryStatus;
  isLoading: boolean;
  isRefreshing: boolean;
  refresh: () => Promise<void>;
}

export function useMenuController(getMenu: GetMenu): MenuController {
  const [items, setItems] = useState<MenuItem[]>([]);
  const [status, setStatus] = useState<MenuQueryStatus>('initial-loading');
  const itemsRef = useRef<MenuItem[]>([]);
  const latestRequest = useRef(0);
  const mounted = useRef(true);

  const load = useCallback(
    async (mode: 'initial' | 'refresh') => {
      const request = ++latestRequest.current;
      if (mode === 'refresh') {
        setStatus('refreshing');
      }

      try {
        const snapshot = await getMenu.execute();
        if (mounted.current && request === latestRequest.current) {
          itemsRef.current = snapshot.items;
          setItems(snapshot.items);
          setStatus(
            snapshot.stale
              ? snapshot.items.length > 0
                ? 'stale-cache'
                : 'failure'
              : snapshot.items.length > 0
                ? 'success'
                : 'empty',
          );
        }
      } catch {
        if (mounted.current && request === latestRequest.current) {
          setStatus(itemsRef.current.length > 0 ? 'stale-cache' : 'failure');
        }
      }
    },
    [getMenu],
  );

  useEffect(() => {
    mounted.current = true;
    void load('initial');
    return () => {
      mounted.current = false;
    };
  }, [load]);

  const refresh = useCallback(() => load('refresh'), [load]);

  return {
    items,
    status,
    isLoading: status === 'initial-loading',
    isRefreshing: status === 'refreshing',
    refresh,
  };
}
