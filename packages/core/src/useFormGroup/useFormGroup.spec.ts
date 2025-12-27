import { renderSetup } from '@test-utils/renderSetup';
import { Component } from 'vue';
import { useFormGroup } from './useFormGroup';
import { useTextField } from '../useTextField';
import { useForm } from '../useForm';
import { defineStandardSchema, dispatchEvent } from '@test-utils/index';
import { configure } from '../config';
import { StandardSchema } from '../types';
import { page } from 'vitest/browser';
import { expect } from 'vitest';

async function touchField(locator: ReturnType<typeof page.getByTestId>) {
  await locator.click();
  await dispatchEvent(locator, 'blur');
}

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

  renderSetup(() => {
    return useFormGroup({ name: 'test' });
  });

  // In browser mode this can be logged more than once due to render/setup behavior,
  // so assert it happened rather than exact call count.
  expect(warnFn).toHaveBeenCalled();
  warnFn.mockRestore();
});

test('prefixes path values with its name', async () => {
  let form!: ReturnType<typeof useForm>;
  page.render({
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

  await page.getByTestId('field1').fill('test 1');
  await page.getByTestId('field2').fill('test 2');

  expect(form.values).toEqual({ groupTest: { field1: 'test 1' }, nestedGroup: { deep: { field2: 'test 2' } } });
});

test('nested groups', async () => {
  let form!: ReturnType<typeof useForm>;
  page.render({
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

  await page.getByTestId('input_a').fill('input_a');
  await page.getByTestId('input_a_b').fill('input_a_b');
  await page.getByTestId('input_a_b_c').fill('input_a_b_c');

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
  page.render({
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

  expect(groups[0].isDirty.value).toBe(false);
  expect(groups[1].isDirty.value).toBe(false);
  await page.getByTestId('field1').fill('test 1');
  expect(groups[0].isDirty.value).toBe(true);
  expect(groups[1].isDirty.value).toBe(false);
});

test('tracks its touched state', async () => {
  const groups: ReturnType<typeof useFormGroup>[] = [];
  page.render({
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

  expect(groups[0].isTouched.value).toBe(false);
  expect(groups[1].isTouched.value).toBe(false);
  await touchField(page.getByTestId('field1'));
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

  page.render({
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

  await expect.poll(() => groups[0].isValid.value).toBe(false);
  await expect.poll(() => groups[1].isValid.value).toBe(true);
  await page.getByTestId('field1').fill('test');
  await dispatchEvent(page.getByTestId('field1'), 'blur');
  await expect.poll(() => groups[0].isValid.value).toBe(true);
  await expect.poll(() => groups[1].isValid.value).toBe(true);
});

test('validates with a typed schema', async () => {
  let form!: ReturnType<typeof useForm>;
  const groups: ReturnType<typeof useFormGroup>[] = [];
  const schema = defineStandardSchema<any, any>(value => {
    return {
      issues: (value as any).field ? [] : [{ message: 'error', path: ['field'] }],
    };
  });

  page.render({
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

  await form.validate();
  expect(groups[0].isValid.value).toBe(false);
  // Group-level schema issues are aggregated at the group path.
  expect(form.getError('group' as any)).toBe('error');
  await page.getByTestId('field').fill('test');
  ((await page.getByTestId('field').element()) as HTMLInputElement).blur();

  await form.validate();
  expect(groups[0].isValid.value).toBe(true);
  expect(form.getError('group' as any)).toBeUndefined();
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

  page.render({
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

  await expect.poll(() => form.getErrors()).toHaveLength(2);

  await page.getByTestId('field').fill('test');
  await dispatchEvent(page.getByTestId('field'), 'blur');
  await expect.poll(() => form.getErrors()).toHaveLength(1);
  await page.getByTestId('other').fill('test');
  await dispatchEvent(page.getByTestId('other'), 'blur');
  await expect.poll(() => form.getErrors()).toHaveLength(0);
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

  page.render({
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

  await expect.poll(() => form.getErrors()).toHaveLength(4);
  await expect.poll(() => form.getErrors()[0]).toBe('error');
  await expect.poll(() => form.getErrors()[2]).toBe('error');
  await expect.poll(() => form.getErrors()[1]).toMatch(/Constraints not satisfied|Please fill out this field\.?/);
  await expect.poll(() => form.getErrors()[3]).toMatch(/Constraints not satisfied|Please fill out this field\.?/);

  await page.getByTestId('field').fill('test');
  await dispatchEvent(page.getByTestId('field'), 'blur');

  await expect.poll(() => form.getErrors()).toHaveLength(3);
  await expect.poll(() => form.getErrors()[0]).toBe('error');
  await expect.poll(() => form.getErrors()[2]).toBe('error');
  await expect.poll(() => form.getErrors()[1]).toMatch(/Constraints not satisfied|Please fill out this field\.?/);
  await page.getByTestId('other').fill('test');
  await expect.poll(() => form.getErrors()).toHaveLength(2);
  await expect.poll(() => form.getErrors()).toEqual(['error', 'error']);

  await page.getByTestId('other').fill('valid');
  await page.getByTestId('field').fill('valid');
  await expect.poll(() => form.getErrors()).toHaveLength(0);
});

test('submission combines group data with form data', async () => {
  const submitHandler = vi.fn();
  const groupSchema = defineStandardSchema<{ first: string }>(() => {
    return {
      value: { first: 'wow', second: 'how' },
    };
  });

  page.render({
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

  expect(submitHandler).not.toHaveBeenCalled();
  await page.getByTestId('first').fill('first');
  await page.getByTestId('second').fill('second');
  await page.getByTestId('third').fill('third');
  await page.getByRole('button', { name: 'Submit' }).click();
  expect(submitHandler).toHaveBeenCalledOnce();
  expect(submitHandler).toHaveBeenLastCalledWith({
    group: { first: 'wow', second: 'how' },
    other: { second: 'second' },
    third: 'third',
  });
});

describe('disabling HTML validation', () => {
  test('can be disabled on the group level', async () => {
    page.render({
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

    await touchField(page.getByTestId('field1'));
    await touchField(page.getByTestId('field2'));

    const errors = page.getByTestId('err');
    await expect.element(errors.nth(0)).toHaveTextContent('');
    await expect.element(errors.nth(1)).toHaveTextContent(/Constraints not satisfied|Please fill out this field\.?/);
  });

  test('can be disabled on the form level', async () => {
    page.render({
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

    await touchField(page.getByTestId('field1'));
    await touchField(page.getByTestId('field2'));
    await touchField(page.getByTestId('field3'));

    const errors = page.getByTestId('err');
    await expect.element(errors.nth(0)).toHaveTextContent('');
    await expect.element(errors.nth(1)).toHaveTextContent('');
    await expect.element(errors.nth(2)).toHaveTextContent(/Constraints not satisfied|Please fill out this field\.?/);
  });

  test('can be disabled on the field level', async () => {
    page.render({
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

    await touchField(page.getByTestId('field1'));
    await touchField(page.getByTestId('field2'));
    await touchField(page.getByTestId('field3'));

    const errors = page.getByTestId('err');
    // Wait for validation to complete by polling for error message
    await expect.element(errors.nth(0)).toHaveTextContent(/Constraints not satisfied|Please fill out this field\.?/);
    await expect.element(errors.nth(1)).toHaveTextContent('');
    await expect.element(errors.nth(2)).toHaveTextContent('');
  });

  test('can be disabled globally and overridden', async () => {
    configure({
      disableHtmlValidation: true,
    });

    page.render({
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

    await touchField(page.getByTestId('field1'));
    await touchField(page.getByTestId('field2'));
    await touchField(page.getByTestId('field3'));

    const errors = page.getByTestId('err');
    await expect.element(errors.nth(0)).toHaveTextContent('');
    await expect.element(errors.nth(1)).toHaveTextContent('');
    await expect.element(errors.nth(2)).toHaveTextContent(/Constraints not satisfied|Please fill out this field\.?/);

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

    page.render({
      components: { FieldsetGroup },
      template: `
        <FieldsetGroup>
          <div>Content</div>
        </FieldsetGroup>
      `,
    });

    const fieldset = page.getByTestId('group');
    expect(((await fieldset.element()) as HTMLElement).getAttribute('id')).toMatch(/.+/);
    // Fieldset should not have role or aria-labelledby
    await expect.element(fieldset).not.toHaveAttribute('role');
    await expect.element(fieldset).not.toHaveAttribute('aria-labelledby');
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

    page.render({
      components: { DivGroup },
      template: `
        <DivGroup>
          <div>Content</div>
        </DivGroup>
      `,
    });

    const div = page.getByTestId('group');
    expect(((await div.element()) as HTMLElement).getAttribute('id')).toMatch(/.+/);
    await expect.element(div).toHaveAttribute('role', 'group');
    expect(((await div.element()) as HTMLElement).getAttribute('aria-labelledby')).toMatch(/.+/);
  });
});
