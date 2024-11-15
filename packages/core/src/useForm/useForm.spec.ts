import { flush, renderSetup, defineStandardSchema } from '@test-utils/index';
import { useForm } from './useForm';
import { useFormField } from '../useFormField';
import { Component, nextTick, Ref, ref } from 'vue';
import { useInputValidity } from '../validation/useInputValidity';
import { fireEvent, render, screen } from '@testing-library/vue';
import { useTextField } from '../useTextField';
import { StandardSchema } from '../types';

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
      return useForm({ initialValues: { x: 'y' } as Record<string, any> });
    });

    setValues({ foo: 'baz' });

    expect(values).toEqual({ foo: 'baz' });
  });

  test('setValues can merge form values if specified', async () => {
    const { values, setValues } = await renderSetup(() => {
      return useForm({ initialValues: { x: 'y' } as Record<string, any> });
    });

    setValues({ foo: 'baz' }, { behavior: 'merge' });

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
    const onSubmit = handleSubmit(v => cb(v.toObject()));

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
    const onSubmit = handleSubmit(v => cb(v.toObject()));
    expect(values).toEqual(defaults());
    await onSubmit(new Event('submit'));
    expect(cb).toHaveBeenLastCalledWith(defaults());

    disabled.value = true;
    await onSubmit(new Event('submit'));
    expect(cb).toHaveBeenCalledTimes(2);
    expect(cb).toHaveBeenLastCalledWith({ multiple: ['field 1', 'field 3', 'field 4'] });
  });

  test('can submit with object data', async () => {
    const file1 = new File([''], 'test1.jpg', { type: 'image/jpeg' });
    const file2 = new File([''], 'test2.pdf', { type: 'application/pdf' });

    const input = {
      name: 'John Doe',
      age: 30,
      isStudent: false,
      grades: {
        math: 95,
        science: 88,
      },
      hobbies: ['reading', 'cycling', null],
      address: {
        street: '123 Main St',
        city: 'New York',
        zipCode: null,
      },
      profilePic: file1,
      documents: [
        file2,
        {
          resume: file1,
          coverLetter: file2,
        },
      ],
      emptyObject: {},
      nullValue: null,
      undefinedValue: undefined,
      nestedArrays: [
        [1, 2],
        [3, [4, 5]],
      ],
    } as const;

    const { form } = await renderSetup(() => {
      return { form: useForm({ initialValues: input }) };
    });

    let data!: typeof input;
    const cb = vi.fn(v => (data = v));
    const onSubmit = form.handleSubmit(v => cb(v.toObject()));
    await onSubmit(new Event('submit'));

    expect(data.name).toBe('John Doe');
    expect(data.age).toBe(30);
    expect(data.isStudent).toBe(false);

    // Nested object
    expect(data.grades.math).toBe(95);
    expect(data.grades.science).toBe(88);

    // Array
    expect(data.hobbies[0]).toBe('reading');
    expect(data.hobbies[1]).toBe('cycling');
    expect(data.hobbies[2]).toBe(null);

    // Nested object with null value
    expect(data.address.street).toBe('123 Main St');
    expect(data.address.city).toBe('New York');
    expect(data.address.zipCode).toBe(null);

    // File object
    expect(data.profilePic).toEqual(file1);

    // Array with mixed types
    expect(data.documents[0]).toEqual(file2);
    expect(data.documents[1].resume).toEqual(file1);
    expect(data.documents[1].coverLetter).toEqual(file2);

    // Empty object (should not have an entry)
    expect(data.emptyObject).toEqual({});

    // Null and undefined values
    expect(data.nullValue).toBe(null);
    expect(data.undefinedValue).toBe(undefined);
    expect(data).toHaveProperty('undefinedValue');

    // Nested arrays
    expect(data.nestedArrays[0][0]).toBe(1);
    expect(data.nestedArrays[0][1]).toBe(2);
    expect(data.nestedArrays[1][0]).toBe(3);
    expect(data.nestedArrays[1][1][0]).toBe(4);
    expect(data.nestedArrays[1][1][1]).toBe(5);
  });

  test('can submit with JSON data', async () => {
    const file1 = new File([''], 'test1.jpg', { type: 'image/jpeg' });
    const file2 = new File([''], 'test2.pdf', { type: 'application/pdf' });

    const input = {
      name: 'John Doe',
      age: 30,
      isStudent: false,
      grades: {
        math: 95,
        science: 88,
      },
      hobbies: ['reading', 'cycling', null],
      address: {
        street: '123 Main St',
        city: 'New York',
        zipCode: null,
      },
      profilePic: file1,
      documents: [
        file2,
        {
          resume: file1,
          coverLetter: file2,
        },
      ],
      emptyObject: {},
      nullValue: null,
      undefinedValue: undefined,
      nestedArrays: [
        [1, 2],
        [3, [4, 5]],
      ],
    } as const;

    const { form } = await renderSetup(() => {
      return { form: useForm({ initialValues: input }) };
    });

    let data!: typeof input;
    const cb = vi.fn(v => (data = v));
    const onSubmit = form.handleSubmit(v => cb(v.toJSON()));
    await onSubmit(new Event('submit'));

    expect(data.name).toBe('John Doe');
    expect(data.age).toBe(30);
    expect(data.isStudent).toBe(false);

    // Nested object
    expect(data.grades.math).toBe(95);
    expect(data.grades.science).toBe(88);

    // Array
    expect(data.hobbies[0]).toBe('reading');
    expect(data.hobbies[1]).toBe('cycling');
    expect(data.hobbies[2]).toBe(null);

    // Nested object with null value
    expect(data.address.street).toBe('123 Main St');
    expect(data.address.city).toBe('New York');
    expect(data.address.zipCode).toBe(null);

    // File object
    expect(data.profilePic).toEqual({});

    // Array with mixed types
    expect(data.documents[0]).toEqual({});
    expect(data.documents[1].resume).toEqual({});
    expect(data.documents[1].coverLetter).toEqual({});

    // Empty object (should not have an entry)
    expect(data.emptyObject).toEqual({});

    // Null and undefined values
    expect(data.nullValue).toBe(null);
    expect(data.undefinedValue).toBe(undefined);
    expect(data).not.toHaveProperty('undefinedValue');

    // Nested arrays
    expect(data.nestedArrays[0][0]).toBe(1);
    expect(data.nestedArrays[0][1]).toBe(2);
    expect(data.nestedArrays[1][0]).toBe(3);
    expect(data.nestedArrays[1][1][0]).toBe(4);
    expect(data.nestedArrays[1][1][1]).toBe(5);
  });

  test('can submit with FormData', async () => {
    const file1 = new File([''], 'test1.jpg', { type: 'image/jpeg' });
    const file2 = new File([''], 'test2.pdf', { type: 'application/pdf' });

    const input = {
      name: 'John Doe',
      age: 30,
      isStudent: false,
      grades: {
        math: 95,
        science: 88,
      },
      hobbies: ['reading', 'cycling', null],
      address: {
        street: '123 Main St',
        city: 'New York',
        zipCode: null,
      },
      profilePic: file1,
      documents: [
        file2,
        {
          resume: file1,
          coverLetter: file2,
        },
      ],
      emptyObject: {},
      nullValue: null,
      undefinedValue: undefined,
      nestedArrays: [
        [1, 2],
        [3, [4, 5]],
      ],
    };

    const { form } = await renderSetup(() => {
      return { form: useForm({ initialValues: input }) };
    });

    let formData!: FormData;
    const cb = vi.fn(v => (formData = v));
    const onSubmit = form.handleSubmit(v => cb(v.toFormData()));
    await onSubmit(new Event('submit'));

    expect(formData.get('name')).toBe('John Doe');
    expect(formData.get('age')).toBe('30');
    expect(formData.get('isStudent')).toBe('false');

    // Nested object
    expect(formData.get('grades[math]')).toBe('95');
    expect(formData.get('grades[science]')).toBe('88');

    // Array
    expect(formData.get('hobbies[0]')).toBe('reading');
    expect(formData.get('hobbies[1]')).toBe('cycling');
    expect(formData.get('hobbies[2]')).toBe('');

    // Nested object with null value
    expect(formData.get('address[street]')).toBe('123 Main St');
    expect(formData.get('address[city]')).toBe('New York');
    expect(formData.get('address[zipCode]')).toBe('');

    // File object
    expect(formData.get('profilePic')).toEqual(file1);

    // Array with mixed types
    expect(formData.get('documents[0]')).toEqual(file2);
    expect(formData.get('documents[1][resume]')).toEqual(file1);
    expect(formData.get('documents[1][coverLetter]')).toEqual(file2);

    // Empty object (should not have an entry)
    expect(formData.has('emptyObject')).toBe(false);

    // Null and undefined values
    expect(formData.get('nullValue')).toBe('');
    expect(formData.get('undefinedValue')).toBe('');

    // Nested arrays
    expect(formData.get('nestedArrays[0][0]')).toBe('1');
    expect(formData.get('nestedArrays[0][1]')).toBe('2');
    expect(formData.get('nestedArrays[1][0]')).toBe('3');
    expect(formData.get('nestedArrays[1][1][0]')).toBe('4');
    expect(formData.get('nestedArrays[1][1][1]')).toBe('5');

    // Additional check to ensure all keys are as expected
    const expectedKeys = [
      'name',
      'age',
      'isStudent',
      'grades[math]',
      'grades[science]',
      'hobbies[0]',
      'hobbies[1]',
      'hobbies[2]',
      'address[street]',
      'address[city]',
      'address[zipCode]',
      'profilePic',
      'documents[0]',
      'documents[1][resume]',
      'documents[1][coverLetter]',
      'nullValue',
      'undefinedValue',
      'nestedArrays[0][0]',
      'nestedArrays[0][1]',
      'nestedArrays[1][0]',
      'nestedArrays[1][1][0]',
      'nestedArrays[1][1][1]',
    ];

    // @ts-expect-error - FormData does have keys() method
    const formDataKeys = Array.from(formData.keys());
    expect(formDataKeys.sort()).toEqual(expectedKeys.sort());
  });

  test('Adds form values to FormData on native formdata event', async () => {
    const formData = new FormData();

    await render({
      template: `
      <form v-bind="formProps" data-testid="form">
        <button type="submit">Submit</button>
      </form>
    `,
      setup() {
        const { formProps } = useForm({ initialValues: { foo: 'bar' } });

        return { formProps };
      },
    });

    const e = new Event('formdata');
    // @ts-expect-error - If only we can just new up a FormDataEvent
    e.formData = formData;
    await fireEvent(screen.getByTestId('form'), e);
    await flush();
    expect(formData.get('foo')).toBe('bar');
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

  test('can query if a field is dirty', async () => {
    const { form } = await renderSetup(
      () => {
        return { form: useForm<any>({ initialValues: { foo: 'bar' } }) };
      },
      () => {
        return { field: useFormField({ path: 'field' }) };
      },
    );

    expect(form.isFieldDirty('foo')).toBe(false);
    expect(form.isFieldDirty('field')).toBe(false);

    form.setFieldValue('foo', 'baz');
    form.setFieldValue('field', 'something');
    expect(form.isFieldDirty('foo')).toBe(true);
    expect(form.isFieldDirty('field')).toBe(true);
  });
});

