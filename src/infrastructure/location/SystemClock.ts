import type { Clock } from '../../application/ports/stores/Clock';

export class SystemClock implements Clock {
  now(): number {
    return Date.now();
  }
}
