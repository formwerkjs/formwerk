import { renderSetup } from '@test-utils/index';
import { useForm } from './useForm';
import { useFormField } from './useFormField';
import { nextTick, Ref, ref } from 'vue';
import { useInputValidity } from '../validation/useInputValidity';
import { fireEvent, render, screen } from '@testing-library/vue';
import { TypedSchema } from '../types';

describe('form values', () => {
  test('it initializes form values', async () => {
    const { values } = await renderSetup(() => {
      return useForm({ initialValues: { foo: 'bar' } });
    });

    expect(values).toEqual({ foo: 'bar' });
  });

  test('it initializes form values from a promise', async () => {
    const { values } = await renderSetup(() => {
      return useForm({ initialValues: Promise.resolve({ foo: 'bar' }) });
    });

    expect(values).toEqual({ foo: 'bar' });
  });

  test('it initializes form values from a getter', async () => {
    const { values } = await renderSetup(() => {
      return useForm({ initialValues: () => ({ foo: 'bar' }) });
    });

    expect(values).toEqual({ foo: 'bar' });
  });

  test('initializes form values form an async getter', async () => {
    const { values } = await renderSetup(() => {
      return useForm({ initialValues: async () => ({ foo: 'bar' }) });
    });

    expect(values).toEqual({ foo: 'bar' });
  });

  test('setValues replaces form values by default', async () => {
    const { values, setValues } = await renderSetup(() => {
      return useForm<Record<string, any>>({ initialValues: { x: 'y' } });
    });

    setValues({ foo: 'baz' });

    expect(values).toEqual({ foo: 'baz' });
  });

  test('setValues can merge form values if specified', async () => {
    const { values, setValues } = await renderSetup(() => {
      return useForm<Record<string, any>>({ initialValues: { x: 'y' } });
    });

    setValues({ foo: 'baz' }, { mode: 'merge' });

    expect(values).toEqual({ x: 'y', foo: 'baz' });
  });

  test('can set specific field value', async () => {
    const { values, setFieldValue } = await renderSetup(() => {
      return useForm({ initialValues: { foo: 'bar' } });
    });

    setFieldValue('foo', 'baz');

    expect(values).toEqual({ foo: 'baz' });
  });

  test('can set nested field value', async () => {
    const { values, setFieldValue } = await renderSetup(() => {
      return useForm<any>({ initialValues: {} });
    });

    setFieldValue('foo.bar', 'baz');

    expect(values).toEqual({ foo: { bar: 'baz' } });
  });

  test('checks if a path is set', async () => {
    const { context } = await renderSetup(() => {
      return useForm<any>({ initialValues: { foo: 'bar' } });
    });

    expect(context.isFieldSet('baz')).toBe(false);
    expect(context.isFieldSet('foo')).toBe(true);
  });

  test('dot paths keys in setValues are treated as literal keys', async () => {
    const { values, setValues } = await renderSetup(() => {
      return useForm<any>({ initialValues: { foo: { bar: 'baz' } } });
    });

    setValues({ 'foo.bar': 'qux' });

    expect(values).toEqual({ 'foo.bar': 'qux' });
  });
});

describe('form touched', () => {
  test('can set field touched state', async () => {
    const { setFieldTouched, isFieldTouched } = await renderSetup(() => {
      return useForm({ initialValues: { foo: 'bar' } });
    });

    expect(isFieldTouched('foo')).toBe(false);
    setFieldTouched('foo', true);
    expect(isFieldTouched('foo')).toBe(true);
  });

  test('can set nested field touched state', async () => {
    const { setFieldTouched, isFieldTouched } = await renderSetup(() => {
      return useForm<any>();
    });

    expect(isFieldTouched('foo.bar')).toBe(false);
    setFieldTouched('foo.bar', true);
    expect(isFieldTouched('foo.bar')).toBe(true);
  });

  test('can set initial touched state', async () => {
    const { isFieldTouched } = await renderSetup(() => {
      return useForm({ initialValues: { foo: 'bar' }, initialTouched: { foo: true } });
    });

    expect(isFieldTouched('foo')).toBe(true);
  });

  test('has a form-level computed isTouched state', async () => {
    const { isTouched, setFieldTouched } = await renderSetup(() => {
      return useForm({ initialValues: { foo: 'bar' } });
    });

    expect(isTouched.value).toBe(false);
    setFieldTouched('foo', true);
    expect(isTouched.value).toBe(true);
    setFieldTouched('foo', false);
    expect(isTouched.value).toBe(false);
  });
});

