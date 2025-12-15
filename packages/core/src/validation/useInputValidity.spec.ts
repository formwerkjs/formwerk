import { computed, ref } from 'vue';
import { useInputValidity } from './useInputValidity';
import { render } from '@testing-library/vue';
import { FieldState, useFormField } from '../useFormField';
import { EventExpression } from '../helpers/useEventListener';
import { flush } from '../../../test-utils/src';
import { page } from 'vitest/browser';
import { expect } from 'vitest';

test('updates the validity state on blur events', async () => {
  const input = ref<HTMLInputElement>();

  render({
    setup: () => {
      const field = useFormField().state;
      useInputValidity({ inputEl: input, field });

      return { input, errorMessage: field.errorMessage };
    },
    template: `
      <form>
        <input ref="input" data-testid="input" required />
        <span data-testid="err">{{ errorMessage }}</span>
      </form>
    `,
  });

  ((await page.getByTestId('input').element()) as HTMLInputElement).dispatchEvent(
    new FocusEvent('blur', { bubbles: true }),
  );
  await flush();
  expect(((await page.getByTestId('err').element()) as HTMLElement).textContent).toMatch(
    /Constraints not satisfied|Please fill out this field\.?/,
  );
});

test('updates the validity state on change events', async () => {
  const input = ref<HTMLInputElement>();

  render({
    setup: () => {
      const field = useFormField().state;
      useInputValidity({ inputEl: input, field });

      return { input, errorMessage: field.errorMessage };
    },
    template: `
      <form>
        <input ref="input" data-testid="input" required />
        <span data-testid="err">{{ errorMessage }}</span>
      </form>
    `,
  });

  const inputEl = (await page.getByTestId('input').element()) as HTMLInputElement;
  inputEl.dispatchEvent(new Event('change', { bubbles: true }));
  await flush();
  expect(((await page.getByTestId('err').element()) as HTMLElement).textContent).toMatch(
    /Constraints not satisfied|Please fill out this field\.?/,
  );

  inputEl.value = 'test';
  inputEl.dispatchEvent(new Event('change', { bubbles: true }));
  await flush();
  expect(((await page.getByTestId('err').element()) as HTMLElement).textContent).toBe('');
});

test('updates the validity on specified events', async () => {
  const input = ref<HTMLInputElement>();

  render({
    setup: () => {
      const field = useFormField().state;
      useInputValidity({ inputEl: input, field, events: ['input'] });

      return { input, errorMessage: field.errorMessage };
    },
    template: `
      <form>
        <input ref="input" data-testid="input" required />
        <span data-testid="err">{{ errorMessage }}</span>
      </form>
    `,
  });

  const inputEl = (await page.getByTestId('input').element()) as HTMLInputElement;
  inputEl.dispatchEvent(new Event('input', { bubbles: true }));
  await flush();
  expect(((await page.getByTestId('err').element()) as HTMLElement).textContent).toMatch(
    /Constraints not satisfied|Please fill out this field\.?/,
  );

  inputEl.value = 'test';
  inputEl.dispatchEvent(new Event('input', { bubbles: true }));
  await flush();
  expect(((await page.getByTestId('err').element()) as HTMLElement).textContent).toBe('');
});

test('updates the input native validity with custom validity errors', async () => {
  const input = ref<HTMLInputElement>();
  let field!: FieldState<any>;
  render({
    setup: () => {
      field = useFormField().state;
      useInputValidity({ inputEl: input, field, events: ['input'] });

      return { input, errorMessage: field.errorMessage };
    },
    template: `
      <form>
        <input ref="input" data-testid="input" />
        <span data-testid="err">{{ errorMessage }}</span>
      </form>
    `,
  });

  await flush();
  field.setErrors('Custom error');
  await flush();
  expect(((await page.getByTestId('err').element()) as HTMLElement).textContent).toBe('Custom error');
  expect(input.value?.validationMessage).toBe('Custom error');
});

