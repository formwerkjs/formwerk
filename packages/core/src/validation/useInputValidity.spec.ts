import { nextTick, ref } from 'vue';
import { useInputValidity } from './useInputValidity';
import { fireEvent, render, screen } from '@testing-library/vue';
import { FormField, useFormField } from '../useFormField';

test('updates the validity state on blur events', async () => {
  const input = ref<HTMLInputElement>();

  await render({
    setup: () => {
      const field = useFormField();
      useInputValidity({ inputRef: input, field });

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
      const field = useFormField();
      useInputValidity({ inputRef: input, field });

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
      const field = useFormField();
      useInputValidity({ inputRef: input, field, events: ['input'] });

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
  let field!: FormField<any>;
  await render({
    setup: () => {
      field = useFormField();
      useInputValidity({ inputRef: input, field, events: ['input'] });

      return { input, errorMessage: field.errorMessage };
    },
    template: `
      <form>
        <input ref="input" data-testid="input" />
        <span data-testid="err">{{ errorMessage }}</span>
      </form>
    `,
  });

  field.setErrors('Custom error');
  await nextTick();
  expect(screen.getByTestId('err').textContent).toBe('Custom error');
  expect(input.value?.validationMessage).toBe('Custom error');
});