describe('form reset', () => {
  test('can reset form values and touched to their original state', async () => {
    const { values, reset, setFieldValue, isFieldTouched, setFieldTouched } = await renderSetup(() => {
      return useForm({ initialValues: { foo: 'bar' }, initialTouched: { foo: true } });
    });

    setFieldValue('foo', '');
    setFieldTouched('foo', false);
    expect(values).toEqual({ foo: '' });
    expect(isFieldTouched('foo')).toBe(false);
    reset();
    expect(values).toEqual({ foo: 'bar' });
    expect(isFieldTouched('foo')).toBe(true);
  });

  test('can reset form values and touched to a new state', async () => {
    const { values, reset, setFieldValue, isFieldTouched, setFieldTouched } = await renderSetup(() => {
      return useForm({ initialValues: { foo: 'bar' } });
    });

    reset({ values: { foo: 'baz' }, touched: { foo: true } });
    expect(values).toEqual({ foo: 'baz' });
    expect(isFieldTouched('foo')).toBe(true);
    setFieldTouched('foo', false);
    setFieldValue('foo', '');
    reset();
    expect(values).toEqual({ foo: 'baz' });
    expect(isFieldTouched('foo')).toBe(true);
  });
});

describe('form submit', () => {
  test('can handle form submit', async () => {
    const { handleSubmit } = await renderSetup(() => {
      return useForm({ initialValues: { foo: 'bar' } });
    });

    const cb = vi.fn();
    const onSubmit = handleSubmit(cb);

    await onSubmit(new Event('submit'));

    expect(cb).toHaveBeenCalledWith({ foo: 'bar' });
  });

  test('submitting sets touched state to true', async () => {
    const { form } = await renderSetup(
      () => {
        const form = useForm({ initialValues: { field: 'foo' } });

        return { form };
      },
      () => {
        const field = useFormField({ path: 'field' });

        return { field };
      },
    );

    expect(form.isFieldTouched('field')).toBe(false);
    const cb = vi.fn();
    const onSubmit = form.handleSubmit(cb);
    await onSubmit(new Event('submit'));
    expect(form.isFieldTouched('field')).toBe(true);
  });

  test('submitting sets the isSubmitting flag', async () => {
    const { handleSubmit, isSubmitting } = await renderSetup(() => {
      return useForm({ initialValues: { field: 'foo' } });
    });

    const cb = vi.fn();
    const onSubmit = handleSubmit(cb);

    expect(isSubmitting.value).toBe(false);
    onSubmit(new Event('submit'));
    expect(isSubmitting.value).toBe(true);
  });

  test('disabled fields are not included in the submit values', async () => {
    const disabled = ref(false);
    const defaults = () => ({
      field: 'foo',
      multiple: ['field 1', 'field 2', 'field 3', { name: 'string' }, 'field 4'],
    });
    const { handleSubmit, values } = await renderSetup(
      () => {
        return useForm({ initialValues: defaults() });
      },
      () => {
        useFormField({ path: 'field', disabled });
        useFormField({ path: 'multiple.0' });
        useFormField({ path: 'multiple.1', disabled });
        useFormField({ path: 'multiple.2' });
        useFormField({ path: 'multiple.3.name', disabled });
        useFormField({ path: 'multiple.4' });

        return {};
      },
    );

    const cb = vi.fn();
    const onSubmit = handleSubmit(cb);
    expect(values).toEqual(defaults());
    onSubmit(new Event('submit'));
    await nextTick();
    expect(cb).toHaveBeenLastCalledWith(defaults());

    disabled.value = true;
    onSubmit(new Event('submit'));
    await nextTick();
    expect(cb).toHaveBeenLastCalledWith({ multiple: ['field 1', 'field 3', 'field 4'] });
  });
});

