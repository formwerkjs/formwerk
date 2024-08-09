import { type Component, nextTick } from 'vue';
import { fireEvent, render, screen } from '@testing-library/vue';
import { useForm, useTextField } from '@formwerk/core';
import { defineSchema } from '.';
import * as y from 'yup';
import flush from 'flush-promises';

const requiredMessage = (field: string) => `${field} is a required field`;

describe('schema-yup', () => {
  function createInputComponent(): Component {
    return {
      inheritAttrs: false,
      setup: (_, { attrs }) => {
        const name = (attrs.name || 'test') as string;
        const { errorMessage, inputProps } = useTextField({ name, label: name });

        return { errorMessage: errorMessage, inputProps, name };
      },
      template: `
        <input v-bind="inputProps" :data-testid="name" />
        <span data-testid="err">{{ errorMessage }}</span>
      `,
    };
  }

  test('validates initially with yup schema', async () => {
    await render({
      components: { Child: createInputComponent() },
      setup() {
        const { getError, isValid } = useForm({
          schema: defineSchema(
            y.object({
              test: y.string().required(),
            }),
          ),
        });

        return { getError, isValid };
      },
      template: `
      <form>
        <Child />

        <span data-testid="form-err">{{ getError('test') }}</span>
        <span data-testid="form-valid">{{ isValid }}</span>
      </form>
    `,
    });

    await flush();
    expect(screen.getByTestId('form-valid').textContent).toBe('false');
    expect(screen.getByTestId('err').textContent).toBe(requiredMessage('test'));
    expect(screen.getByTestId('form-err').textContent).toBe(requiredMessage('test'));
  });

  test('prevents submission if the form is not valid', async () => {
    const handler = vi.fn();

    await render({
      components: { Child: createInputComponent() },
      setup() {
        const { handleSubmit } = useForm({
          schema: defineSchema(
            y.object({
              test: y.string().required(),
            }),
          ),
        });

        return { onSubmit: handleSubmit(handler) };
      },
      template: `
      <form @submit="onSubmit" novalidate>
        <Child />

        <button type="submit">Submit</button>
      </form>
    `,
    });

    await nextTick();
    await fireEvent.click(screen.getByText('Submit'));
    expect(handler).not.toHaveBeenCalled();
    await fireEvent.update(screen.getByTestId('test'), 'test');
    await fireEvent.click(screen.getByText('Submit'));
    await flush();
    expect(handler).toHaveBeenCalledOnce();
  });

  test('supports transformations', async () => {
    const handler = vi.fn();

    await render({
      components: { Child: createInputComponent() },
      setup() {
        const { handleSubmit, getError } = useForm({
          schema: defineSchema(
            y.object({
              test: y
                .string()
                .required()
                .transform(value => (value ? `epic-${value}` : value)),
              age: y
                .number()
                .required()
                .transform(value => Number(value)),
            }),
          ),
        });

        return { getError, onSubmit: handleSubmit(handler) };
      },
      template: `
      <form @submit="onSubmit" novalidate>
        <Child name="test" />
        <Child name="age" />

        <button type="submit">Submit</button>
      </form>
    `,
    });

    await flush();
    await fireEvent.update(screen.getByTestId('test'), 'test');
    await fireEvent.update(screen.getByTestId('age'), '11');
    await fireEvent.click(screen.getByText('Submit'));
    await flush();
    expect(handler).toHaveBeenCalledOnce();
    expect(handler).toHaveBeenLastCalledWith({ test: 'epic-test', age: 11 });
  });

  test('supports defaults', async () => {
    const handler = vi.fn();

    await render({
      components: { Child: createInputComponent() },
      setup() {
        const { handleSubmit, getError } = useForm({
          schema: defineSchema(
            y.object({
              test: y.string().required().default('default-test'),
              age: y.number().required().default(22),
            }),
          ),
        });

        return { getError, onSubmit: handleSubmit(handler) };
      },
      template: `
      <form @submit="onSubmit" novalidate>
        <Child name="test" />
        <Child name="age" />

        <button type="submit">Submit</button>
      </form>
    `,
    });

    await flush();
    await expect(screen.getByDisplayValue('default-test')).toBeDefined();
    await expect(screen.getByDisplayValue('22')).toBeDefined();
  });
});