import { computed, ref } from 'vue';
import { useInputValidity } from './useInputValidity';
import { fireEvent, render, screen } from '@testing-library/vue';
import { FieldState, useFormField } from '../useFormField';
import { EventExpression } from '../helpers/useEventListener';
import { flush } from '../../../test-utils/src';

test('updates the validity state on blur events', async () => {
  const input = ref<HTMLInputElement>();

  await render({
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

  await fireEvent.blur(screen.getByTestId('input'));
  expect(screen.getByTestId('err').textContent).toBe('Constraints not satisfied');
});

test('updates the validity state on change events', async () => {
  const input = ref<HTMLInputElement>();

  await render({
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

  await fireEvent.change(screen.getByTestId('input'));
  expect(screen.getByTestId('err').textContent).toBe('Constraints not satisfied');
  await fireEvent.change(screen.getByTestId('input'), { target: { value: 'test' } });
  expect(screen.getByTestId('err').textContent).toBe('');
});

test('updates the validity on specified events', async () => {
  const input = ref<HTMLInputElement>();

  await render({
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

  await fireEvent.input(screen.getByTestId('input'));
  expect(screen.getByTestId('err').textContent).toBe('Constraints not satisfied');
  await fireEvent.input(screen.getByTestId('input'), { target: { value: 'test' } });
  expect(screen.getByTestId('err').textContent).toBe('');
});

test('updates the input native validity with custom validity errors', async () => {
  const input = ref<HTMLInputElement>();
  let field!: FieldState<any>;
  await render({
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
  expect(screen.getByTestId('err').textContent).toBe('Custom error');
  expect(input.value?.validationMessage).toBe('Custom error');
});

test('events can be reactive', async () => {
  const input = ref<HTMLInputElement>();
  const events = ref<EventExpression[]>(['test']);

  await render({
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

  await fireEvent.blur(screen.getByTestId('input'));
  // mounted validation
  expect(screen.getByTestId('err').textContent).toBe('Constraints not satisfied');
  events.value = ['blur'];
  await fireEvent.update(screen.getByTestId('input'), '12');
  expect(screen.getByTestId('err').textContent).toBe('Constraints not satisfied');
  await fireEvent.blur(screen.getByTestId('input'));
  expect(screen.getByTestId('err').textContent).toBe('');
});

describe('isValidated tracking', () => {
  test('does not flash error on blur when field becomes valid (issue #203)', async () => {
    const input = ref<HTMLInputElement>();
    let field!: FieldState<any>;

    await render({
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
    expect(screen.getByTestId('display-err').textContent).toBe('');

    // Raw error should exist after mount validation
    await flush();
    expect(screen.getByTestId('raw-err').textContent).toBe('Constraints not satisfied');

    // isValidated should still be false after mount (not user interaction)
    expect(field.isValidated.value).toBe(false);

    // User types a valid value
    await fireEvent.update(screen.getByTestId('input'), 'valid value');

    // Focus the field and then blur it
    await fireEvent.focus(screen.getByTestId('input'));
    field.setBlurred(true);
    await fireEvent.blur(screen.getByTestId('input'));
    await flush();

    // Now isValidated should be true (user interaction)
    expect(field.isValidated.value).toBe(true);

    // Key assertion: NO error should flash because the field is now valid
    // If there was a bug, we'd see the stale error flash before async validation completes
    expect(screen.getByTestId('display-err').textContent).toBe('');
    expect(screen.getByTestId('raw-err').textContent).toBe('');
  });

  test('isValidated remains false after mount validation', async () => {
    const input = ref<HTMLInputElement>();
    let field!: FieldState<any>;

    await render({
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
    expect(screen.getByTestId('validated').textContent).toBe('false');
    expect(field.isValidated.value).toBe(false);
  });

  test('isValidated becomes true after blur event triggers validation', async () => {
    const input = ref<HTMLInputElement>();
    let field!: FieldState<any>;

    await render({
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
    await fireEvent.blur(screen.getByTestId('input'));
    await flush();

    // Now isValidated should be true
    expect(field.isValidated.value).toBe(true);
    expect(screen.getByTestId('validated').textContent).toBe('true');
  });

  test('isValidated is set to true after change event triggers validation', async () => {
    const input = ref<HTMLInputElement>();
    let field!: FieldState<any>;

    await render({
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
    await fireEvent.change(screen.getByTestId('input'), { target: { value: 'test' } });
    await flush();
    expect(field.isValidated.value).toBe(true);

    // Can be manually reset
    field.setIsValidated(false);
    expect(field.isValidated.value).toBe(false);

    // And set again by user interaction
    await fireEvent.change(screen.getByTestId('input'), { target: { value: 'test2' } });
    await flush();
    expect(field.isValidated.value).toBe(true);
  });

  test('isValidated helps prevent displaying initial validation errors', async () => {
    const input = ref<HTMLInputElement>();
    let field!: FieldState<any>;

    await render({
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
    expect(screen.getByTestId('raw-err').textContent).toBe('Constraints not satisfied');

    // But displayError should NOT show because isValidated is still false (mount is not user interaction)
    expect(screen.getByTestId('err').textContent).toBe('');
    expect(field.isValidated.value).toBe(false);

    // User interaction (blur) sets isValidated to true (field is still empty/invalid)
    await fireEvent.blur(screen.getByTestId('input'));
    await flush();

    // Now errors should show because isValidated is true
    expect(field.isValidated.value).toBe(true);
    expect(screen.getByTestId('err').textContent).toBe('Constraints not satisfied');
  });

  test('isValidated with blur event allows showing errors after user interaction', async () => {
    const input = ref<HTMLInputElement>();
    let field!: FieldState<any>;

    await render({
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
    expect(screen.getByTestId('err').textContent).toBe('');

    // After blur, error should show
    await fireEvent.blur(screen.getByTestId('input'));
    await flush();

    field.setBlurred(true);
    await flush();

    expect(field.isValidated.value).toBe(true);
    expect(field.isBlurred.value).toBe(true);
    expect(screen.getByTestId('err').textContent).toBe('Constraints not satisfied');

    // Fill in value and blur again
    await fireEvent.update(screen.getByTestId('input'), 'valid');
    await fireEvent.blur(screen.getByTestId('input'));
    await flush();

    // Error should be gone
    expect(screen.getByTestId('err').textContent).toBe('');
  });
});