describe('form dirty state', () => {
  test('isDirty is true when the current values are different than the originals', async () => {
    const { isDirty, setFieldValue, reset } = await renderSetup(() => {
      return useForm({ initialValues: { foo: 'bar' } });
    });

    expect(isDirty.value).toBe(false);
    setFieldValue('foo', 'baz');
    expect(isDirty.value).toBe(true);
    reset();
    expect(isDirty.value).toBe(false);
  });

  test('pathless fields do not contribute their dirty state to the form', async () => {
    const { form, field } = await renderSetup(
      () => {
        return { form: useForm({ initialValues: { field: 'foo' } }) };
      },
      () => {
        return { field: useFormField({ initialValue: 'bar' }) };
      },
    );

    expect(form.isDirty.value).toBe(false);
    form.setFieldValue('field', 'bar');
    expect(form.isDirty.value).toBe(true);

    expect(field.isDirty.value).toBe(false);
    field.setValue('foo');
    expect(field.isDirty.value).toBe(true);

    form.setFieldValue('field', 'foo');
    field.setValue('bar');
    expect(form.isDirty.value).toBe(false);
    expect(field.isDirty.value).toBe(false);
  });

  test('fields with path sync their dirty state with the form', async () => {
    const { form, field } = await renderSetup(
      () => {
        return { form: useForm({ initialValues: { field: 'foo' } }) };
      },
      () => {
        return { field: useFormField({ path: 'field' }) };
      },
    );

    expect(field.isDirty.value).toBe(false);
    expect(form.isDirty.value).toBe(false);
    field.setValue('bar');
    expect(field.isDirty.value).toBe(true);
    expect(form.isDirty.value).toBe(true);
    field.setValue('foo');
    expect(field.isDirty.value).toBe(false);
  });
});

