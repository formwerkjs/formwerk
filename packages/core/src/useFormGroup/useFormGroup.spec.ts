import { renderSetup } from '@test-utils/renderSetup';
import { Component } from 'vue';
import { useFormGroup } from './useFormGroup';
import { useTextField } from '../useTextField';
import { useForm } from '../useForm';
import { fireEvent, render, screen } from '@testing-library/vue';
import { flush, defineStandardSchema } from '@test-utils/index';
import { configure } from '../config';
import { StandardSchema } from '../types';

function createInputComponent(): Component {
  return {
    inheritAttrs: false,
    setup: (_, { attrs }) => {
      const name = (attrs.name || 'test') as string;
      const schema = attrs.schema as StandardSchema<any>;
      const { errorMessage, inputProps } = useTextField({
        name,
        label: name,
        schema,
        disableHtmlValidation: attrs.disableHtmlValidation as any,
      });

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
      const schema = attrs.schema as StandardSchema<any>;
      const fg = useFormGroup({ name, label: name, schema, disableHtmlValidation: attrs.disableHtmlValidation as any });
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

test('nested groups', async () => {
  let form!: ReturnType<typeof useForm>;
  await render({
    components: { TInput: createInputComponent(), TGroup: createGroupComponent() },
    setup() {
      form = useForm();

      return {};
    },
    template: `      
      <TGroup name="group_a">
        <TInput name="input_a" />
        <TGroup name="group_a_b">
          <TInput name="input_a_b" />
          <TGroup name="group_a_b_c">
            <TInput name="input_a_b_c" />
          </TGroup>
        </TGroup>
      </TGroup>
    `,
  });

  await flush();
  await fireEvent.update(screen.getByTestId('input_a'), 'input_a');
  await fireEvent.update(screen.getByTestId('input_a_b'), 'input_a_b');
  await fireEvent.update(screen.getByTestId('input_a_b_c'), 'input_a_b_c');
  await flush();

  expect(form.values).toEqual({
    group_a: {
      input_a: 'input_a',
      group_a_b: {
        input_a_b: 'input_a_b',
        group_a_b_c: {
          input_a_b_c: 'input_a_b_c',
        },
      },
    },
  });
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
  const schema = defineStandardSchema<any, any>(value => {
    return {
      issues: value ? [] : [{ path: ['groupTest', 'field1'], message: 'error' }],
    };
  });

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
  const schema = defineStandardSchema<any, any>(value => {
    return {
      issues: (value as any).field ? [] : [{ message: 'error', path: ['field'] }],
    };
  });

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
  const groupSchema = defineStandardSchema<{ field: string }>(value => {
    return {
      issues: (value as any).field ? [] : [{ message: 'error', path: ['field'] }],
    };
  });

  const formSchema = defineStandardSchema<{ other: string }>(value => {
    return {
      issues: (value as any).other ? [] : [{ message: 'error', path: ['other'] }],
    };
  });

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
  const groupSchema = defineStandardSchema<{ field: string }>(value => {
    return {
      issues: (value as any).field === 'valid' ? [] : [{ message: 'error', path: ['field'] }],
    };
  });

  const formSchema = defineStandardSchema<{ other: string }>(value => {
    return {
      issues: (value as any).other === 'valid' ? [] : [{ message: 'error', path: ['other'] }],
    };
  });

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
  const groupSchema = defineStandardSchema<{ first: string }>(() => {
    return {
      value: { first: 'wow', second: 'how' },
    };
  });

  await render({
    components: { TInput: createInputComponent(), TGroup: createGroupComponent() },
    setup() {
      const { handleSubmit } = useForm({});

      const onSubmit = handleSubmit(v => submitHandler(v.toObject()));

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

describe('disabling HTML validation', () => {
  test('can be disabled on the group level', async () => {
    await render({
      components: { TInput: createInputComponent(), TGroup: createGroupComponent() },
      setup() {
        useForm();

        return {};
      },
      template: `
        <TGroup :disableHtmlValidation="true">
          <TInput name="field1" :required="true" />
        </TGroup>

        <TInput name="field2" :required="true" />
      `,
    });

    await flush();
    await fireEvent.touch(screen.getByTestId('field1'));
    await fireEvent.touch(screen.getByTestId('field2'));

    const errors = screen.getAllByTestId('err');
    expect(errors[0]).toHaveTextContent('');
    expect(errors[1]).toHaveTextContent('Constraints not satisfied');
  });

  test('can be disabled on the form level', async () => {
    await render({
      components: { TInput: createInputComponent(), TGroup: createGroupComponent() },
      setup() {
        useForm({ disableHtmlValidation: true });

        return {};
      },
      template: `
        <TGroup>
          <TInput name="field1" :required="true" />
        </TGroup>

        <TInput name="field2" :required="true" />

        <TGroup :disableHtmlValidation="false">
          <TInput name="field3" :required="true" />
        </TGroup>
      `,
    });

    await flush();
    await fireEvent.touch(screen.getByTestId('field1'));
    await fireEvent.touch(screen.getByTestId('field2'));
    await fireEvent.touch(screen.getByTestId('field3'));

    const errors = screen.getAllByTestId('err');
    expect(errors[0]).toHaveTextContent('');
    expect(errors[1]).toHaveTextContent('');
    expect(errors[2]).toHaveTextContent('Constraints not satisfied');
  });

  test('can be disabled on the field level', async () => {
    await render({
      components: { TInput: createInputComponent(), TGroup: createGroupComponent() },
      setup() {
        useForm();

        return {};
      },
      template: `
        <TGroup>
          <TInput name="field1" :required="true" />
          <TInput name="field2" :required="true" :disableHtmlValidation="true" />
        </TGroup>

        <TInput name="field3" :required="true" :disableHtmlValidation="true" />
      `,
    });

    await flush();
    await fireEvent.touch(screen.getByTestId('field1'));
    await fireEvent.touch(screen.getByTestId('field2'));
    await fireEvent.touch(screen.getByTestId('field3'));

    const errors = screen.getAllByTestId('err');
    expect(errors[0]).toHaveTextContent('Constraints not satisfied');
    expect(errors[1]).toHaveTextContent('');
    expect(errors[2]).toHaveTextContent('');
  });

  test('can be disabled globally and overridden', async () => {
    configure({
      disableHtmlValidation: true,
    });

    await render({
      components: { TInput: createInputComponent(), TGroup: createGroupComponent() },
      setup() {
        useForm({ disableHtmlValidation: true });

        return {};
      },
      template: `
        <TGroup>
          <TInput name="field1" :required="true" />
        </TGroup>

        <TInput name="field2" :required="true" />

        <TGroup :disableHtmlValidation="false">
          <TInput name="field3" :required="true" />
        </TGroup>
      `,
    });

    await flush();
    await fireEvent.touch(screen.getByTestId('field1'));
    await fireEvent.touch(screen.getByTestId('field2'));
    await fireEvent.touch(screen.getByTestId('field3'));

    const errors = screen.getAllByTestId('err');
    expect(errors[0]).toHaveTextContent('');
    expect(errors[1]).toHaveTextContent('');
    expect(errors[2]).toHaveTextContent('Constraints not satisfied');

    configure({
      disableHtmlValidation: false,
    });
  });
});

describe('group props rendering', () => {
  test('renders correct attributes on fieldset element', async () => {
    const FieldsetGroup = {
      template: `<fieldset v-bind="groupProps" data-testid="group"><slot /></fieldset>`,
      setup() {
        const { groupProps } = useFormGroup({ name: 'test', label: 'Test Group' });
        return { groupProps };
      },
    };

    await render({
      components: { FieldsetGroup },
      template: `
        <FieldsetGroup>
          <div>Content</div>
        </FieldsetGroup>
      `,
    });

    const fieldset = screen.getByTestId('group');
    expect(fieldset).toHaveAttribute('id');
    // Fieldset should not have role or aria-labelledby
    expect(fieldset).not.toHaveAttribute('role');
    expect(fieldset).not.toHaveAttribute('aria-labelledby');
  });

  test('renders correct attributes on non-fieldset element', async () => {
    const DivGroup = {
      template: `
        <div>
          <label v-bind="labelProps">Test Group</label>
          <div v-bind="groupProps" data-testid="group"><slot /></div>
        </div>
      `,
      setup() {
        const { groupProps, labelProps } = useFormGroup({ name: 'test', label: 'Test Group' });
        return { groupProps, labelProps };
      },
    };

    await render({
      components: { DivGroup },
      template: `
        <DivGroup>
          <div>Content</div>
        </DivGroup>
      `,
    });

    const div = screen.getByTestId('group');
    expect(div).toHaveAttribute('id');
    expect(div).toHaveAttribute('role', 'group');
    expect(div).toHaveAttribute('aria-labelledby');
  });
});
