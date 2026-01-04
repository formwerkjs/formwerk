import * as zm from 'zod/mini';
import { useForm } from '@formwerk/core';
import { appRender } from '@test-utils/index';
import { h, nextTick } from 'vue';
import { page } from 'vitest/browser';
import { expect, describe, test, vi } from 'vitest';

test('zod/mini schemas are supported', async () => {
  const handler = vi.fn();
  const schema = zm.object({
    email: zm.nullable(zm.optional(zm.email())),
    password: zm.string().check(zm.minLength(8)),
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
  // zod/mini uses simpler error messages
  await expect.element(page.getByTestId('form-err-2')).toHaveTextContent('Invalid input');
  expect(handler).not.toHaveBeenCalled();
});

test('collects multiple errors per field', async () => {
  const handler = vi.fn();
  const schema = zm.object({
    test: zm.email().check(zm.minLength(8)),
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

  // zod/mini uses simpler error messages
  expect(handler).toHaveBeenCalledWith(['Invalid input', 'Invalid input']);
});

// Zod Mini does not support object schema representations, so we can't test them.
describe('JSON Schema defaults', () => {
  test('extracts simple default values from zod/mini schema', async () => {
    const schema = zm.toJSONSchema(
      zm.object({
        name: zm._default(zm.string(), 'John'),
        age: zm._default(zm.number(), 25),
        active: zm._default(zm.boolean(), true),
      }),
    );

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

  test('extracts nested object defaults from zod/mini schema', async () => {
    const schema = zm.toJSONSchema(
      zm.object({
        user: zm.object({
          name: zm._default(zm.string(), 'Jane'),
          address: zm.object({
            city: zm._default(zm.string(), 'NYC'),
            zip: zm._default(zm.string(), '10001'),
          }),
        }),
      }),
    );

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
    const schema = zm.toJSONSchema(
      zm.object({
        name: zm._default(zm.string(), 'Default Name'),
        email: zm._default(zm.string(), 'default@example.com'),
        settings: zm.object({
          theme: zm._default(zm.string(), 'dark'),
          notifications: zm._default(zm.boolean(), true),
        }),
      }),
    );

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
    const schema = zm.toJSONSchema(
      zm.object({
        company: zm.object({
          name: zm._default(zm.string(), 'Acme Corp'),
          departments: zm.object({
            engineering: zm.object({
              lead: zm._default(zm.string(), 'Alice'),
              teamSize: zm._default(zm.number(), 10),
            }),
            sales: zm.object({
              lead: zm._default(zm.string(), 'Bob'),
              teamSize: zm._default(zm.number(), 5),
            }),
          }),
        }),
      }),
    );

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
    const schema = zm.toJSONSchema(
      zm.object({
        tags: zm._default(zm.array(zm.string()), ['tag1', 'tag2']),
        config: zm.object({
          features: zm._default(zm.array(zm.string()), ['feature1']),
        }),
      }),
    );

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
    const schema = zm.toJSONSchema(
      zm.object({
        tags: zm._default(zm.array(zm.string()), ['default1', 'default2']),
      }),
    );

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
    const schema = zm.toJSONSchema(
      zm.object({
        firstName: zm._default(zm.string(), 'First'),
        lastName: zm._default(zm.string(), 'Last'),
      }),
    );

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
    const schema = zm.toJSONSchema(
      zm.object({
        withDefault: zm._default(zm.string(), 'has default'),
        withoutDefault: zm.string(),
      }),
    );

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
});
