import { renderSetup } from '@test-utils/renderSetup';
import { Component } from 'vue';
import { TypedSchema, useTextField, useForm, useFormGroup } from '@core/index';
import { fireEvent, render, screen } from '@testing-library/vue';
import { flush } from '@test-utils/flush';

test('warns if no form is present', async () => {
  const warnFn = vi.spyOn(console, 'warn');

  await renderSetup(() => {
    return useFormGroup({ name: 'test' });
  });

  expect(warnFn).toHaveBeenCalledOnce();
  warnFn.mockRestore();
});

function createInputComponent(): Component {
  return {
    inheritAttrs: false,
    setup: (_, { attrs }) => {
      const name = (attrs.name || 'test') as string;
      const schema = attrs.schema as TypedSchema<any>;
      const { errorMessage, inputProps } = useTextField({ name, label: name, schema });

      return { errorMessage: errorMessage, inputProps, name };
    },
    template: `
        <input v-bind="inputProps" :data-testid="name" />
        <span data-testid="err">{{ errorMessage }}</span>
      `,
  };
}

function createGroupComponent(fn?: (fg: ReturnType<typeof useFormGroup>) => void): Component {
  return {
    inheritAttrs: false,
    setup: (_, { attrs }) => {
      const name = (attrs.name || 'test') as string;
      const schema = attrs.schema as TypedSchema<any>;
      const fg = useFormGroup({ name, label: name, schema });
      fn?.(fg);

      return {};
    },
    template: `
        <slot />
      `,
  };
}

test('prefixes path values with its name', async () => {
  let form!: ReturnType<typeof useForm>;
  await render({
    components: { TInput: createInputComponent(), TGroup: createGroupComponent() },
    setup() {
      form = useForm();

      return {};
    },
    template: `
      <TGroup name="groupTest">
        <TInput name="field1" />
      </TGroup>

      <TGroup name="nestedGroup.deep">
        <TInput name="field2" />
      </TGroup>
    `,
  });

  await flush();
  await fireEvent.update(screen.getByTestId('field1'), 'test 1');
  await fireEvent.update(screen.getByTestId('field2'), 'test 2');
  await flush();

  expect(form.values).toEqual({ groupTest: { field1: 'test 1' }, nestedGroup: { deep: { field2: 'test 2' } } });
});

test('tracks its dirty state', async () => {
  const groups: ReturnType<typeof useFormGroup>[] = [];
  await render({
    components: { TInput: createInputComponent(), TGroup: createGroupComponent(fg => groups.push(fg)) },
    setup() {
      useForm();

      return {};
    },
    template: `
      <TGroup name="groupTest">
        <TInput name="field1" />
      </TGroup>

      <TGroup name="nestedGroup.deep">
        <TInput name="field2" />
      </TGroup>
    `,
  });

  await flush();
  expect(groups[0].isDirty.value).toBe(false);
  expect(groups[1].isDirty.value).toBe(false);
  await fireEvent.update(screen.getByTestId('field1'), 'test 1');
  await flush();
  expect(groups[0].isDirty.value).toBe(true);
  expect(groups[1].isDirty.value).toBe(false);
});

test('tracks its touched state', async () => {
  const groups: ReturnType<typeof useFormGroup>[] = [];
  await render({
    components: { TInput: createInputComponent(), TGroup: createGroupComponent(fg => groups.push(fg)) },
    setup() {
      useForm();

      return {};
    },
    template: `
      <TGroup name="groupTest">
        <TInput name="field1" />
      </TGroup>

      <TGroup name="nestedGroup.deep">
        <TInput name="field2" />
      </TGroup>
    `,
  });

  await flush();
  expect(groups[0].isTouched.value).toBe(false);
  expect(groups[1].isTouched.value).toBe(false);
  await fireEvent.touch(screen.getByTestId('field1'));
  await flush();
  expect(groups[0].isTouched.value).toBe(true);
  expect(groups[1].isTouched.value).toBe(false);
});

test('tracks its valid state', async () => {
  const groups: ReturnType<typeof useFormGroup>[] = [];
  const schema: TypedSchema<string> = {
    async parse(value) {
      return {
        errors: value ? [] : [{ path: 'groupTest.field1', messages: ['error'] }],
      };
    },
  };

  await render({
    components: { TInput: createInputComponent(), TGroup: createGroupComponent(fg => groups.push(fg)) },
    setup() {
      useForm();

      return {
        schema,
      };
    },
    template: `
      <TGroup name="groupTest">
        <TInput name="field1" :schema="schema" />
      </TGroup>

      <TGroup name="nestedGroup.deep">
        <TInput name="field2" />
      </TGroup>
    `,
  });

  await flush();
  expect(groups[0].isValid.value).toBe(false);
  expect(groups[1].isValid.value).toBe(true);
  await fireEvent.update(screen.getByTestId('field1'), 'test');
  await fireEvent.blur(screen.getByTestId('field1'), 'test');
  await flush();
  expect(groups[0].isValid.value).toBe(true);
  expect(groups[1].isValid.value).toBe(true);
});