describe('validation', () => {
  function createInputComponent(inputRef: Ref<HTMLInputElement | undefined>) {
    return {
      setup: () => {
        const field = useFormField({ path: 'test' });
        useInputValidity({ inputRef, field });

        return { input: inputRef, errorMessage: field.errorMessage };
      },
      template: `
        <input ref="input" data-testid="input" required />
        <span data-testid="err">{{ errorMessage }}</span>
      `,
    };
  }

  test('updates the form errors', async () => {
    const input = ref<HTMLInputElement>();

    await render({
      components: { Child: createInputComponent(input) },
      setup() {
        const { getError } = useForm();

        return { getError };
      },
      template: `
      <form>
        <Child />

        <span data-testid="form-err">{{ getError('test') }}</span>
      </form>
    `,
    });

    await fireEvent.blur(screen.getByTestId('input'));
    expect(screen.getByTestId('err').textContent).toBe('Constraints not satisfied');
    expect(screen.getByTestId('form-err').textContent).toBe('Constraints not satisfied');
  });

  test('displays errors if the field is touched', async () => {
    const { setFieldTouched, displayError, setFieldErrors } = await renderSetup(() => {
      return useForm();
    });

    setFieldErrors('test', 'error');
    expect(displayError('test')).toBeUndefined();
    setFieldTouched('test', true);
    expect(displayError('test')).toBe('error');
  });

  test('updates the form isValid', async () => {
    const input = ref<HTMLInputElement>();

    await render({
      components: { Child: createInputComponent(input) },
      setup() {
        const { isValid } = useForm();

        return { isValid };
      },
      template: `
      <form>
        <Child />

        <span v-if="isValid">Form is valid</span>
        <span v-else>Form is invalid</span>
      </form>
    `,
    });

    expect(screen.getByText('Form is valid')).toBeDefined();
    await fireEvent.blur(screen.getByTestId('input'));
    expect(screen.getByText('Form is invalid')).toBeDefined();
  });

  test('prevents submission if the form is not valid', async () => {
    const input = ref<HTMLInputElement>();
    const handler = vi.fn();

    await render({
      components: { Child: createInputComponent(input) },
      setup() {
        const { handleSubmit } = useForm();

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
    await fireEvent.change(screen.getByTestId('input'), { target: { value: 'test' } });
    await fireEvent.click(screen.getByText('Submit'));
    expect(handler).toHaveBeenCalledOnce();
  });

  test('prevent submission if typed schema has errors', async () => {
    const handler = vi.fn();
    const schema: TypedSchema<object, object> = {
      async parse() {
        return {
          errors: [{ path: 'test', errors: ['error'] }],
        };
      },
    };

    await render({
      setup() {
        const { handleSubmit } = useForm({
          schema,
        });

        return { onSubmit: handleSubmit(handler) };
      },
      template: `
      <form @submit="onSubmit" novalidate>
        <button type="submit">Submit</button>
      </form>
    `,
    });

    await nextTick();
    await fireEvent.click(screen.getByText('Submit'));
    expect(handler).not.toHaveBeenCalled();
  });

  test('typed schema sets field errors', async () => {
    const handler = vi.fn();
    const input = ref<HTMLInputElement>();
    let shouldError = true;
    const schema: TypedSchema<object, object> = {
      async parse() {
        return {
          errors: shouldError ? [{ path: 'test', errors: ['error'] }] : [],
        };
      },
    };

    await render({
      components: { Child: createInputComponent(input) },
      setup() {
        const { handleSubmit, getError } = useForm({
          schema,
        });

        return { getError, onSubmit: handleSubmit(handler) };
      },
      template: `
      <form @submit="onSubmit" novalidate>
        <Child />
        <span data-testid="form-err">{{ getError('test') }}</span>

        <button type="submit">Submit</button>
      </form>
    `,
    });

    await fireEvent.click(screen.getByText('Submit'));
    await nextTick();
    expect(screen.getByTestId('err').textContent).toBe('error');
    expect(screen.getByTestId('form-err').textContent).toBe('error');
    expect(handler).not.toHaveBeenCalled();
    shouldError = false;
    await fireEvent.click(screen.getByText('Submit'));
    expect(handler).toHaveBeenCalledOnce();
  });

  test('type schema clears errors on successful submission', async () => {
    const handler = vi.fn();
    const input = ref<HTMLInputElement>();
    const schema: TypedSchema<object, object> = {
      async parse() {
        return {
          errors: [],
        };
      },
    };

    await render({
      components: { Child: createInputComponent(input) },
      setup() {
        const { handleSubmit, getError, setFieldErrors } = useForm({
          schema,
        });

        // @ts-expect-error - We don't care about our fake form here
        setFieldErrors('test', 'error');

        return { getError, onSubmit: handleSubmit(handler) };
      },
      template: `
      <form @submit="onSubmit" novalidate>
        <Child />
        <span data-testid="form-err">{{ getError('test') }}</span>

        <button type="submit">Submit</button>
      </form>
    `,
    });

    expect(screen.getByTestId('err').textContent).toBe('error');
    expect(screen.getByTestId('form-err').textContent).toBe('error');
    await fireEvent.click(screen.getByText('Submit'));
    await nextTick();
    expect(handler).toHaveBeenCalledOnce();
    expect(screen.getByTestId('err').textContent).toBe('');
    expect(screen.getByTestId('form-err').textContent).toBe('');
  });

  test('type schema parses values which is used on submission', async () => {
    const handler = vi.fn();
    const input = ref<HTMLInputElement>();
    const schema: TypedSchema<object, { test: true; foo: string }> = {
      async parse() {
        return {
          errors: [],
          output: {
            test: true,
            foo: 'bar',
          },
        };
      },
    };

    await render({
      components: { Child: createInputComponent(input) },
      setup() {
        const { handleSubmit, getError, setFieldErrors } = useForm({
          schema,
        });

        // @ts-expect-error - We don't care about our fake form here
        setFieldErrors('test', 'error');

        return { getError, onSubmit: handleSubmit(handler) };
      },
      template: `
      <form @submit="onSubmit" novalidate>
        <Child />
        <span data-testid="form-err">{{ getError('test') }}</span>

        <button type="submit">Submit</button>
      </form>
    `,
    });

    await fireEvent.click(screen.getByText('Submit'));
    await nextTick();
    expect(handler).toHaveBeenCalledOnce();
    expect(handler).toHaveBeenLastCalledWith({ test: true, foo: 'bar' });
  });
});
