import { type } from 'arktype';
import { fireEvent, render, screen } from '@testing-library/vue';
import { useForm } from '@formwerk/core';
import { flush } from '@test-utils/index';

test('Arktype schemas are supported', async () => {
  const handler = vi.fn();
  const schema = type({
    test: 'boolean',
  });

  await render({
    setup() {
      const { handleSubmit, getError } = useForm({
        schema,
      });

      return {
        getError,
        onSubmit: handleSubmit(v => {
          handler(v.toJSON());
        }),
      };
    },
    template: `
      <form @submit="onSubmit" novalidate>
        <span data-testid="form-err">{{ getError('test') }}</span>

        <button type="submit">Submit</button>
      </form>
    `,
  });

  await fireEvent.click(screen.getByText('Submit'));
  await flush();
  expect(screen.getByTestId('form-err').textContent).toBe('test must be boolean (was missing)');
  expect(handler).not.toHaveBeenCalled();
});
