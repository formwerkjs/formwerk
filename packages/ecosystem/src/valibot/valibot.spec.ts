import * as v from 'valibot';
import { useForm } from '@formwerk/core';
import { defineComponent, h, nextTick } from 'vue';
import { createApp } from 'vue';
import { page } from 'vitest/browser';
import { expect } from 'vitest';

function mount(component: any) {
  const root = document.createElement('div');
  root.setAttribute('data-testid', 'root');
  document.body.appendChild(root);
  const app = createApp(component);
  app.mount(root);
  return () => {
    app.unmount();
    root.remove();
  };
}

test('valibot schemas are supported', async () => {
  const handler = vi.fn();
  const schema = v.object({
    email: v.optional(v.pipe(v.string(), v.email())),
    password: v.pipe(v.string(), v.minLength(8)),
  });

  const unmount = mount(
    defineComponent({
      setup() {
        const { handleSubmit, getError, values } = useForm({
          schema,
        });

        // eslint-disable-next-line @typescript-eslint/no-unused-expressions
        values.email;

        const onSubmit = handleSubmit(v => {
          handler(v.toObject());
        });

        return () =>
          h(
            'form',
            {
              novalidate: true,
              onSubmit: (e: Event) => {
                e.preventDefault();
                return onSubmit(e as any);
              },
            },
            [
              h('span', { 'data-testid': 'form-err-1' }, getError('email')),
              h('span', { 'data-testid': 'form-err-2' }, getError('password')),
              h('button', { type: 'submit' }, 'Submit'),
            ],
          );
      },
    }),
  );

  try {
    await page.getByRole('button', { name: 'Submit' }).click();
    await nextTick();

    await expect.element(page.getByTestId('form-err-1')).toHaveTextContent('');
    await expect
      .element(page.getByTestId('form-err-2'))
      .toHaveTextContent('Invalid key: Expected "password" but received undefined');
    expect(handler).not.toHaveBeenCalled();
  } finally {
    unmount();
  }
});

test('collects multiple errors per field', async () => {
  const handler = vi.fn();
  const schema = v.object({
    test: v.pipe(v.string(), v.email(), v.minLength(8)),
  });

  const unmount = mount(
    defineComponent({
      setup() {
        const { getErrors, validate } = useForm({
          schema,
          initialValues: {
            test: '123',
          },
        });

        const onSubmit = async () => {
          await validate();
          handler(getErrors());
        };

        return () =>
          h(
            'form',
            {
              novalidate: true,
              onSubmit: async (e: Event) => {
                e.preventDefault();
                await onSubmit();
              },
            },
            [h('button', { type: 'submit' }, 'Submit')],
          );
      },
    }),
  );

  try {
    await page.getByRole('button', { name: 'Submit' }).click();
    await nextTick();

    expect(handler).toHaveBeenCalledWith([
      'Invalid email: Received "123"',
      'Invalid length: Expected >=8 but received 3',
    ]);
  } finally {
    unmount();
  }
});
