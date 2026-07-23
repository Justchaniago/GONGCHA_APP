import type { Store } from './Store';

export type StoreStatusKind = 'open' | 'closing-soon' | 'closed';

function parseHoursRange(hours: string) {
  const matches = hours.match(/(\d{1,2})[:.](\d{2})/g);
  if (!matches || matches.length < 2) {
    return null;
  }

  const toMinutes = (raw: string) => {
    const [hoursPart, minutesPart] = raw.replace('.', ':').split(':').map(Number);
    return hoursPart * 60 + minutesPart;
  };

  return {
    open: toMinutes(matches[0]),
    close: toMinutes(matches[1]),
  };
}

export function getStoreStatus(
  store: Store,
  nowEpochMilliseconds: number,
): StoreStatusKind {
  if (store.statusOverride === 'open') {
    return 'open';
  }
  if (store.statusOverride === 'almost_close') {
    return 'closing-soon';
  }
  if (store.statusOverride === 'closed') {
    return 'closed';
  }

  const range = parseHoursRange(store.openHours);
  if (!range) {
    return 'open';
  }

  const now = new Date(nowEpochMilliseconds);
  const nowMinutes = now.getHours() * 60 + now.getMinutes();
  const isOvernight = range.close < range.open;
  const isOpen = isOvernight
    ? nowMinutes >= range.open || nowMinutes < range.close
    : nowMinutes >= range.open && nowMinutes < range.close;

  if (!isOpen) {
    return 'closed';
  }

  let minutesToClose = range.close - nowMinutes;
  if (isOvernight && nowMinutes >= range.open) {
    minutesToClose = 24 * 60 - nowMinutes + range.close;
  }

  return minutesToClose <= 30 && minutesToClose > 0
    ? 'closing-soon'
    : 'open';
}
