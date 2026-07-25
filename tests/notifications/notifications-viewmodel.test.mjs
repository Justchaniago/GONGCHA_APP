// tests/notifications/notifications-viewmodel.test.mjs

import assert from 'node:assert/strict';
import test from 'node:test';
import {
  buildLegacyNotificationsViewModel,
  buildLocalNotificationsViewModel,
} from '../../src/application/notifications/NotificationsViewModel.ts';

test('buildLegacyNotificationsViewModel correctly maps legacy notification types and states', () => {
  const mockNow = new Date('2026-07-25T14:00:00Z').getTime();

  const rawNotifications = [
    {
      id: 'notif-1',
      title: 'Voucher Baru',
      body: 'Kamu mendapatkan voucher baru',
      type: 'voucher_injected',
      isRead: false,
      createdAt: '2026-07-25T13:59:00Z', // 1m ago
      data: { deepLink: 'gongcha://rewards' },
    },
    {
      id: 'notif-2',
      title: 'Transaksi Berhasil',
      body: 'Poin berhasil ditambahkan',
      type: 'tx_verified',
      isRead: true,
      createdAt: '2026-07-25T13:00:00Z', // 1h ago
    },
    {
      id: 'notif-3',
      title: 'Informasi Penting',
      body: 'Sistem sedang maintenance',
      type: 'system',
      isRead: false,
      createdAt: '2026-07-24T14:00:00Z', // 1d ago
    },
  ];

  const model = buildLegacyNotificationsViewModel(rawNotifications, mockNow);

  assert.equal(model.unreadCount, 2);
  assert.equal(model.unreadCountLabel, '2 baru');
  assert.equal(model.items.length, 3);

  // Item 1 (promo category, unread, actionUrl mapped)
  assert.deepEqual(model.items[0], {
    id: 'notif-1',
    title: 'Voucher Baru',
    message: 'Kamu mendapatkan voucher baru',
    timeAgoText: '1m lalu',
    isRead: false,
    category: 'promo',
    actionUrl: 'gongcha://rewards',
  });

  // Item 2 (loyalty category, read)
  assert.deepEqual(model.items[1], {
    id: 'notif-2',
    title: 'Transaksi Berhasil',
    message: 'Poin berhasil ditambahkan',
    timeAgoText: '1j lalu',
    isRead: true,
    category: 'loyalty',
    actionUrl: undefined,
  });

  // Item 3 (system category, unread, older)
  assert.deepEqual(model.items[2], {
    id: 'notif-3',
    title: 'Informasi Penting',
    message: 'Sistem sedang maintenance',
    timeAgoText: '1h lalu', // 24 hours is 1 day (1h) ago
    isRead: false,
    category: 'system',
    actionUrl: undefined,
  });
});

test('buildLocalNotificationsViewModel correctly normalizes raw inputs', () => {
  const mockNow = new Date('2026-07-25T14:00:00Z').getTime();

  const rawNotifications = [
    {
      id: 'local-1',
      title: 'Selamat! Kamu mendapatkan 50 Leaves dari transaksi Grand Indonesia',
      message: 'Leaves telah ditambahkan ke akunmu.',
      type: 'loyalty',
      read: false,
      time: '2026-07-25T14:00:00Z', // 0s ago
    },
    {
      id: 'local-2',
      title: 'Voucher Cashback 50% milikmu akan kadaluarsa dalam 2 hari',
      body: 'Gunakan segera sebelum hangus.',
      category: 'promo',
      isRead: true,
      date: '2026-07-25T11:00:00Z', // 3h ago
    },
    {
      id: 'local-3',
      title: 'Pembaruan Kebijakan Privasi Gong Cha App',
      text: 'Kami memperbarui syarat dan ketentuan.',
      type: 'system',
      isRead: false,
      createdAt: '2026-07-25T13:30:00Z', // 30m ago
    },
  ];

  const model = buildLocalNotificationsViewModel(rawNotifications, mockNow);

  assert.equal(model.unreadCount, 2);
  assert.equal(model.items.length, 3);

  // Item 1 (loyalty, message, read: false, timeAgoText)
  assert.deepEqual(model.items[0], {
    id: 'local-1',
    title: 'Selamat! Kamu mendapatkan 50 Leaves dari transaksi Grand Indonesia',
    message: 'Leaves telah ditambahkan ke akunmu.',
    timeAgoText: 'Baru saja',
    isRead: false,
    category: 'loyalty',
    actionUrl: undefined,
  });

  // Item 2 (promo, body -> message, isRead: true)
  assert.deepEqual(model.items[1], {
    id: 'local-2',
    title: 'Voucher Cashback 50% milikmu akan kadaluarsa dalam 2 hari',
    message: 'Gunakan segera sebelum hangus.',
    timeAgoText: '3j lalu',
    isRead: true,
    category: 'promo',
    actionUrl: undefined,
  });

  // Item 3 (system, text -> message)
  assert.deepEqual(model.items[2], {
    id: 'local-3',
    title: 'Pembaruan Kebijakan Privasi Gong Cha App',
    message: 'Kami memperbarui syarat dan ketentuan.',
    timeAgoText: '30m lalu',
    isRead: false,
    category: 'system',
    actionUrl: undefined,
  });
});
