import { ref } from 'vue';
import { useInputValidity } from './useInputValidity';
import { fireEvent, render, screen } from '@testing-library/vue';
import { useForm, useFormField } from '../form';

describe('with lone fields', () => {
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
});

describe('with form', () => {
  test('updates the form validity state', async () => {
    const input = ref<HTMLInputElement>();

    const Child = {
      setup: () => {
        const field = useFormField({ path: 'test' });
        useInputValidity({ inputRef: input, field });

        return { input, errorMessage: field.errorMessage };
      },
      template: `
        <input ref="input" data-testid="input" required />
        <span data-testid="err">{{ errorMessage }}</span>
      `,
    };

    await render({
      components: { Child },
      setup() {
        const { getError } = useForm();

        return { getError };
      },
      template: `
      <form>
        <Child />

        <span data-testid="form-err">{{ getError('test') }}</span>
      </form>
    `,
    });

    await fireEvent.blur(screen.getByTestId('input'));
    expect(screen.getByTestId('err').textContent).toBe('Constraints not satisfied');
    expect(screen.getByTestId('form-err').textContent).toBe('Constraints not satisfied');
  });
});
