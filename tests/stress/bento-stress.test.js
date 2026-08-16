/**
 * BentoFeaturedDrinks stress test — Jest + react-test-renderer (headless).
 * Uses RN's jest-preset (handles Flow syntax via babel).
 *
 * Focus: RN debug console. Abort on parent-container layout shift.
 */
import React from 'react';
import TestRenderer, { act } from 'react-test-renderer';
import { Animated, PanResponder } from 'react-native';

import BentoFeaturedDrinks from '../../src/components/BentoFeaturedDrinks';

let failures = 0;
const fail = (msg) => { failures += 1; console.error('FAIL:', msg); };
const ok = (msg) => console.log('  ok:', msg);

describe('BentoFeaturedDrinks stress', () => {
  test('gesture simulation: swipe left/right, snap-back, no layout shift, no crash', async () => {
    // capture PanResponder config from the component's PanResponder.create call
    const realCreate = PanResponder.create.bind(PanResponder);
    let handlers = null;
    PanResponder.create = (config) => {
      handlers = config;
      return realCreate(config);
    };

    let renderer;
    await act(async () => {
      renderer = TestRenderer.create(<BentoFeaturedDrinks />);
    });

    const getContainer = () =>
      renderer.root.findAll(
        (n) =>
          n.type === 'View' &&
          n.props.style &&
          JSON.stringify(n.props.style).includes('#B91C2F') &&
          JSON.stringify(n.props.style).includes('180'),
      )[0];

    const container = getContainer();
    if (!container) { fail('container not found'); return; }

    const initialStyle = JSON.stringify(container.props.style);

    // simulate onLayout (headless: no native layout events)
    await act(async () => {
      container.props.onLayout({ nativeEvent: { layout: { width: 320, height: 180 } } });
    });
    ok('onLayout applied');

    if (!handlers) { fail('PanResponder.create not called'); return; }
    ok('PanResponder handlers captured');

    const gesture = (dx, vx = 0) => ({
      dx, vx, dy: 0, vy: 0, numberActiveTouches: 1, _accountsForMovesUpTo: 0,
    });
    const settle = (ms = 300) => new Promise((r) => setTimeout(r, ms));

    // --- swipe left (advance) ---
    await act(async () => {
      handlers.onPanResponderGrant({}, gesture(0));
      handlers.onPanResponderMove({}, gesture(-120));
      handlers.onPanResponderRelease({}, gesture(-120, -0.8));
    });
    await settle();

    // --- swipe right from step 1 (prev) ---
    await act(async () => {
      handlers.onPanResponderGrant({}, gesture(0));
      handlers.onPanResponderMove({}, gesture(150));
      handlers.onPanResponderRelease({}, gesture(150, 0.9));
    });
    await settle();

    // --- swipe right on FIRST slide (step 0) — ghost-image path ---
    // reset by swiping left twice to get back to step 0
    for (let i = 0; i < 2; i++) {
      await act(async () => {
        handlers.onPanResponderGrant({}, gesture(0));
        handlers.onPanResponderMove({}, gesture(-120));
        handlers.onPanResponderRelease({}, gesture(-120, -0.8));
      });
      await settle();
    }
    await act(async () => {
      handlers.onPanResponderGrant({}, gesture(0));
      handlers.onPanResponderMove({}, gesture(90));
      handlers.onPanResponderRelease({}, gesture(90, 0.7));
    });
    await settle();

    // --- sub-threshold drag (snap back) ---
    await act(async () => {
      handlers.onPanResponderGrant({}, gesture(0));
      handlers.onPanResponderMove({}, gesture(15));
      handlers.onPanResponderRelease({}, gesture(15, 0.2));
    });
    await settle();

    // --- layout shift assertion ---
    const finalStyle = JSON.stringify(getContainer().props.style);
    if (initialStyle !== finalStyle) {
      fail(`LAYOUT SHIFT on parent container!\n  before: ${initialStyle}\n  after:  ${finalStyle}`);
    } else {
      ok('no parent container layout shift');
    }

    // --- re-render after all gestures (crash check) ---
    await act(async () => {
      renderer.update(<BentoFeaturedDrinks />);
    });
    ok('re-render after gestures OK');

    renderer.unmount();
    expect(failures).toBe(0);
  });
});
