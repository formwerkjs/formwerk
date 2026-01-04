import { z } from 'zod';
import { useForm } from '@formwerk/core';
import { appRender } from '@test-utils/index';
import { h, nextTick } from 'vue';
import { page } from 'vitest/browser';
import { expect, describe, test, vi } from 'vitest';

test('zod schemas are supported', async () => {
  const handler = vi.fn();
  const schema = z.object({
    email: z.string().email().optional().nullable(),
    password: z.string().min(8),
  });

  appRender({
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
  });

  await page.getByRole('button', { name: 'Submit' }).click();
  await nextTick();

  await expect.element(page.getByTestId('form-err-1')).toHaveTextContent('');
  await expect
    .element(page.getByTestId('form-err-2'))
    .toHaveTextContent('Invalid input: expected string, received undefined');
  expect(handler).not.toHaveBeenCalled();
});

test('collects multiple errors per field', async () => {
  const handler = vi.fn();
  const schema = z.object({
    test: z.email().min(8),
  });

  appRender({
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
  });

  await page.getByRole('button', { name: 'Submit' }).click();
  await nextTick();

  expect(handler).toHaveBeenCalledWith(['Invalid email address', 'Too small: expected string to have >=8 characters']);
});

describe('JSON Schema defaults', () => {
  test('extracts simple default values from zod schema', async () => {
    const schema = z.object({
      name: z.string().default('John'),
      age: z.number().default(25),
      active: z.boolean().default(true),
    });

    appRender({
      setup() {
        const { values } = useForm({
          schema,
        });

        return () => h('div', { 'data-testid': 'values' }, JSON.stringify(values));
      },
    });

    await nextTick();
    const valuesEl = await page.getByTestId('values').element();
    const values = JSON.parse(valuesEl.textContent || '{}');

    expect(values).toEqual({
      name: 'John',
      age: 25,
      active: true,
    });
  });

  test('extracts nested object defaults from zod schema', async () => {
    const schema = z.object({
      user: z.object({
        name: z.string().default('Jane'),
        address: z.object({
          city: z.string().default('NYC'),
          zip: z.string().default('10001'),
        }),
      }),
    });

    appRender({
      setup() {
        const { values } = useForm({
          schema,
        });

        return () => h('div', { 'data-testid': 'values' }, JSON.stringify(values));
      },
    });

    await nextTick();
    const valuesEl = await page.getByTestId('values').element();
    const values = JSON.parse(valuesEl.textContent || '{}');

    expect(values).toEqual({
      user: {
        name: 'Jane',
        address: {
          city: 'NYC',
          zip: '10001',
        },
      },
    });
  });

  test('merges provided initialValues with schema defaults', async () => {
    const schema = z.object({
      name: z.string().default('Default Name'),
      email: z.string().default('default@example.com'),
      settings: z.object({
        theme: z.string().default('dark'),
        notifications: z.boolean().default(true),
      }),
    });

    appRender({
      setup() {
        const { values } = useForm({
          schema,
          initialValues: {
            name: 'Custom Name',
            settings: {
              theme: 'light',
            },
          },
        });

        return () => h('div', { 'data-testid': 'values' }, JSON.stringify(values));
      },
    });

    await nextTick();
    const valuesEl = await page.getByTestId('values').element();
    const values = JSON.parse(valuesEl.textContent || '{}');

    // Provided values should take precedence, schema defaults fill the gaps
    expect(values).toEqual({
      name: 'Custom Name',
      email: 'default@example.com',
      settings: {
        theme: 'light',
        notifications: true,
      },
    });
  });

  test('handles deeply nested objects with mixed defaults and provided values', async () => {
    const schema = z.object({
      company: z.object({
        name: z.string().default('Acme Corp'),
        departments: z.object({
          engineering: z.object({
            lead: z.string().default('Alice'),
            teamSize: z.number().default(10),
          }),
          sales: z.object({
            lead: z.string().default('Bob'),
            teamSize: z.number().default(5),
          }),
        }),
      }),
    });

    appRender({
      setup() {
        const { values } = useForm({
          schema,
          initialValues: {
            company: {
              departments: {
                engineering: {
                  lead: 'Charlie',
                },
              },
            },
          },
        });

        return () => h('div', { 'data-testid': 'values' }, JSON.stringify(values));
      },
    });

    await nextTick();
    const valuesEl = await page.getByTestId('values').element();
    const values = JSON.parse(valuesEl.textContent || '{}');

    expect(values).toEqual({
      company: {
        name: 'Acme Corp',
        departments: {
          engineering: {
            lead: 'Charlie', // Overridden
            teamSize: 10, // Default
          },
          sales: {
            lead: 'Bob', // Default
            teamSize: 5, // Default
          },
        },
      },
    });
  });

  test('handles array defaults in schema', async () => {
    const schema = z.object({
      tags: z.array(z.string()).default(['tag1', 'tag2']),
      config: z.object({
        features: z.array(z.string()).default(['feature1']),
      }),
    });

    appRender({
      setup() {
        const { values } = useForm({
          schema,
        });

        return () => h('div', { 'data-testid': 'values' }, JSON.stringify(values));
      },
    });

    await nextTick();
    const valuesEl = await page.getByTestId('values').element();
    const values = JSON.parse(valuesEl.textContent || '{}');

    expect(values).toEqual({
      tags: ['tag1', 'tag2'],
      config: {
        features: ['feature1'],
      },
    });
  });

  test('provided array values override schema defaults completely', async () => {
    const schema = z.object({
      tags: z.array(z.string()).default(['default1', 'default2']),
    });

    appRender({
      setup() {
        const { values } = useForm({
          schema,
          initialValues: {
            tags: ['custom1'],
          },
        });

        return () => h('div', { 'data-testid': 'values' }, JSON.stringify(values));
      },
    });

    await nextTick();
    const valuesEl = await page.getByTestId('values').element();
    const values = JSON.parse(valuesEl.textContent || '{}');

    // Arrays should be replaced entirely, not merged
    expect(values).toEqual({
      tags: ['custom1'],
    });
  });

  test('works with no initialValues - schema defaults are used', async () => {
    const schema = z.object({
      firstName: z.string().default('First'),
      lastName: z.string().default('Last'),
    });

    appRender({
      setup() {
        const { values } = useForm({
          schema,
        });

        return () => h('div', { 'data-testid': 'values' }, JSON.stringify(values));
      },
    });

    await nextTick();
    const valuesEl = await page.getByTestId('values').element();
    const values = JSON.parse(valuesEl.textContent || '{}');

    expect(values).toEqual({
      firstName: 'First',
      lastName: 'Last',
    });
  });

  test('fields without defaults remain undefined when not provided', async () => {
    const schema = z.object({
      withDefault: z.string().default('has default'),
      withoutDefault: z.string(),
    });

    appRender({
      setup() {
        const { values } = useForm({
          schema,
        });

        return () =>
          h('div', [
            h('span', { 'data-testid': 'with-default' }, values.withDefault ?? 'UNDEFINED'),
            h('span', { 'data-testid': 'without-default' }, values.withoutDefault ?? 'UNDEFINED'),
          ]);
      },
    });

    await nextTick();

    await expect.element(page.getByTestId('with-default')).toHaveTextContent('has default');
    await expect.element(page.getByTestId('without-default')).toHaveTextContent('UNDEFINED');
  });

  test('validates and shows errors with JSON schema', async () => {
    const handler = vi.fn();
    const schema = z.toJSONSchema(
      z.object({
        email: z.email(),
        password: z.string().min(8),
      }),
    );

    appRender({
      setup() {
        const { handleSubmit, getError } = useForm({
          schema,
          initialValues: {
            email: 'invalid-email',
            password: 'short',
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
              h('span', { 'data-testid': 'email-err' }, getError('email')),
              h('span', { 'data-testid': 'password-err' }, getError('password')),
              h('button', { type: 'submit' }, 'Submit'),
            ],
          );
      },
    });

    await page.getByRole('button', { name: 'Submit' }).click();
    await nextTick();

    await expect.element(page.getByTestId('email-err')).toHaveTextContent('Invalid email address');
    await expect
      .element(page.getByTestId('password-err'))
      .toHaveTextContent('Too small: expected string to have >=8 characters');
    expect(handler).not.toHaveBeenCalled();
  });
});
