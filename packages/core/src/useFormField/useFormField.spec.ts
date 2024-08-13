import { renderSetup } from '@test-utils/index';
import { useFormField } from './useFormField';
import { useForm } from '../useForm/useForm';
import { nextTick } from 'vue';

test('it initializes the field value', async () => {
  const { fieldValue } = await renderSetup(() => {
    return useFormField({ path: 'field', initialValue: 'bar' });
  });

  expect(fieldValue.value).toBe('bar');
});

test('it initializes the field value in a form', async () => {
  const { form } = await renderSetup(
    () => {
      const form = useForm();

      return { form };
    },
    () => {
      const field = useFormField({ path: 'field', initialValue: 'bar' });

      return { field };
    },
  );

  expect(form.values).toEqual({ field: 'bar' });
});

test('overrides the initial value in the form with its own', async () => {
  const { form } = await renderSetup(
    () => {
      const form = useForm({ initialValues: { field: 'foo' } });

      return { form };
    },
    () => {
      const field = useFormField({ path: 'field', initialValue: 'bar' });

      return { field };
    },
  );

  expect(form.values).toEqual({ field: 'bar' });
});

test('obtains the initial value from the form', async () => {
  const { field } = await renderSetup(
    () => {
      const form = useForm({ initialValues: { field: 'foo' } });

      return { form };
    },
    () => {
      const field = useFormField({ path: 'field' });

      return { field };
    },
  );

  expect(field.fieldValue.value).toBe('foo');
});

test('pathless field do not write to the form', async () => {
  const { form } = await renderSetup(
    () => {
      const form = useForm();

      return { form };
    },
    () => {
      const field = useFormField({ initialValue: 'bar' });

      return { field };
    },
  );

  expect(form.values).toEqual({});
});

test('pathless field maintains its own touched state', async () => {
  const { isTouched, setTouched } = await renderSetup(() => {
    return useFormField({ initialValue: 'bar' });
  });

  expect(isTouched.value).toBe(false);
  setTouched(true);
  expect(isTouched.value).toBe(true);
});

test('formless fields maintain their own dirty state', async () => {
  const { isDirty, setValue } = await renderSetup(() => {
    return useFormField({ initialValue: 'bar' });
  });

  expect(isDirty.value).toBe(false);
  setValue('foo');
  expect(isDirty.value).toBe(true);
  setValue('bar');
  expect(isDirty.value).toBe(false);
});

test('formless fields maintain their own error state', async () => {
  const { setErrors, isValid, errorMessage, errors } = await renderSetup(() => {
    return useFormField({ initialValue: 'bar' });
  });

  expect(isValid.value).toBe(true);
  expect(errorMessage.value).toBe('');
  expect(errors.value).toEqual([]);
  setErrors('error');

  expect(isValid.value).toBe(false);
  expect(errorMessage.value).toBe('error');
  expect(errors.value).toEqual(['error']);
});

test('can have a typed schema for validation', async () => {
  const { validate, errors } = await renderSetup(() => {
    return useFormField({
      initialValue: 'bar',
      schema: {
        parse: async () => {
          return { errors: [{ messages: ['error'], path: 'field' }] };
        },
      },
    });
  });

  expect(errors.value).toEqual([]);
  await validate(true);
  expect(errors.value).toEqual(['error']);
});

test('can have a typed schema for initial value', async () => {
  const { fieldValue } = await renderSetup(() => {
    return useFormField({
      schema: {
        parse: async () => {
          return { errors: [] };
        },
        defaults(value) {
          return value || 'default';
        },
      },
    });
  });

  await nextTick();
  expect(fieldValue.value).toEqual('default');
});