describe('form validation', () => {
  describe('constraints API', () => {
    function createInputComponent(inputEl: Ref<HTMLInputElement | undefined>): Component {
      return {
        setup: () => {
          const field = useFormField({ path: 'test' });
          useInputValidity({ inputEl, field });

          return { input: inputEl, errorMessage: field.errorMessage };
        },
        template: `
          <input ref="input" data-testid="input" required />
          <span data-testid="err">{{ errorMessage }}</span>
        `,
      };
    }

    test('validates initially with native constraint API', async () => {
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

    test('prevents submission if the form is not valid', async () => {
      const input = ref<HTMLInputElement>();
      const handler = vi.fn();

      await render({
        components: { Child: createInputComponent(input) },
        setup() {
          const { handleSubmit } = useForm();

          return { onSubmit: handleSubmit(v => handler(v.toObject())) };
        },
        template: `
      <form @submit="onSubmit" novalidate>
        <Child />

        <button type="submit">Submit</button>
      </form>
    `,
      });

      // FIXME: Looks like it is possible to submit the form before the initial validation kicks in.
      await nextTick();
      await fireEvent.click(screen.getByText('Submit'));
      await flush();
      expect(handler).not.toHaveBeenCalled();
      await fireEvent.update(screen.getByTestId('input'), 'test');
      await fireEvent.click(screen.getByText('Submit'));
      await flush();
      expect(handler).toHaveBeenCalledOnce();
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
  });

  describe('Standard Schema', () => {
    function createInputComponent(): Component {
      return {
        inheritAttrs: false,
        setup: (_, { attrs }) => {
          const name = (attrs.name || 'test') as string;
          const schema = attrs.schema as StandardSchema<any>;
          const { errorMessage, inputProps } = useTextField({ name, label: name, schema });

          return { errorMessage: errorMessage, inputProps, name };
        },
        template: `
        <input v-bind="inputProps" :data-testid="name" />
        <span data-testid="err">{{ errorMessage }}</span>
      `,
      };
    }

    test('prevent submission if typed schema has errors', async () => {
      const handler = vi.fn();
      const schema = defineStandardSchema<any>(() => {
        return {
          issues: [{ path: ['test'], message: 'error' }],
        };
      });

      await render({
        setup() {
          const { handleSubmit } = useForm({
            schema,
          });

          return { onSubmit: handleSubmit(v => handler(v.toObject())) };
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

    test('sets field errors', async () => {
      const handler = vi.fn();
      let shouldError = true;
      const schema = defineStandardSchema<any>(() => {
        return {
          issues: shouldError ? [{ path: ['test'], message: 'error' }] : [],
        };
      });

      await render({
        components: { Child: createInputComponent() },
        setup() {
          const { handleSubmit, getError } = useForm({
            schema,
          });

          return { getError, onSubmit: handleSubmit(v => handler(v.toObject())) };
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
      await flush();
      expect(screen.getByTestId('err').textContent).toBe('error');
      expect(screen.getByTestId('form-err').textContent).toBe('error');
      expect(handler).not.toHaveBeenCalled();
      shouldError = false;
      await fireEvent.click(screen.getByText('Submit'));
      await flush();
      expect(handler).toHaveBeenCalledOnce();
    });

    test('clears errors on successful submission', async () => {
      const handler = vi.fn();
      const schema = defineStandardSchema<any>(() => {
        return {
          issues: [],
        };
      });

      await render({
        components: { Child: createInputComponent() },
        setup() {
          const { handleSubmit, getError, setFieldErrors } = useForm({
            schema,
          });

          setFieldErrors('test', 'error');

          return { getError, onSubmit: handleSubmit(v => handler(v.toObject())) };
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
      await flush();
      expect(handler).toHaveBeenCalledOnce();
      expect(screen.getByTestId('err').textContent).toBe('');
      expect(screen.getByTestId('form-err').textContent).toBe('');
    });

    test('parses values which is used on submission', async () => {
      const handler = vi.fn();
      const schema = defineStandardSchema<{ test: boolean; foo: string }>(() => {
        return {
          value: {
            test: true,
            foo: 'bar',
          },
        };
      });

      await render({
        components: { Child: createInputComponent() },
        setup() {
          const { handleSubmit, getError, setFieldErrors } = useForm({
            schema,
          });

          setFieldErrors('test', 'error');

          return { getError, onSubmit: handleSubmit(v => handler(v.toObject())) };
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
      await flush();
      expect(handler).toHaveBeenCalledOnce();
      expect(handler).toHaveBeenLastCalledWith({ test: true, foo: 'bar' });
    });

    test('re-validates on field value change', async () => {
      const schema = defineStandardSchema<{ test: string }>(value => {
        return {
          issues: !(value as any).test ? [{ path: ['test'], message: 'error' }] : [],
        };
      });

      await render({
        components: { Child: createInputComponent() },
        setup() {
          const { getError } = useForm({
            schema,
          });

          return { getError };
        },
        template: `
      <form>
        <Child />

        <span data-testid="form-err">{{ getError('test') }}</span>
      </form>
    `,
      });

      await flush();
      expect(screen.getByTestId('form-err').textContent).toBe('error');
      await fireEvent.update(screen.getByTestId('test'), 'test');
      await fireEvent.blur(screen.getByTestId('test'));
      await flush();
      expect(screen.getByTestId('form-err').textContent).toBe('');
    });

    // FIXME: Standard schema does not support defaults yet.
    test.fails('initializes with default values', async () => {
      const { values } = await renderSetup(() => {
        return useForm({
          // schema: {
          //   defaults: () => ({ test: 'foo' }),
          //   async parse() {
          //     return {
          //       errors: [],
          //     };
          //   },
          // },
        });
      });

      expect(values).toEqual({ test: 'foo' });
    });

    test('combines errors from field-level schemas', async () => {
      const handler = vi.fn();
      const schema = defineStandardSchema<{ test: string }>(() => {
        return {
          issues: [{ path: ['test'], message: 'error' }],
        };
      });

      const fieldSchema = defineStandardSchema<any>(() => {
        return {
          issues: [{ path: ['field'], message: 'field error' }],
        };
      });

      await render({
        components: { Child: createInputComponent() },
        setup() {
          const { handleSubmit, getError } = useForm({
            schema,
          });

          return { getError, onSubmit: handleSubmit(v => handler(v.toObject())), fieldSchema };
        },
        template: `
      <form @submit="onSubmit" novalidate>
      <Child />
      <Child name="field" :schema="fieldSchema" />
        <span data-testid="form-err">{{ getError('test') }}</span>
        <span data-testid="field-err">{{ getError('field') }}</span>

        <button type="submit">Submit</button>
      </form>
    `,
      });

      await fireEvent.click(screen.getByText('Submit'));
      await flush();
      expect(screen.getByTestId('form-err').textContent).toBe('error');
      expect(screen.getByTestId('field-err').textContent).toBe('field error');
      expect(handler).not.toHaveBeenCalled();
    });
  });

  test('form reset re-validates by default', async () => {
    const schema = defineStandardSchema<{ test: string }>(() => {
      return {
        issues: [{ path: ['test'], message: 'error' }],
      };
    });

    const { reset, getError } = await renderSetup(() => {
      return useForm({
        schema,
      });
    });

    await flush();
    expect(getError('test')).toBe('error');
    await reset();
    expect(getError('test')).toBe('error');
  });

  test('form reset revalidation can be disabled', async () => {
    let wasReset = false;
    const schema = defineStandardSchema<{ test: string }>(() => {
      return {
        issues: [{ path: ['test'], message: wasReset ? 'reset' : 'error' }],
      };
    });

    const { reset, getError } = await renderSetup(() => {
      return useForm({
        schema,
      });
    });

    await flush();
    expect(getError('test')).toBe('error');
    wasReset = true;
    await reset({ revalidate: false });
    expect(getError('test')).toBeUndefined();
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
});
