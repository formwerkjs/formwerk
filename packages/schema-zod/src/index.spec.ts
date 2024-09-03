import { type Component } from 'vue';
import { fireEvent, render, screen } from '@testing-library/vue';
import { useForm, useTextField } from '@formwerk/core';
import { defineSchema } from '.';
import { z } from 'zod';
import { flush } from '@test-utils/index';

describe('schema-zod', () => {
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

  test('initial validation', async () => {
    await render({
      components: { Child: createInputComponent() },
      setup() {
        const { getError, isValid } = useForm({
          schema: defineSchema(
            z.object({
              test: z.string().min(1, 'Required'),
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
    expect(screen.getByTestId('err').textContent).toBe('Required');
    expect(screen.getByTestId('form-err').textContent).toBe('Required');
  });

  test('prevents submission if the form is not valid', async () => {
    const handler = vi.fn();

    await render({
      components: { Child: createInputComponent() },
      setup() {
        const { handleSubmit } = useForm({
          schema: defineSchema(
            z.object({
              test: z.string().min(1, 'Required'),
            }),
          ),
        });

        return { onSubmit: handleSubmit(v => handler(v.toJSON())) };
      },
      template: `
      <form @submit="onSubmit" novalidate>
        <Child />

        <button type="submit">Submit</button>
      </form>
    `,
    });

    await fireEvent.click(screen.getByText('Submit'));
    await flush();
    expect(handler).not.toHaveBeenCalled();
    await fireEvent.update(screen.getByTestId('test'), 'test');
    await fireEvent.click(screen.getByText('Submit'));
    await flush();

    expect(handler).toHaveBeenCalledOnce();
  });

  test('supports transformations and preprocess', async () => {
    const handler = vi.fn();

    await render({
      components: { Child: createInputComponent() },
      setup() {
        const { handleSubmit, getError } = useForm({
          schema: defineSchema(
            z.object({
              test: z.string().transform(value => (value ? `epic-${value}` : value)),
              age: z.preprocess(arg => Number(arg), z.number()),
            }),
          ),
        });

        return { getError, onSubmit: handleSubmit(v => handler(v.toJSON())) };
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
            z.object({
              test: z.string().min(1, 'Required').default('default-test'),
              age: z.number().min(1, 'Required').default(22),
            }),
          ),
        });

        return { getError, onSubmit: handleSubmit(v => handler(v.toJSON())) };
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

  test('validates nested paths', async () => {
    await render({
      components: { Child: createInputComponent() },
      setup() {
        const { getError, isValid, values } = useForm({
          schema: defineSchema(
            z.object({
              some: z.object({
                deep: z.object({
                  path: z.string().min(1, 'Required'),
                }),
                array: z.array(
                  z.object({
                    path: z.string().min(1, 'Required'),
                  }),
                ),
              }),
            }),
          ),
        });

        return { getError, isValid, values };
      },
      template: `
      <form>
        <Child name="some.deep.path" />
        <Child name="some.array.0.path" />
        {{values}}

        <span data-testid="is-valid">{{ isValid }}</span>
        <span data-testid="e1">{{ getError('some.deep.path') }}</span>
        <span data-testid="e2">{{ getError('some.array.0.path') }}</span>
      </form>
    `,
    });

    await flush();
    expect(screen.getByTestId('is-valid').textContent).toBe('false');
    expect(screen.getByTestId('e1').textContent).toBe('Required');
    expect(screen.getByTestId('e2').textContent).toBe('Required');

    await fireEvent.update(screen.getByTestId('some.deep.path'), 'test');
    await fireEvent.update(screen.getByTestId('some.array.0.path'), 'test');
    await fireEvent.blur(screen.getByTestId('some.deep.path'));
    await fireEvent.blur(screen.getByTestId('some.array.0.path'));
    await flush();
    expect(screen.getByTestId('is-valid').textContent).toBe('true');
    expect(screen.getByTestId('e1').textContent).toBe('');
    expect(screen.getByTestId('e2').textContent).toBe('');
  });

  test('handles zod union errors', async () => {
    await render({
      components: { Child: createInputComponent() },
      setup() {
        const schema = z.object({
          email: z.string().email({ message: 'valid email' }).min(1, 'Email is required'),
          name: z.string().min(1, 'Name is required'),
        });

        const schemaBothUndefined = z.object({
          email: z.undefined(),
          name: z.undefined(),
        });

        const bothOrNeither = schema.or(schemaBothUndefined);

        const { getError } = useForm({
          schema: defineSchema(bothOrNeither),
        });

        return {
          schema,
          getError,
        };
      },
      template: `
    <div>
      <Child name="email" />
      <span data-testid="emailErr">{{ getError('email') }}</span>

      <Child name="name" />
      <span data-testid="nameErr">{{ getError('name') }}</span>
    </div>
    `,
    });

    const emailField = screen.getByTestId('email');
    const nameField = screen.getByTestId('name');
    const emailError = screen.getByTestId('emailErr');
    const nameError = screen.getByTestId('nameErr');

    await flush();

    await fireEvent.update(nameField, '4');
    await fireEvent.blur(nameField);
    await flush();
    expect(nameError.textContent).toBe('Expected undefined, received string');
    await fireEvent.update(emailField, 'test@gmail.com');
    await fireEvent.blur(nameField);
    await flush();

    expect(emailError.textContent).toBe('');
    expect(nameError.textContent).toBe('');
  });
});
