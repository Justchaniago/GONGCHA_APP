import assert from 'node:assert/strict';
import test from 'node:test';

import {
  activePromotionsByType,
  ObservePromotions,
} from '../../src/application/promotions/ObservePromotions.ts';
import { mapFirestorePromotion } from '../../src/infrastructure/promotions/mapFirestorePromotion.ts';

function timestamp(epochMilliseconds) {
  return { toMillis: () => epochMilliseconds };
}

const carousel = {
  id: 'carousel',
  type: 'carousel',
  title: 'Carousel',
  imageUrl: 'https://example.com/carousel.png',
  order: 2,
  isActive: true,
  startAt: null,
  endAt: null,
};

test('Firestore mapper removes provider timestamps and applies defaults', () => {
  assert.deepEqual(
    mapFirestorePromotion('one', {
      type: 'modal_ad',
      title: 'Ad',
      imageUrl: 'https://example.com/ad.png',
      order: 3,
      isActive: true,
      startDate: timestamp(100),
      endDate: timestamp(200),
    }),
    {
      id: 'one',
      type: 'modal_ad',
      title: 'Ad',
      imageUrl: 'https://example.com/ad.png',
      order: 3,
      isActive: true,
      startAt: 100,
      endAt: 200,
    },
  );

  assert.deepEqual(mapFirestorePromotion('default', { type: 'unknown' }), {
    id: 'default',
    type: 'carousel',
    title: '',
    imageUrl: '',
    order: 0,
    isActive: false,
    startAt: null,
    endAt: null,
  });
});

test('filter keeps matching active promotions inside inclusive schedule', () => {
  const now = 100;
  const promotions = [
    { ...carousel, id: 'inactive', isActive: false },
    { ...carousel, id: 'future', startAt: 101 },
    { ...carousel, id: 'expired', endAt: 99 },
    { ...carousel, id: 'at-start', startAt: now },
    { ...carousel, id: 'at-end', endAt: now },
    { ...carousel, id: 'modal', type: 'modal_ad' },
  ];

  assert.deepEqual(
    activePromotionsByType(promotions, 'carousel', now).map(
      (promotion) => promotion.id,
    ),
    ['at-start', 'at-end'],
  );
});

test('filter sorts ascending and preserves input order for ties', () => {
  const promotions = [
    { ...carousel, id: 'second-a', order: 2 },
    { ...carousel, id: 'first', order: 1 },
    { ...carousel, id: 'second-b', order: 2 },
  ];

  assert.deepEqual(
    activePromotionsByType(promotions, 'carousel', 100).map(
      (promotion) => promotion.id,
    ),
    ['first', 'second-a', 'second-b'],
  );
});

function createRepository() {
  let update;
  let error;
  let unsubscribed = false;

  return {
    observe(onUpdate, onError) {
      update = onUpdate;
      error = onError;
      return () => {
        unsubscribed = true;
      };
    },
    emit(promotions) {
      update(promotions);
    },
    fail() {
      error();
    },
    wasUnsubscribed() {
      return unsubscribed;
    },
  };
}

test('observer filters each snapshot using the current clock', () => {
  const repository = createRepository();
  let now = 100;
  const results = [];
  const observer = new ObservePromotions(repository, () => now);
  observer.execute('carousel', (promotions) => {
    results.push(promotions.map((promotion) => promotion.id));
  });

  repository.emit([{ ...carousel, id: 'scheduled', startAt: 101 }]);
  now = 101;
  repository.emit([{ ...carousel, id: 'scheduled', startAt: 101 }]);

  assert.deepEqual(results, [[], ['scheduled']]);
});

test('observer maps provider errors to empty and returns unsubscribe', () => {
  const repository = createRepository();
  const results = [];
  const observer = new ObservePromotions(repository, () => 100);
  const unsubscribe = observer.execute('carousel', (promotions) => {
    results.push(promotions);
  });

  repository.emit([carousel]);
  repository.fail();
  unsubscribe();

  assert.deepEqual(results, [[carousel], []]);
  assert.equal(repository.wasUnsubscribed(), true);
});
