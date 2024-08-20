import { renderSetup } from '@test-utils/renderSetup';
import { Component } from 'vue';
import { useFormGroup } from './useFormGroup';
import { TypedSchema } from '../types';
import { useTextField } from '../useTextField';
import { useForm } from '../useForm';
import { fireEvent, render, screen } from '@testing-library/vue';
import { flush } from '@test-utils/flush';

function createInputComponent(): Component {
  return {
    inheritAttrs: false,
    setup: (_, { attrs }) => {
      const name = (attrs.name || 'test') as string;
      const schema = attrs.schema as TypedSchema<any>;
      const { errorMessage, inputProps } = useTextField({ name, label: name, schema });

      return { errorMessage: errorMessage, inputProps, name, attrs };
    },
    template: `
        <input v-bind="{...inputProps, ...attrs}" :data-testid="name" />
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

test('warns if no form is present', async () => {
  const warnFn = vi.spyOn(console, 'warn');

  await renderSetup(() => {
    return useFormGroup({ name: 'test' });
  });

  expect(warnFn).toHaveBeenCalledOnce();
  warnFn.mockRestore();
});

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
  await fireEvent.blur(screen.getByTestId('field1'));
  await flush();
  expect(groups[0].isValid.value).toBe(true);
  expect(groups[1].isValid.value).toBe(true);
});

test('validates with a typed schema', async () => {
  let form!: ReturnType<typeof useForm>;
  const groups: ReturnType<typeof useFormGroup>[] = [];
  const schema: TypedSchema<{ field: string }> = {
    async parse(value) {
      return {
        errors: value.field ? [] : [{ path: 'field', messages: ['error'] }],
      };
    },
  };

  await render({
    components: { TInput: createInputComponent(), TGroup: createGroupComponent(fg => groups.push(fg)) },
    setup() {
      form = useForm();

      return {
        schema,
      };
    },
    template: `
      <TGroup name="group" :schema="schema">
        <TInput name="field" />
      </TGroup>
    `,
  });

  await flush();
  expect(groups[0].isValid.value).toBe(false);
  expect(form.getError('group.field')).toBe('error');
  await fireEvent.update(screen.getByTestId('field'), 'test');
  await fireEvent.blur(screen.getByTestId('field'));

  await flush();
  expect(groups[0].isValid.value).toBe(true);
  expect(form.getError('group.field')).toBeUndefined();
});

test('validation combines schema with form schema', async () => {
  let form!: ReturnType<typeof useForm>;
  const groups: ReturnType<typeof useFormGroup>[] = [];
  const groupSchema: TypedSchema<{ field: string }> = {
    async parse(value) {
      return {
        errors: value.field ? [] : [{ path: 'field', messages: ['error'] }],
      };
    },
  };

  const formSchema: TypedSchema<{ other: string }> = {
    async parse(value) {
      return {
        errors: value.other ? [] : [{ path: 'other', messages: ['error'] }],
      };
    },
  };

  await render({
    components: { TInput: createInputComponent(), TGroup: createGroupComponent(fg => groups.push(fg)) },
    setup() {
      form = useForm({
        schema: formSchema,
      }) as any;

      return {
        groupSchema,
      };
    },
    template: `
      <TGroup name="group" :schema="groupSchema">
        <TInput name="field" />
      </TGroup>

      <TInput name="other" />
    `,
  });

  await flush();
  expect(form.getErrors()).toHaveLength(2);

  await fireEvent.update(screen.getByTestId('field'), 'test');
  await fireEvent.blur(screen.getByTestId('field'));

  await flush();
  expect(form.getErrors()).toHaveLength(1);
  await fireEvent.update(screen.getByTestId('other'), 'test');
  await fireEvent.blur(screen.getByTestId('other'));
  await flush();
  expect(form.getErrors()).toHaveLength(0);
});

test('validation cascades', async () => {
  let form!: ReturnType<typeof useForm>;
  const groups: ReturnType<typeof useFormGroup>[] = [];
  const groupSchema: TypedSchema<{ field: string }> = {
    async parse(value) {
      return {
        errors: value.field === 'valid' ? [] : [{ path: 'field', messages: ['error'] }],
      };
    },
  };

  const formSchema: TypedSchema<{ other: string }> = {
    async parse(value) {
      return {
        errors: value.other === 'valid' ? [] : [{ path: 'other', messages: ['error'] }],
      };
    },
  };

  await render({
    components: { TInput: createInputComponent(), TGroup: createGroupComponent(fg => groups.push(fg)) },
    setup() {
      form = useForm({
        schema: formSchema,
      }) as any;

      return {
        groupSchema,
      };
    },
    template: `
      <TGroup name="group" :schema="groupSchema">
        <TInput name="field" :required="true" />
      </TGroup>

      <TInput name="other" :required="true" />
    `,
  });

  await flush();
  expect(form.getErrors()).toHaveLength(2);
  expect(form.getErrors().flatMap(e => e.messages)).toEqual(['Constraints not satisfied', 'Constraints not satisfied']);

  await fireEvent.update(screen.getByTestId('field'), 'test');
  await fireEvent.blur(screen.getByTestId('field'));

  await flush();
  expect(form.getErrors()).toHaveLength(2);
  expect(form.getErrors().flatMap(e => e.messages)).toEqual(['Constraints not satisfied', 'error']);
  await fireEvent.update(screen.getByTestId('other'), 'test');
  await fireEvent.blur(screen.getByTestId('other'));
  await flush();
  expect(form.getErrors()).toHaveLength(2);
  expect(form.getErrors().flatMap(e => e.messages)).toEqual(['error', 'error']);

  await fireEvent.update(screen.getByTestId('other'), 'valid');
  await fireEvent.update(screen.getByTestId('field'), 'valid');
  await fireEvent.blur(screen.getByTestId('other'));
  await fireEvent.blur(screen.getByTestId('field'));
  await flush();
  expect(form.getErrors()).toHaveLength(0);
});

test('submission combines group data with form data', async () => {
  const submitHandler = vi.fn();
  const groupSchema: TypedSchema<{ first: string }> = {
    async parse() {
      return {
        output: { first: 'wow', second: 'how' },
        errors: [],
      };
    },
  };
  await render({
    components: { TInput: createInputComponent(), TGroup: createGroupComponent() },
    setup() {
      const { handleSubmit } = useForm({});

      const onSubmit = handleSubmit(submitHandler);

      return {
        onSubmit,
        groupSchema,
      };
    },
    template: `
      <TGroup name="group" :schema="groupSchema">
        <TInput name="first" />
      </TGroup>

      <TGroup name="other" >
        <TInput name="second" />
      </TGroup>

      <TInput name="third" />

      <button @click="onSubmit">Submit</button>
    `,
  });

  await flush();
  expect(submitHandler).not.toHaveBeenCalled();
  await fireEvent.update(screen.getByTestId('first'), 'first');
  await fireEvent.update(screen.getByTestId('second'), 'second');
  await fireEvent.update(screen.getByTestId('third'), 'third');
  await flush();
  await screen.getByText('Submit').click();
  await flush();
  expect(submitHandler).toHaveBeenCalledOnce();
  expect(submitHandler).toHaveBeenLastCalledWith({
    group: { first: 'wow', second: 'how' },
    other: { second: 'second' },
    third: 'third',
  });
});
