import { renderSetup, defineStandardSchema } from '@test-utils/index';
import { exposeField, useFormField } from './useFormField';
import { useForm } from '../useForm/useForm';
import { ref } from 'vue';

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
      schema: defineStandardSchema(async () => {
        return { issues: [{ message: 'error', path: ['field'] }] };
      }),
    });
  });

  expect(errors.value).toEqual([]);
  await validate(true);
  expect(errors.value).toEqual(['error']);
});

test('disabled fields report isValid as true and errors as empty after being invalid', async () => {
  const disabled = ref(false);
  const { validate, isValid, errors, errorMessage } = await renderSetup(() => {
    return useFormField({
      initialValue: 'bar',
      disabled,
      schema: defineStandardSchema(async () => {
        return { issues: [{ message: 'error', path: ['field'] }] };
      }),
    });
  });

  // Initially validate to make the field invalid
  await validate(true);
  expect(isValid.value).toBe(false);
  expect(errors.value).toEqual(['error']);
  expect(errorMessage.value).toBe('error');

  // Disable the field
  disabled.value = true;

  // Check the state after disabling
  expect(isValid.value).toBe(true);
  expect(errors.value).toEqual([]);
  expect(errorMessage.value).toBe('');
});

test('setErrors warns when trying to set errors on a disabled field', async () => {
  const disabled = ref(true);
  const consoleWarnSpy = vi.spyOn(console, 'warn').mockImplementation(() => {});
  const { isValid, errors, errorMessage, setErrors } = await renderSetup(() => {
    return exposeField(
      {},
      useFormField({
        initialValue: 'bar',
        disabled,
        schema: defineStandardSchema(async () => {
          return { issues: [{ message: 'error', path: ['field'] }] };
        }),
      }),
    );
  });

  // Attempt to set errors on a disabled field
  setErrors('error');

  // Check that a warning was logged
  expect(consoleWarnSpy).toHaveBeenCalledOnce();

  // Check the state, errors should not be set
  expect(isValid.value).toBe(true);
  expect(errors.value).toEqual([]);
  expect(errorMessage.value).toBe('');

  // Enable the field
  disabled.value = false;

  // Check the state, errors should be set
  expect(isValid.value).toBe(false);
  expect(errors.value).toEqual(['error']);
  expect(errorMessage.value).toBe('error');

  // Clean up the mock
  consoleWarnSpy.mockRestore();
});

test('validate warns and skips validation on a disabled field', async () => {
  const consoleWarnSpy = vi.spyOn(console, 'warn').mockImplementation(() => {});
  const schemaSpy = vi.fn(async () => {
    return { issues: [{ message: 'error', path: ['field'] }] };
  });

  const { validate, errors } = await renderSetup(() => {
    return useFormField({
      initialValue: 'bar',
      disabled: true,
      schema: defineStandardSchema(schemaSpy),
    });
  });

  // Attempt to validate the disabled field
  await validate(true);

  // Check that a warning was logged
  expect(consoleWarnSpy).toHaveBeenCalledOnce();

  // Ensure no errors were set
  expect(errors.value).toEqual([]);

  // Ensure the schema function was called because we don't want the integrity of the schema to be compromised
  expect(schemaSpy).toHaveBeenCalled();

  // Clean up the mocks
  consoleWarnSpy.mockRestore();
});
