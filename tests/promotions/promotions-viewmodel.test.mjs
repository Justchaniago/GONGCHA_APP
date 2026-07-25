import assert from 'node:assert/strict';
import test from 'node:test';

import {
  buildLegacyPromotionsViewModel,
  buildLocalPromotionsViewModel,
} from '../../src/application/promotions/PromotionsViewModel.ts';

function timestamp(epochMilliseconds) {
  return { toMillis: () => epochMilliseconds };
}

test('buildLegacyPromotionsViewModel maps legacy carousel/modal_ad, formats dates, and filters active', () => {
  const rawLegacyPromos = [
    {
      id: 'p1',
      type: 'carousel',
      title: 'Legacy Hero Promo',
      imageUrl: 'https://example.com/hero1.png',
      order: 1,
      isActive: true,
      startDate: timestamp(1710000000000), // 10 Mar 2024 approx
      endDate: timestamp(1710518400000), // 15 Mar 2024 approx
    },
    {
      id: 'p2',
      type: 'modal_ad',
      title: 'Legacy Modal Promo',
      imageUrl: 'https://example.com/modal1.png',
      order: 2,
      isActive: true,
    },
    {
      id: 'p3',
      type: 'carousel',
      title: 'Legacy Inactive Hero Promo',
      imageUrl: 'https://example.com/hero2.png',
      order: 3,
      isActive: false,
    }
  ];

  const vm = buildLegacyPromotionsViewModel(rawLegacyPromos);

  // Check hero banners
  assert.equal(vm.heroBanners.length, 1);
  assert.equal(vm.heroBanners[0].id, 'p1');
  assert.equal(vm.heroBanners[0].bannerType, 'hero');
  assert.equal(vm.heroBanners[0].formattedPeriod, '9 Mar 2024 - 15 Mar 2024');

  // Check modal banner
  assert.ok(vm.promoModalBanner);
  assert.equal(vm.promoModalBanner.id, 'p2');
  assert.equal(vm.promoModalBanner.bannerType, 'modal');
  assert.equal(vm.promoModalBanner.formattedPeriod, 'Always Active');

  // Check active cards - empty for legacy format
  assert.equal(vm.activeCards.length, 0);
});

test('buildLocalPromotionsViewModel parses local promotions and handles activeCards', () => {
  const rawLocalPromos = [
    {
      id: 'l1',
      title: 'Local Hero',
      subtitle: 'Hero Subtitle',
      imageUrl: 'https://example.com/lhero.png',
      bannerType: 'hero',
      active: true,
      startAt: 1710000000000,
      endAt: 1710518400000,
    },
    {
      id: 'l2',
      title: 'Local Card',
      subtitle: 'Card Subtitle',
      imageUrl: 'https://example.com/lcard.png',
      bannerType: 'card',
      active: true,
      startAt: '2024-03-10T00:00:00.000Z',
    },
    {
      id: 'l3',
      title: 'Local Modal',
      subtitle: 'Modal Subtitle',
      imageUrl: 'https://example.com/lmodal.png',
      bannerType: 'modal',
      active: true,
      endAt: new Date(1710518400000),
    },
    {
      id: 'l4',
      title: 'Inactive Card',
      subtitle: 'Should not show',
      imageUrl: 'https://example.com/linactive.png',
      bannerType: 'card',
      active: false,
    }
  ];

  const vm = buildLocalPromotionsViewModel(rawLocalPromos);

  // Verify Hero
  assert.equal(vm.heroBanners.length, 1);
  assert.equal(vm.heroBanners[0].id, 'l1');
  assert.equal(vm.heroBanners[0].subtitle, 'Hero Subtitle');
  assert.equal(vm.heroBanners[0].bannerType, 'hero');

  // Verify Card
  assert.equal(vm.activeCards.length, 1);
  assert.equal(vm.activeCards[0].id, 'l2');
  assert.equal(vm.activeCards[0].subtitle, 'Card Subtitle');
  assert.equal(vm.activeCards[0].bannerType, 'card');
  assert.equal(vm.activeCards[0].formattedPeriod, 'From 10 Mar 2024');

  // Verify Modal
  assert.ok(vm.promoModalBanner);
  assert.equal(vm.promoModalBanner.id, 'l3');
  assert.equal(vm.promoModalBanner.subtitle, 'Modal Subtitle');
  assert.equal(vm.promoModalBanner.bannerType, 'modal');
  assert.equal(vm.promoModalBanner.formattedPeriod, 'Until 15 Mar 2024');
});
