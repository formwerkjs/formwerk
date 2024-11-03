import { fireEvent, render, screen } from '@testing-library/vue';
import * as v from 'valibot';
import { useForm } from '@formwerk/core';
import { flush } from '@test-utils/index';

test('valibot schemas are supported', async () => {
  const handler = vi.fn();
  const schema = v.object({
    test: v.boolean('not a boolean'),
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
  expect(screen.getByTestId('form-err').textContent).toBe('not a boolean');
  expect(handler).not.toHaveBeenCalled();
});
