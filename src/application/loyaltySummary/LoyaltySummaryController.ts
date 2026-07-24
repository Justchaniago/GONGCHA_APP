import type { LoyaltySummaryRepository } from '../ports/loyaltySummary/LoyaltySummaryRepository';
import type { LoyaltySummaryState } from './LoyaltySummary';

type Listener = (state: LoyaltySummaryState) => void;

function emptyState(): LoyaltySummaryState {
  return {
    phase: 'idle',
    summary: null,
    refreshing: false,
    error: null,
  };
}

export class LoyaltySummaryController {
  private readonly repository: LoyaltySummaryRepository;
  private readonly listeners = new Set<Listener>();
  private state: LoyaltySummaryState = emptyState();
  private uid: string | null = null;
  private identityGeneration = 0;
  private requestVersion = 0;

  constructor(repository: LoyaltySummaryRepository) {
    this.repository = repository;
  }

  getState(): LoyaltySummaryState {
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
    this.uid = uid;
    this.publish(emptyState());
    void this.load(false);
  }

  stop(): void {
    this.identityGeneration += 1;
    this.requestVersion += 1;
    this.uid = null;
    this.state = emptyState();
  }

  refresh(): Promise<void> {
    return this.load(this.state.phase === 'ready');
  }

  retry(): Promise<void> {
    return this.load(this.state.phase === 'ready');
  }

  private async load(preserveSummary: boolean): Promise<void> {
    const uid = this.uid;
    if (!uid) return;
    const identityGeneration = this.identityGeneration;
    const requestVersion = ++this.requestVersion;
    const previous =
      preserveSummary && this.state.phase === 'ready'
        ? this.state.summary
        : null;

    this.publish(
      previous
        ? {
            phase: 'ready',
            summary: previous,
            refreshing: true,
            error: null,
          }
        : {
            phase: 'loading',
            summary: null,
            refreshing: false,
            error: null,
          },
    );

    try {
      const summary = await this.repository.load(uid);
      if (!this.isCurrent(identityGeneration, requestVersion, uid)) return;
      this.publish({
        phase: 'ready',
        summary,
        refreshing: false,
        error: null,
      });
    } catch {
      if (!this.isCurrent(identityGeneration, requestVersion, uid)) return;
      this.publish(
        previous
          ? {
              phase: 'ready',
              summary: previous,
              refreshing: false,
              error: 'summary_refresh_failed',
            }
          : {
              phase: 'error',
              summary: null,
              refreshing: false,
              error: 'summary_load_failed',
            },
      );
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

  private publish(state: LoyaltySummaryState): void {
    this.state = state;
    this.listeners.forEach((listener) => listener(state));
  }
}