test('events can be reactive', async () => {
  const input = ref<HTMLInputElement>();
  const events = ref<EventExpression[]>(['test']);

  render({
    setup: () => {
      const field = useFormField().state;
      useInputValidity({ inputEl: input, field, events });

      return { input, errorMessage: field.errorMessage };
    },
    template: `
      <form>
        <input ref="input" data-testid="input" required />
        <span data-testid="err">{{ errorMessage }}</span>
      </form>
    `,
  });

  ((await page.getByTestId('input').element()) as HTMLInputElement).dispatchEvent(
    new FocusEvent('blur', { bubbles: true }),
  );
  // mounted validation
  expect(((await page.getByTestId('err').element()) as HTMLElement).textContent).toMatch(
    /Constraints not satisfied|Please fill out this field\.?/,
  );
  events.value = ['blur'];
  await page.getByTestId('input').fill('12');
  expect(((await page.getByTestId('err').element()) as HTMLElement).textContent).toMatch(
    /Constraints not satisfied|Please fill out this field\.?/,
  );
  ((await page.getByTestId('input').element()) as HTMLInputElement).dispatchEvent(
    new FocusEvent('blur', { bubbles: true }),
  );
  expect(((await page.getByTestId('err').element()) as HTMLElement).textContent).toBe('');
});

