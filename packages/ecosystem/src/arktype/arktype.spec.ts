import { type } from 'arktype';
import { useForm } from '@formwerk/core';
import { appRender } from '@test-utils/index';
import { h, nextTick } from 'vue';
import { page } from 'vitest/browser';
import { expect, describe, test, vi } from 'vitest';

test('Arktype schemas are supported', async () => {
  const handler = vi.fn();
  const schema = type({
    email: 'string.email',
    password: 'string >= 8',
  });

  appRender({
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
  });

  await page.getByRole('button', { name: 'Submit' }).click();
  await nextTick();

  await expect.element(page.getByTestId('form-err-1')).toHaveTextContent('email must be a string (was missing)');
  await expect.element(page.getByTestId('form-err-2')).toHaveTextContent('password must be at least length 8 (was 7)');
  expect(handler).not.toHaveBeenCalled();
});

// Arktype doesn't include defaults in the JSON Schema object, so we can't test them.
describe.skip('JSON Schema defaults', () => {
  test('extracts simple default values from arktype schema', async () => {
    const schema = type({
      name: 'string = "John"',
      age: 'number = 25',
      active: 'boolean = true',
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

  test('extracts nested object defaults from arktype schema', async () => {
    const schema = type({
      user: {
        name: 'string = "Jane"',
        address: {
          city: 'string = "NYC"',
          zip: 'string = "10001"',
        },
      },
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
    const schema = type({
      name: 'string = "Default Name"',
      email: 'string = "default@example.com"',
      settings: {
        theme: 'string = "dark"',
        notifications: 'boolean = true',
      },
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
    const schema = type({
      company: {
        name: 'string = "Acme Corp"',
        departments: {
          engineering: {
            lead: 'string = "Alice"',
            teamSize: 'number = 10',
          },
          sales: {
            lead: 'string = "Bob"',
            teamSize: 'number = 5',
          },
        },
      },
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

  test('works with no initialValues - schema defaults are used', async () => {
    const schema = type({
      firstName: 'string = "First"',
      lastName: 'string = "Last"',
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
    const schema = type({
      withDefault: 'string = "has default"',
      withoutDefault: 'string',
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
});
