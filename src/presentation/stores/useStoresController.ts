import { useCallback, useEffect, useRef, useState } from 'react';

import type { Clock } from '../../application/ports/stores/Clock';
import type { GetStores } from '../../application/stores/GetStores';
import {
  getStoreStatus,
  type StoreStatusKind,
} from '../../application/stores/GetStoreStatus';
import type {
  LocationPermissionStatus,
  Store,
} from '../../application/stores/Store';

export type StoresQueryStatus =
  | 'initial-loading'
  | 'refreshing'
  | 'success'
  | 'empty'
  | 'stale-cache'
  | 'failure';

export interface StoresController {
  stores: Store[];
  permissionStatus: LocationPermissionStatus;
  status: StoresQueryStatus;
  loading: boolean;
  isRefreshing: boolean;
  refresh: () => Promise<void>;
  requestLocation: () => Promise<void>;
  statusFor: (store: Store) => StoreStatusKind;
}

export function useStoresController(
  getStores: GetStores,
  clock: Clock,
  enabled: boolean,
): StoresController {
  const [stores, setStores] = useState<Store[]>([]);
  const [permissionStatus, setPermissionStatus] =
    useState<LocationPermissionStatus>('undetermined');
  const [status, setStatus] = useState<StoresQueryStatus>('initial-loading');
  const [nowEpochMilliseconds, setNowEpochMilliseconds] = useState(clock.now());
  const storesRef = useRef<Store[]>([]);
  const latestRequest = useRef(0);
  const mounted = useRef(true);
  const hasLoaded = useRef(false);

  const load = useCallback(
    async (
      mode: 'full' | 'delta',
      queryState: 'initial' | 'refresh' | 'silent',
    ) => {
      const request = ++latestRequest.current;
      if (queryState === 'refresh') {
        setStatus('refreshing');
      }

      try {
        const snapshot = await getStores.execute(mode);
        if (mounted.current && request === latestRequest.current) {
          storesRef.current = snapshot.stores;
          setStores(snapshot.stores);
          setPermissionStatus(snapshot.permission);
          setStatus(
            snapshot.stale
              ? snapshot.stores.length > 0
                ? 'stale-cache'
                : 'failure'
              : snapshot.stores.length > 0
                ? 'success'
                : 'empty',
          );
        }
      } catch {
        if (mounted.current && request === latestRequest.current) {
          setStatus(storesRef.current.length > 0 ? 'stale-cache' : 'failure');
        }
      }
    },
    [getStores],
  );

  useEffect(() => {
    mounted.current = true;
    if (!enabled) {
      hasLoaded.current = false;
    }
    if (enabled && !hasLoaded.current) {
      hasLoaded.current = true;
      void load('full', 'initial');
    }
    return () => {
      mounted.current = false;
    };
  }, [enabled, load]);

  useEffect(() => {
    const timer = setInterval(() => {
      setNowEpochMilliseconds(clock.now());
    }, 60 * 1000);
    return () => clearInterval(timer);
  }, [clock]);

  const refresh = useCallback(async () => {
    if (enabled) {
      await load('delta', 'refresh');
    }
  }, [enabled, load]);

  const requestLocation = useCallback(async () => {
    if (enabled) {
      await load('delta', 'silent');
    }
  }, [enabled, load]);

  const statusFor = useCallback(
    (store: Store) => getStoreStatus(store, nowEpochMilliseconds),
    [nowEpochMilliseconds],
  );

  return {
    stores,
    permissionStatus,
    status,
    loading: status === 'initial-loading',
    isRefreshing: status === 'refreshing',
    refresh,
    requestLocation,
    statusFor,
  };
}
