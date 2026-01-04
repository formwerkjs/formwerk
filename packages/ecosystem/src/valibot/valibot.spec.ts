import * as v from 'valibot';
import { toStandardJsonSchema } from '@valibot/to-json-schema';
import { useForm } from '@formwerk/core';
import { appRender } from '@test-utils/index';
import { h, nextTick } from 'vue';
import { page } from 'vitest/browser';
import { expect, describe, test, vi } from 'vitest';

test('valibot schemas are supported', async () => {
  const handler = vi.fn();
  const schema = v.object({
    email: v.optional(v.pipe(v.string(), v.email())),
    password: v.pipe(v.string(), v.minLength(8)),
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
    .toHaveTextContent('Invalid key: Expected "password" but received undefined');
  expect(handler).not.toHaveBeenCalled();
});

test('collects multiple errors per field', async () => {
  const handler = vi.fn();
  const schema = v.object({
    test: v.pipe(v.string(), v.email(), v.minLength(8)),
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

  expect(handler).toHaveBeenCalledWith([
    'Invalid email: Received "123"',
    'Invalid length: Expected >=8 but received 3',
  ]);
});

describe('JSON Schema defaults', () => {
  test('extracts simple default values from valibot schema', async () => {
    const schema = toStandardJsonSchema(
      v.object({
        name: v.optional(v.string(), 'John'),
        age: v.optional(v.number(), 25),
        active: v.optional(v.boolean(), true),
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

  test('extracts nested object defaults from valibot schema', async () => {
    const schema = toStandardJsonSchema(
      v.object({
        user: v.object({
          name: v.optional(v.string(), 'Jane'),
          address: v.object({
            city: v.optional(v.string(), 'NYC'),
            zip: v.optional(v.string(), '10001'),
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
    const schema = toStandardJsonSchema(
      v.object({
        name: v.optional(v.string(), 'Default Name'),
        email: v.optional(v.string(), 'default@example.com'),
        settings: v.object({
          theme: v.optional(v.string(), 'dark'),
          notifications: v.optional(v.boolean(), true),
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
    const schema = toStandardJsonSchema(
      v.object({
        company: v.object({
          name: v.optional(v.string(), 'Acme Corp'),
          departments: v.object({
            engineering: v.object({
              lead: v.optional(v.string(), 'Alice'),
              teamSize: v.optional(v.number(), 10),
            }),
            sales: v.object({
              lead: v.optional(v.string(), 'Bob'),
              teamSize: v.optional(v.number(), 5),
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
    const schema = toStandardJsonSchema(
      v.object({
        tags: v.optional(v.array(v.string()), ['tag1', 'tag2']),
        config: v.object({
          features: v.optional(v.array(v.string()), ['feature1']),
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
    const schema = toStandardJsonSchema(
      v.object({
        tags: v.optional(v.array(v.string()), ['default1', 'default2']),
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
    const schema = toStandardJsonSchema(
      v.object({
        firstName: v.optional(v.string(), 'First'),
        lastName: v.optional(v.string(), 'Last'),
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
    const schema = toStandardJsonSchema(
      v.object({
        withDefault: v.optional(v.string(), 'has default'),
        withoutDefault: v.string(),
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
