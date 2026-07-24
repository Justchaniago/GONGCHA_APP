import type {
  LoyaltyActivityRepository,
} from '../ports/loyaltyActivity/LoyaltyActivityRepository';
import type {
  LoyaltyActivityPage,
  LoyaltyActivityState,
} from './LoyaltyActivity';

type Listener = (state: LoyaltyActivityState) => void;

function emptyState(): LoyaltyActivityState {
  return {
    phase: 'idle',
    items: [],
    nextCursor: null,
    pendingAvailability: 'loading',
    refreshing: false,
    loadingMore: false,
    pageError: null,
  };
}

export class LoyaltyActivityController {
  private readonly repository: LoyaltyActivityRepository;
  private readonly listeners = new Set<Listener>();
  private state: LoyaltyActivityState = emptyState();
  private uid: string | null = null;
  private identityGeneration = 0;
  private requestVersion = 0;
  private loadMorePromise: Promise<void> | null = null;

  constructor(repository: LoyaltyActivityRepository) {
    this.repository = repository;
  }

  getState(): LoyaltyActivityState {
    return this.state;
  }

  observe(listener: Listener): () => void {
    this.listeners.add(listener);
    listener(this.state);
    return () => {
      this.listeners.delete(listener);
    };
  }

  start(uid: string): void {
    if (this.uid === uid && this.state.phase !== 'idle') return;
    this.identityGeneration += 1;
    this.requestVersion += 1;
    this.loadMorePromise = null;
    this.uid = uid;
    this.publish(emptyState());
    void this.loadFirstPage(false);
  }

  stop(): void {
    this.identityGeneration += 1;
    this.requestVersion += 1;
    this.loadMorePromise = null;
    this.uid = null;
    this.state = emptyState();
  }

  refresh(): Promise<void> {
    return this.loadFirstPage(this.state.items.length > 0);
  }

  retry(): Promise<void> {
    return this.loadFirstPage(this.state.items.length > 0);
  }

  loadMore(): Promise<void> {
    if (
      this.loadMorePromise ||
      !this.uid ||
      this.state.phase !== 'ready' ||
      !this.state.nextCursor
    ) {
      return this.loadMorePromise ?? Promise.resolve();
    }
    const promise = this.performLoadMore();
    this.loadMorePromise = promise;
    void promise.finally(() => {
      if (this.loadMorePromise === promise) {
        this.loadMorePromise = null;
      }
    });
    return promise;
  }

  private async loadFirstPage(preserveItems: boolean): Promise<void> {
    const uid = this.uid;
    if (!uid) return;
    const identityGeneration = this.identityGeneration;
    const requestVersion = ++this.requestVersion;
    const previousItems = preserveItems ? this.state.items : [];
    const previousCursor = preserveItems ? this.state.nextCursor : null;
    this.publish({
      ...this.state,
      phase: preserveItems ? 'ready' : 'loading',
      items: previousItems,
      nextCursor: previousCursor,
      pendingAvailability: 'loading',
      refreshing: preserveItems,
      loadingMore: false,
      pageError: null,
    });

    const [pageResult, pendingResult] = await Promise.allSettled([
      this.repository.loadPage(uid),
      this.repository.loadPending(uid),
    ]);
    if (!this.isCurrent(identityGeneration, requestVersion, uid)) return;

    const pendingAvailability =
      pendingResult.status === 'fulfilled' &&
      pendingResult.value === 'unsupported'
        ? 'unsupported'
        : 'error';

    if (pageResult.status === 'rejected') {
      this.publish({
        ...this.state,
        phase: previousItems.length > 0 ? 'ready' : 'error',
        items: previousItems,
        nextCursor: previousCursor,
        pendingAvailability,
        refreshing: false,
        loadingMore: false,
        pageError: 'activity_load_failed',
      });
      return;
    }

    try {
      this.assertFirstPage(pageResult.value);
    } catch {
      this.publish({
        ...this.state,
        phase: previousItems.length > 0 ? 'ready' : 'error',
        items: previousItems,
        nextCursor: previousCursor,
        pendingAvailability,
        refreshing: false,
        loadingMore: false,
        pageError: 'activity_load_failed',
      });
      return;
    }
    this.publish({
      phase: 'ready',
      items: [...pageResult.value.items],
      nextCursor: pageResult.value.nextCursor,
      pendingAvailability,
      refreshing: false,
      loadingMore: false,
      pageError: null,
    });
  }

  private async performLoadMore(): Promise<void> {
    const uid = this.uid;
    const requestedCursor = this.state.nextCursor;
    if (!uid || !requestedCursor) return;
    const identityGeneration = this.identityGeneration;
    const requestVersion = this.requestVersion;
    this.publish({
      ...this.state,
      loadingMore: true,
      pageError: null,
    });
    try {
      const page = await this.repository.loadPage(uid, requestedCursor);
      if (!this.isCurrent(identityGeneration, requestVersion, uid)) return;
      this.assertNextPage(page, requestedCursor);
      this.publish({
        ...this.state,
        items: [...this.state.items, ...page.items],
        nextCursor: page.nextCursor,
        loadingMore: false,
        pageError: null,
      });
    } catch {
      if (!this.isCurrent(identityGeneration, requestVersion, uid)) return;
      this.publish({
        ...this.state,
        loadingMore: false,
        pageError: 'activity_pagination_failed',
      });
    }
  }

  private assertFirstPage(page: LoyaltyActivityPage): void {
    if (new Set(page.items.map((item) => item.activityId)).size !== page.items.length) {
      throw new Error('loyalty_activity_duplicate_page');
    }
  }

  private assertNextPage(
    page: LoyaltyActivityPage,
    requestedCursor: string,
  ): void {
    if (page.nextCursor === requestedCursor) {
      throw new Error('loyalty_activity_repeated_cursor');
    }
    const existingIds = new Set(this.state.items.map((item) => item.activityId));
    const pageIds = new Set<string>();
    for (const item of page.items) {
      if (existingIds.has(item.activityId) || pageIds.has(item.activityId)) {
        throw new Error('loyalty_activity_duplicate_page');
      }
      pageIds.add(item.activityId);
    }
  }

  private isCurrent(
    identityGeneration: number,
    requestVersion: number,
    uid: string,
  ): boolean {
    return (
      identityGeneration === this.identityGeneration &&
      requestVersion === this.requestVersion &&
      uid === this.uid
    );
  }

  private publish(state: LoyaltyActivityState): void {
    this.state = state;
    this.listeners.forEach((listener) => listener(state));
  }
}