describe('isValidated tracking', () => {
  test('does not flash error on blur when field becomes valid (issue #203)', async () => {
    const input = ref<HTMLInputElement>();
    let field!: FieldState<any>;

    render({
      setup: () => {
        field = useFormField().state;
        useInputValidity({ inputEl: input, field });

        // This mimics the user pattern: only show errors after validation AND blur
        const displayError = computed(() => {
          // Don't show error until validated (prevents initial mount validation from showing)
          if (!field.isValidated.value) return '';
          // Don't show error until blurred (prevents showing while typing)
          if (!field.isBlurred.value) return '';
          return field.errorMessage.value;
        });

        return { input, displayError, errorMessage: field.errorMessage };
      },
      template: `
        <form>
          <input ref="input" data-testid="input" required />
          <span data-testid="display-err">{{ displayError }}</span>
          <span data-testid="raw-err">{{ errorMessage }}</span>
        </form>
      `,
    });

    // Initial state: no error displayed (even though field is invalid)
    expect(((await page.getByTestId('display-err').element()) as HTMLElement).textContent).toBe('');

    // Raw error should exist after mount validation
    await flush();
    expect(((await page.getByTestId('raw-err').element()) as HTMLElement).textContent).toMatch(
      /Constraints not satisfied|Please fill out this field\.?/,
    );

    // isValidated should still be false after mount (not user interaction)
    expect(field.isValidated.value).toBe(false);

    // User types a valid value
    await page.getByTestId('input').fill('valid value');

    // Focus the field and then blur it
    ((await page.getByTestId('input').element()) as HTMLInputElement).focus();
    field.setBlurred(true);
    ((await page.getByTestId('input').element()) as HTMLInputElement).dispatchEvent(
      new FocusEvent('blur', { bubbles: true }),
    );
    await flush();

    // Now isValidated should be true (user interaction)
    expect(field.isValidated.value).toBe(true);

    // Key assertion: NO error should flash because the field is now valid
    // If there was a bug, we'd see the stale error flash before async validation completes
    expect(((await page.getByTestId('display-err').element()) as HTMLElement).textContent).toBe('');
    expect(((await page.getByTestId('raw-err').element()) as HTMLElement).textContent).toBe('');
  });

  test('isValidated remains false after mount validation', async () => {
    const input = ref<HTMLInputElement>();
    let field!: FieldState<any>;

    render({
      setup: () => {
        field = useFormField().state;
        useInputValidity({ inputEl: input, field });

        return { input, isValidated: field.isValidated };
      },
      template: `
        <form>
          <input ref="input" data-testid="input" required />
          <span data-testid="validated">{{ isValidated }}</span>
        </form>
      `,
    });

    // After mount, validation runs but isValidated should remain false
    await flush();
    expect(((await page.getByTestId('validated').element()) as HTMLElement).textContent).toBe('false');
    expect(field.isValidated.value).toBe(false);
  });

  test('isValidated becomes true after blur event triggers validation', async () => {
    const input = ref<HTMLInputElement>();
    let field!: FieldState<any>;

    render({
      setup: () => {
        field = useFormField().state;
        useInputValidity({ inputEl: input, field });

        return { input, isValidated: field.isValidated };
      },
      template: `
        <form>
          <input ref="input" data-testid="input" required />
          <span data-testid="validated">{{ isValidated }}</span>
        </form>
      `,
    });

    // Initially false
    expect(field.isValidated.value).toBe(false);

    // User blurs the field (user interaction)
    ((await page.getByTestId('input').element()) as HTMLInputElement).dispatchEvent(
      new FocusEvent('blur', { bubbles: true }),
    );
    await flush();

    // Now isValidated should be true
    expect(field.isValidated.value).toBe(true);
    expect(((await page.getByTestId('validated').element()) as HTMLElement).textContent).toBe('true');
  });

  test('isValidated is set to true after change event triggers validation', async () => {
    const input = ref<HTMLInputElement>();
    let field!: FieldState<any>;

    render({
      setup: () => {
        field = useFormField().state;
        useInputValidity({ inputEl: input, field });

        return { input, isValidated: field.isValidated };
      },
      template: `
        <form>
          <input ref="input" data-testid="input" required />
          <span data-testid="validated">{{ isValidated }}</span>
        </form>
      `,
    });

    // Initially false even after mount
    await flush();
    expect(field.isValidated.value).toBe(false);

    // User triggers change event (user interaction)
    const inputEl = (await page.getByTestId('input').element()) as HTMLInputElement;
    inputEl.value = 'test';
    inputEl.dispatchEvent(new Event('change', { bubbles: true }));
    await flush();
    expect(field.isValidated.value).toBe(true);

    // Can be manually reset
    field.setIsValidated(false);
    expect(field.isValidated.value).toBe(false);

    // And set again by user interaction
    inputEl.value = 'test2';
    inputEl.dispatchEvent(new Event('change', { bubbles: true }));
    await flush();
    expect(field.isValidated.value).toBe(true);
  });

  test('isValidated helps prevent displaying initial validation errors', async () => {
    const input = ref<HTMLInputElement>();
    let field!: FieldState<any>;

    render({
      setup: () => {
        field = useFormField().state;
        useInputValidity({ inputEl: input, field });

        // Computed that mimics user code for conditional error display
        const displayError = computed(() => {
          return field.isValidated.value ? field.errorMessage.value : '';
        });

        return { input, displayError, errorMessage: field.errorMessage };
      },
      template: `
        <form>
          <input ref="input" data-testid="input" required />
          <span data-testid="err">{{ displayError }}</span>
          <span data-testid="raw-err">{{ errorMessage }}</span>
        </form>
      `,
    });

    // Validation runs on mount and sets errors
    await flush();

    // Raw error exists
    expect(((await page.getByTestId('raw-err').element()) as HTMLElement).textContent).toMatch(
      /Constraints not satisfied|Please fill out this field\.?/,
    );

    // But displayError should NOT show because isValidated is still false (mount is not user interaction)
    expect(((await page.getByTestId('err').element()) as HTMLElement).textContent).toBe('');
    expect(field.isValidated.value).toBe(false);

    // User interaction (blur) sets isValidated to true (field is still empty/invalid)
    ((await page.getByTestId('input').element()) as HTMLInputElement).dispatchEvent(
      new FocusEvent('blur', { bubbles: true }),
    );
    await flush();

    // Now errors should show because isValidated is true
    expect(field.isValidated.value).toBe(true);
    expect(((await page.getByTestId('err').element()) as HTMLElement).textContent).toMatch(
      /Constraints not satisfied|Please fill out this field\.?/,
    );
  });

  test('isValidated with blur event allows showing errors after user interaction', async () => {
    const input = ref<HTMLInputElement>();
    let field!: FieldState<any>;

    render({
      setup: () => {
        field = useFormField().state;
        useInputValidity({ inputEl: input, field, events: ['blur'] });

        // Computed that only shows errors after blur (isValidated)
        const displayError = computed(() => {
          return field.isValidated.value && field.isBlurred.value ? field.errorMessage.value : '';
        });

        return { input, displayError };
      },
      template: `
        <form>
          <input ref="input" data-testid="input" required />
          <span data-testid="err">{{ displayError }}</span>
        </form>
      `,
    });

    // Initially no error shown
    expect(((await page.getByTestId('err').element()) as HTMLElement).textContent).toBe('');

    // After blur, error should show
    ((await page.getByTestId('input').element()) as HTMLInputElement).dispatchEvent(
      new FocusEvent('blur', { bubbles: true }),
    );
    await flush();

    field.setBlurred(true);
    await flush();

    expect(field.isValidated.value).toBe(true);
    expect(field.isBlurred.value).toBe(true);
    expect(((await page.getByTestId('err').element()) as HTMLElement).textContent).toMatch(
      /Constraints not satisfied|Please fill out this field\.?/,
    );

    // Fill in value and blur again
    await page.getByTestId('input').fill('valid');
    ((await page.getByTestId('input').element()) as HTMLInputElement).dispatchEvent(
      new FocusEvent('blur', { bubbles: true }),
    );
    await flush();

    // Error should be gone
    expect(((await page.getByTestId('err').element()) as HTMLElement).textContent).toBe('');
  });
});
