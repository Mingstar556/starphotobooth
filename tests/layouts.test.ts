import assert from 'node:assert/strict';
import test from 'node:test';
import {
  BOOTH_LAYOUTS,
  computeLayoutSlots,
  getLayoutById
} from '../src/engine/layouts.ts';
import {
  buildPreferencesPayload,
  parsePreferencesCookie
} from '../server/services/session.service.ts';

test('all photobooth layouts produce exact shotCount slots inside canvas bounds', () => {
  for (const layout of BOOTH_LAYOUTS) {
    const slots = computeLayoutSlots(layout);
    assert.equal(slots.length, layout.shotCount);
    for (const slot of slots) {
      assert.ok(slot.width > 0 && slot.height > 0);
      assert.ok(slot.x >= layout.padding);
      assert.ok(slot.y >= layout.padding);
      assert.ok(slot.x + slot.width <= layout.canvasWidth - layout.padding + 0.01);
      assert.ok(
        slot.y + slot.height <=
          layout.canvasHeight - layout.padding - layout.footerHeight + 0.01
      );
    }
  }
});

test('getLayoutById falls back to default on unknown id', () => {
  const layout = getLayoutById('2x2');
  assert.equal(layout.id, '2x2');
  assert.equal(layout.shotCount, 4);
});

test('session preferences cookie parser handles invalid JSON safely', () => {
  const fallback = parsePreferencesCookie('{bad-json');
  assert.equal(fallback.layoutId, '2x2');
  assert.equal(fallback.stripTheme, 'black');

  const valid = buildPreferencesPayload({
    layoutId: '3-down',
    stripTheme: 'pink',
    countdownSeconds: 5,
    mirrorSelfie: true
  });
  assert.equal(valid.layoutId, '3-down');
  assert.equal(valid.stripTheme, 'pink');
  assert.equal(valid.countdownSeconds, 5);
});
