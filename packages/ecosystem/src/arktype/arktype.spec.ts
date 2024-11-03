import { type } from 'arktype';
import { fireEvent, render, screen } from '@testing-library/vue';
import { useForm } from '@formwerk/core';
import { flush } from '@test-utils/index';

test('Arktype schemas are supported', async () => {
  const handler = vi.fn();
  const schema = type({
    email: 'string.email',
    password: 'string >= 8',
  });

  await render({
    setup() {
      const { handleSubmit, getError } = useForm({
        schema,
        initialValues: {
          password: '1234567',
        },
      });

      // values.email;

      // values.password;

      return {
        getError,
        onSubmit: handleSubmit(v => {
          handler(v.toJSON());
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
  expect(screen.getByTestId('form-err-1').textContent).toBe('email must be a string (was missing)');
  expect(screen.getByTestId('form-err-2').textContent).toBe('password must be at least length 8 (was 7)');
  expect(handler).not.toHaveBeenCalled();
});
