import { renderSetup } from '@test-utils/index';
import { useForm } from './useForm';
import { useFormField } from './useFormField';

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

describe('form actions', () => {
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
