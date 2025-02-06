import { fireEvent, render, screen } from '@testing-library/vue';
import * as v from 'valibot';
import { useForm } from '@formwerk/core';
import { flush } from '@test-utils/index';

test('valibot schemas are supported', async () => {
  const handler = vi.fn();
  const schema = v.object({
    email: v.optional(v.pipe(v.string(), v.email())),
    password: v.pipe(v.string(), v.minLength(8)),
  });

  await render({
    setup() {
      const { handleSubmit, getError, values } = useForm({
        schema,
      });

      // eslint-disable-next-line @typescript-eslint/no-unused-expressions
      values.email;

      // values.password.charAt;

      return {
        getError,
        onSubmit: handleSubmit(v => {
          handler(v.toObject());
        }),
      };
    },
    template: `
      <form @submit="onSubmit" novalidate>
        <span data-testid="form-err-1">{{ getError('email') }}</span>
        <span data-testid="form-err-2">{{ getError('password') }}</span>

        <button type="submit">Submit</button>
      </form>
    `,
  });

  await fireEvent.click(screen.getByText('Submit'));
  await flush();
  expect(screen.getByTestId('form-err-1').textContent).toBe('');
  expect(screen.getByTestId('form-err-2').textContent).toBe('Invalid key: Expected "password" but received undefined');
  expect(handler).not.toHaveBeenCalled();
});

test('collects multiple errors per field', async () => {
  const handler = vi.fn();
  const schema = v.object({
    test: v.pipe(v.string(), v.email(), v.minLength(8)),
  });

  await render({
    setup() {
      const { getErrors, validate } = useForm({
        schema,
        initialValues: {
          test: '123',
        },
      });

      return {
        onSubmit: async () => {
          await validate();

          handler(getErrors());
        },
      };
    },
    template: `
      <form @submit="onSubmit" novalidate>
        <button type="submit">Submit</button>
      </form>
    `,
  });

  await fireEvent.click(screen.getByText('Submit'));
  await flush();
  expect(handler).toHaveBeenCalledWith([
    'Invalid email: Received "123"',
    'Invalid length: Expected >=8 but received 3',
  ]);
});
