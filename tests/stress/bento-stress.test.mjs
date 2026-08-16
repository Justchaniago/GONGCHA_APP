/**
 * BentoFeaturedDrinks stress test — headless RN render + PanResponder gesture simulation.
 * Focus: RN debug console (no visual). Abort on parent container layout shift.
 *
 * Monkey-patches RN's PanResponder/animation internals to capture the responder's
 * gesture handlers, so we can drive onPanResponderMove/Release directly with dx/vx.
 */
import React, { useEffect } from 'react';
import TestRenderer, { act } from 'react-test-renderer';

// react-native ships Flow syntax in its ESM entry; load the CommonJS build instead.
import { createRequire } from 'node:module';
const require = createRequire(import.meta.url);
const { Animated, PanResponder } = require('react-native');

// The component imports 'react-native' too — alias the ESM entry to the CJS build
// so tsx/esbuild doesn't choke on the Flow syntax.
const rnPath = require.resolve('react-native');
const rnCjs = require.resolve('react-native/Libraries/Renderer/shims/ReactNative.js');

import BentoFeaturedDrinks from '../../src/components/BentoFeaturedDrinks.tsx';

let failures = 0;
const fail = (msg) => { failures += 1; console.error('FAIL:', msg); };
const ok = (msg) => console.log('  ok:', msg);

// --- capture created panHandlers from PanResponder.create -------------------
const realCreate = PanResponder.create.bind(PanResponder);
let capturedHandlers = null;
PanResponder.create = (config) => {
  const res = realCreate(config);
  capturedHandlers = config; // raw config: onStartShouldSetPanResponder etc.
  return res;
};

// --- hook into Animated to watch for layout-affecting properties -------------
const layoutProps = new Set(['width', 'height', 'marginTop', 'marginBottom', 'top', 'bottom']);
const originalSetValue = Animated.Value.prototype.setValue;
let layoutViolation = null;
Animated.Value.prototype.setValue = function (value) {
  // We can't see which style prop a value is bound to from here; instead we
  // assert the host View's style stays stable by diffing rendered snapshots.
  return originalSetValue.call(this, value);
};

// host component snapshot — capture style of the top-level container
function getContainerStyle(tree) {
  // find the outermost View with container style (height 180, bg #B91C2F)
  let found = null;
  tree.root.findAll((node) => {
    if (node.type === 'View' && node.props.style) {
      const s = Array.isArray(node.props.style) ? node.props.style.flat() : [node.props.style];
      const flat = s.reduce((a, b) => (typeof b === 'object' ? { ...a, ...b } : a), {});
      if (flat.height === 180 && flat.backgroundColor === '#B91C2F') found = flat;
    }
    return false;
  });
  return found;
}

async function main() {
  // fire the auto-slide timer quickly for a few cycles, then stop
  let renderer;
  await act(async () => {
    renderer = TestRenderer.create(React.createElement(BentoFeaturedDrinks));
  });

  // initial container style snapshot
  const initialStyle = JSON.stringify(getContainerStyle(renderer));
  ok(`initial container: ${initialStyle}`);

  // wait for layout event (onLayout sets width ref) — simulate via handleLayout?
  // The component measures width from onLayout. No native layout in headless.
  // Monkey-patch: call onLayout directly on the container View.
  const container = renderer.root.findAll((n) => n.type === 'View' && n.props.onLayout)[0];
  if (!container) { fail('no container with onLayout found'); return; }
  await act(async () => {
    container.props.onLayout({ nativeEvent: { layout: { width: 320, height: 180 } } });
  });
  ok('onLayout width=320 applied');

  // --- capture panHandlers from the render ----------------------------------
  const view = renderer.root.findAll((n) => n.props && n.props.onStartShouldSetPanResponder);
  if (!capturedHandlers) { fail('PanResponder.create was not called'); return; }
  ok('PanResponder handlers captured');

  const gesture = (dx, vx = 0) => ({
    dx, vx, dy: 0, vy: 0, numberActiveTouches: 1, _accountsForMovesUpTo: 0,
  });

  // Test 1: swipe left past threshold (advance)
  console.log('--- swipe left (advance) ---');
  await act(async () => {
    capturedHandlers.onPanResponderGrant({}, gesture(0));
    capturedHandlers.onPanResponderMove({}, gesture(-120));
    capturedHandlers.onPanResponderRelease({}, gesture(-120, -0.8));
  });
  // give springs time (they're async; native driver not available headless — Animated falls back to JS)
  await new Promise((r) => setTimeout(r, 250));
  await act(async () => {});

  // Test 2: swipe right from step 1 (prev) — this is the ghost-image path
  console.log('--- swipe right (prev from step 1) ---');
  await act(async () => {
    capturedHandlers.onPanResponderGrant({}, gesture(0));
    capturedHandlers.onPanResponderMove({}, gesture(150));
    capturedHandlers.onPanResponderRelease({}, gesture(150, 0.9));
  });
  await new Promise((r) => setTimeout(r, 250));
  await act(async () => {});

  // Test 3: swipe right on FIRST slide (step 0) — the blocker path
  console.log('--- swipe right on first slide (step 0) ---');
  await act(async () => {
    capturedHandlers.onPanResponderGrant({}, gesture(0));
    capturedHandlers.onPanResponderMove({}, gesture(90));
    capturedHandlers.onPanResponderRelease({}, gesture(90, 0.7));
  });
  await new Promise((r) => setTimeout(r, 250));
  await act(async () => {});

  // Test 4: below-threshold release (snap back)
  console.log('--- sub-threshold drag (snap back) ---');
  await act(async () => {
    capturedHandlers.onPanResponderGrant({}, gesture(0));
    capturedHandlers.onPanResponderMove({}, gesture(15));
    capturedHandlers.onPanResponderRelease({}, gesture(15, 0.2));
  });
  await new Promise((r) => setTimeout(r, 250));
  await act(async () => {});

  // Layout-shift assertion: container style must be unchanged across all gestures
  const finalStyle = JSON.stringify(getContainerStyle(renderer));
  if (initialStyle !== finalStyle) {
    fail(`LAYOUT SHIFT on parent container!\n  before: ${initialStyle}\n  after:  ${finalStyle}`);
  } else {
    ok('no parent container layout shift');
  }

  // Render should not throw after all gestures (crash check)
  try {
    await act(async () => { renderer.update(React.createElement(BentoFeaturedDrinks)); });
    ok('re-render after gestures OK');
  } catch (e) {
    fail(`re-render threw: ${e.message}`);
  }

  renderer.unmount();
  console.log(failures === 0 ? '\nRESULT: PASS (0 failures)' : `\nRESULT: FAIL (${failures} failures)`);
  process.exit(failures === 0 ? 0 : 1);
}

main().catch((e) => { console.error('FATAL', e); process.exit(2); });
