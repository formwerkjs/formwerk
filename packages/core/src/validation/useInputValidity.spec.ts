import { computed, ref } from 'vue';
import { useInputValidity } from './useInputValidity';
import { FieldState, useFormField } from '../useFormField';
import { EventExpression } from '../helpers/useEventListener';
import { page, userEvent } from 'vitest/browser';
import { expect } from 'vitest';
import { appRender } from '@test-utils/index';

test('updates the validity state on blur events', async () => {
  const input = ref<HTMLInputElement>();

  appRender({
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

  await page.getByTestId('input').click();
  await userEvent.tab();

  await expect
    .element(page.getByTestId('err'))
    .toHaveTextContent(/Constraints not satisfied|Please fill out this field\.?/);
});

test('updates the validity state on change events', async () => {
  const input = ref<HTMLInputElement>();

  appRender({
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

  // Focus and blur triggers change event validation
  await page.getByTestId('input').click();
  await userEvent.tab();
  await expect
    .element(page.getByTestId('err'))
    .toHaveTextContent(/Constraints not satisfied|Please fill out this field\.?/);

  await page.getByTestId('input').fill('test');
  await userEvent.tab();
  await expect.element(page.getByTestId('err')).toHaveTextContent('');
});

test('updates the validity on specified events', async () => {
  const input = ref<HTMLInputElement>();

  appRender({
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
  await expect
    .element(page.getByTestId('err'))
    .toHaveTextContent(/Constraints not satisfied|Please fill out this field\.?/);

  inputEl.value = 'test';
  inputEl.dispatchEvent(new Event('input', { bubbles: true }));
  await expect.element(page.getByTestId('err')).toHaveTextContent('');
});

test('updates the input native validity with custom validity errors', async () => {
  const input = ref<HTMLInputElement>();
  let field!: FieldState<any>;
  appRender({
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

  await expect.element(page.getByTestId('err')).toHaveTextContent('');
  field.setErrors('Custom error');
  await expect.element(page.getByTestId('err')).toHaveTextContent('Custom error');
});

test('events can be reactive', async () => {
  const input = ref<HTMLInputElement>();
  const events = ref<EventExpression[]>(['test']);

  appRender({
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

  await page.getByTestId('input').click();
  await userEvent.tab();
  // mounted validation
  await expect
    .element(page.getByTestId('err'))
    .toHaveTextContent(/Constraints not satisfied|Please fill out this field\.?/);
  events.value = ['blur'];
  await page.getByTestId('input').fill('12');
  await expect
    .element(page.getByTestId('err'))
    .toHaveTextContent(/Constraints not satisfied|Please fill out this field\.?/);
  await userEvent.tab();
  await expect.element(page.getByTestId('err')).toHaveTextContent('');
});

describe('isValidated tracking', () => {
  test('does not flash error on blur when field becomes valid (issue #203)', async () => {
    const input = ref<HTMLInputElement>();
    let field!: FieldState<any>;

    appRender({
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
    await expect.element(page.getByTestId('display-err')).toHaveTextContent('');

    // Raw error should exist after mount validation
    await expect
      .element(page.getByTestId('raw-err'))
      .toHaveTextContent(/Constraints not satisfied|Please fill out this field\.?/);

    // isValidated should still be false after mount (not user interaction)
    expect(field.isValidated.value).toBe(false);

    // User types a valid value
    await page.getByTestId('input').fill('valid value');

    // Focus the field and then blur it
    await page.getByTestId('input').click();
    field.setBlurred(true);
    await userEvent.tab();

    // Key assertion: NO error should flash because the field is now valid
    // Validation runs synchronously with real browser events
    await expect.element(page.getByTestId('display-err')).toHaveTextContent('');
    await expect.element(page.getByTestId('raw-err')).toHaveTextContent('');

    // Now isValidated should be true (user interaction)
    expect(field.isValidated.value).toBe(true);
  });

  test('isValidated remains false after mount validation', async () => {
    const input = ref<HTMLInputElement>();
    let field!: FieldState<any>;

    appRender({
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
    await expect.element(page.getByTestId('validated')).toHaveTextContent('false');
    expect(field.isValidated.value).toBe(false);
  });

  test('isValidated becomes true after blur event triggers validation', async () => {
    const input = ref<HTMLInputElement>();
    let field!: FieldState<any>;

    appRender({
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
    await page.getByTestId('input').click();
    await userEvent.tab();
    await expect.element(page.getByTestId('validated')).toHaveTextContent('true');

    // Now isValidated should be true
    expect(field.isValidated.value).toBe(true);
  });

  test('isValidated is set to true after change event triggers validation', async () => {
    const input = ref<HTMLInputElement>();
    let field!: FieldState<any>;

    appRender({
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
    await expect.poll(() => field.isValidated.value).toBe(false);

    // User triggers change event (user interaction)
    await page.getByTestId('input').fill('test');
    await userEvent.tab();
    await expect.poll(() => field.isValidated.value).toBe(true);

    // Can be manually reset
    field.setIsValidated(false);
    await expect.poll(() => field.isValidated.value).toBe(false);

    // And set again by user interaction
    await page.getByTestId('input').fill('test2');
    await userEvent.tab();
    await expect.poll(() => field.isValidated.value).toBe(true);
  });

  test('isValidated helps prevent displaying initial validation errors', async () => {
    const input = ref<HTMLInputElement>();
    let field!: FieldState<any>;

    appRender({
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

    // Raw error exists
    await expect
      .element(page.getByTestId('raw-err'))
      .toHaveTextContent(/Constraints not satisfied|Please fill out this field\.?/);

    // But displayError should NOT show because isValidated is still false (mount is not user interaction)
    await expect.element(page.getByTestId('err')).toHaveTextContent('');
    await expect.poll(() => field.isValidated.value).toBe(false);

    // User interaction (blur) sets isValidated to true (field is still empty/invalid)
    await page.getByTestId('input').click();
    await userEvent.tab();
    await expect
      .element(page.getByTestId('err'))
      .toHaveTextContent(/Constraints not satisfied|Please fill out this field\.?/);

    // Now errors should show because isValidated is true
    await expect.poll(() => field.isValidated.value).toBe(true);
    await expect
      .element(page.getByTestId('err'))
      .toHaveTextContent(/Constraints not satisfied|Please fill out this field\.?/);
  });

  test('isValidated with blur event allows showing errors after user interaction', async () => {
    const input = ref<HTMLInputElement>();
    let field!: FieldState<any>;

    appRender({
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
    await expect.element(page.getByTestId('err')).toHaveTextContent('');

    // After blur on empty required field, error should show
    await page.getByTestId('input').click();
    await userEvent.tab();

    // Manually set blurred state (in real usage, this would be done by the field's blur handler)
    field.setBlurred(true);

    // The displayError computed requires both isValidated AND isBlurred to be true
    await expect.poll(() => field.isValidated.value).toBe(true);
    await expect.poll(() => field.isBlurred.value).toBe(true);
    await expect
      .element(page.getByTestId('err'))
      .toHaveTextContent(/Constraints not satisfied|Please fill out this field\.?/);

    // Fill in value and blur again - error should be gone
    await page.getByTestId('input').fill('valid');
    await userEvent.tab();
    await expect.element(page.getByTestId('err')).toHaveTextContent('');
  });
});
