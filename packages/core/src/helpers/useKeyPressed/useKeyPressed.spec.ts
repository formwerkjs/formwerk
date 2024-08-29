import { renderSetup } from '@test-utils/index';
import { useKeyPressed } from './useKeyPressed';
import { fireEvent } from '@testing-library/vue';
import { nextTick, ref } from 'vue';

describe('ref is true as long as the key is held', () => {
  test('accepts single key string', async () => {
    const { isPressed } = await renderSetup(() => {
      return { isPressed: useKeyPressed('ShiftLeft') };
    });

    expect(isPressed.value).toBe(false);
    await fireEvent.keyDown(window, { code: 'ShiftLeft' });
    expect(isPressed.value).toBe(true);
    await fireEvent.keyUp(window, { code: 'ShiftLeft' });
    expect(isPressed.value).toBe(false);
  });

  test('accepts multiple key strings', async () => {
    const { isPressed } = await renderSetup(() => {
      return { isPressed: useKeyPressed(['KeyK', 'KeyL']) };
    });

    expect(isPressed.value).toBe(false);
    await fireEvent.keyDown(window, { code: 'KeyK' });
    expect(isPressed.value).toBe(true);
    await fireEvent.keyUp(window, { code: 'KeyK' });
    expect(isPressed.value).toBe(false);

    await fireEvent.keyDown(window, { code: 'KeyL' });
    expect(isPressed.value).toBe(true);
    await fireEvent.keyUp(window, { code: 'KeyL' });
    expect(isPressed.value).toBe(false);
  });

  test('accepts a predicate', async () => {
    const { isPressed } = await renderSetup(() => {
      return { isPressed: useKeyPressed(e => e.code === 'KeyK') };
    });

    expect(isPressed.value).toBe(false);
    await fireEvent.keyDown(window, { code: 'KeyK' });
    expect(isPressed.value).toBe(true);
    await fireEvent.keyUp(window, { code: 'KeyK' });
    expect(isPressed.value).toBe(false);
  });
});

test('can be disabled', async () => {
  const isDisabled = ref(true);
  const { isPressed } = await renderSetup(() => {
    return { isPressed: useKeyPressed('KeyK', isDisabled) };
  });

  expect(isPressed.value).toBe(false);
  await fireEvent.keyDown(window, { code: 'KeyK' });
  expect(isPressed.value).toBe(false);
  await fireEvent.keyUp(window, { code: 'KeyK' });
  expect(isPressed.value).toBe(false);

  isDisabled.value = false;
  await nextTick();

  expect(isPressed.value).toBe(false);
  await fireEvent.keyDown(window, { code: 'KeyK' });
  expect(isPressed.value).toBe(true);
  await fireEvent.keyUp(window, { code: 'KeyK' });
  expect(isPressed.value).toBe(false);
});
