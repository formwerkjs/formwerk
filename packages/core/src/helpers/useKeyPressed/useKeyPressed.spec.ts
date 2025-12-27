import { renderSetup } from '@test-utils/index';
import { useKeyPressed } from './useKeyPressed';
import { nextTick, ref } from 'vue';
import { hasKeyCode } from '../../utils/common';

function keyDown(code: string) {
  window.dispatchEvent(
    new KeyboardEvent('keydown', { code, key: code, bubbles: true, cancelable: true, composed: true }),
  );
}

function keyUp(code: string) {
  window.dispatchEvent(
    new KeyboardEvent('keyup', { code, key: code, bubbles: true, cancelable: true, composed: true }),
  );
}

describe('ref is true as long as the key is held', () => {
  test('accepts single key string', async () => {
    const { isPressed } = renderSetup(() => {
      return { isPressed: useKeyPressed('ShiftLeft') };
    });

    expect(isPressed.value).toBe(false);
    keyDown('ShiftLeft');
    await nextTick();
    expect(isPressed.value).toBe(true);
    keyUp('ShiftLeft');
    await nextTick();
    expect(isPressed.value).toBe(false);
  });

  test('accepts multiple key strings', async () => {
    const { isPressed } = renderSetup(() => {
      return { isPressed: useKeyPressed(['KeyK', 'KeyL']) };
    });

    expect(isPressed.value).toBe(false);
    keyDown('KeyK');
    await nextTick();
    expect(isPressed.value).toBe(true);
    keyUp('KeyK');
    await nextTick();
    expect(isPressed.value).toBe(false);

    keyDown('KeyL');
    await nextTick();
    expect(isPressed.value).toBe(true);
    keyUp('KeyL');
    await nextTick();
    expect(isPressed.value).toBe(false);
  });

  test('accepts a predicate', async () => {
    const { isPressed } = renderSetup(() => {
      return { isPressed: useKeyPressed(e => hasKeyCode(e, 'KeyK')) };
    });

    expect(isPressed.value).toBe(false);
    keyDown('KeyK');
    await nextTick();
    expect(isPressed.value).toBe(true);
    keyUp('KeyK');
    await nextTick();
    expect(isPressed.value).toBe(false);
  });
});

test('can be disabled', async () => {
  const isDisabled = ref(true);
  const { isPressed } = renderSetup(() => {
    return { isPressed: useKeyPressed('KeyK', isDisabled) };
  });

  expect(isPressed.value).toBe(false);
  keyDown('KeyK');
  expect(isPressed.value).toBe(false);
  keyUp('KeyK');
  expect(isPressed.value).toBe(false);

  isDisabled.value = false;
  await nextTick();

  expect(isPressed.value).toBe(false);
  keyDown('KeyK');
  await nextTick();
  expect(isPressed.value).toBe(true);
  keyUp('KeyK');
  await nextTick();
  expect(isPressed.value).toBe(false);

  isDisabled.value = true;
  await nextTick();

  expect(isPressed.value).toBe(false);
  keyDown('KeyK');
  expect(isPressed.value).toBe(false);
  keyUp('KeyK');
  expect(isPressed.value).toBe(false);
});
