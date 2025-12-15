import { type } from 'arktype';
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

test('Arktype schemas are supported', async () => {
  const handler = vi.fn();
  const schema = type({
    email: 'string.email',
    password: 'string >= 8',
  });

  const unmount = mount(
    defineComponent({
      setup() {
        const { handleSubmit, getError } = useForm({
          schema,
          initialValues: {
            password: '1234567',
          },
        });

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

    await expect.element(page.getByTestId('form-err-1')).toHaveTextContent('email must be a string (was missing)');
    await expect
      .element(page.getByTestId('form-err-2'))
      .toHaveTextContent('password must be at least length 8 (was 7)');
    expect(handler).not.toHaveBeenCalled();
  } finally {
    unmount();
  }
});
