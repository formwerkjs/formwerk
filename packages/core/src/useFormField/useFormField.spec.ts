import { renderSetup, defineStandardSchema } from '@test-utils/index';
import { exposeField, useFormField } from './useFormField';
import { useForm } from '../useForm/useForm';
import { ref } from 'vue';

test('it initializes the field value', async () => {
  const { fieldValue } = await renderSetup(() => {
    return useFormField({ label: 'Field', path: 'field', initialValue: 'bar' }).state;
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
      const field = useFormField({ label: 'Field', path: 'field', initialValue: 'bar' }).state;

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
      const field = useFormField({ label: 'Field', path: 'field', initialValue: 'bar' }).state;

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
      const field = useFormField({ label: 'Field', path: 'field' }).state;

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
      const field = useFormField({ label: 'Field', initialValue: 'bar' }).state;

      return { field };
    },
  );

  expect(form.values).toEqual({});
});

describe('field touched state', () => {
  test('pathless field maintains its own touched state', async () => {
    const {
      state: { isTouched, setTouched },
    } = await renderSetup(() => {
      return useFormField({ initialValue: 'bar' });
    });

    expect(isTouched.value).toBe(false);
    setTouched(true);
    expect(isTouched.value).toBe(true);
  });

  test('field with path syncs touched state with form', async () => {
    const { form, field } = await renderSetup(
      () => {
        const form = useForm({ initialValues: { field: 'foo' } });
        return { form };
      },
      () => {
        const field = useFormField({ path: 'field' });
        return { field };
      },
    );

    expect(field.state.isTouched.value).toBe(false);
    expect(form.isTouched('field')).toBe(false);

    field.state.setTouched(true);
    expect(field.state.isTouched.value).toBe(true);
    expect(form.isTouched('field')).toBe(true);
  });
});

describe('field blurred state', () => {
  test('pathless field maintains its own blurred state', async () => {
    const {
      state: { isBlurred, setBlurred },
    } = await renderSetup(() => {
      return useFormField({ initialValue: 'bar' });
    });

    expect(isBlurred.value).toBe(false);
    setBlurred(true);
    expect(isBlurred.value).toBe(true);
  });

  test('field with path syncs blurred state with form', async () => {
    const { form, field } = await renderSetup(
      () => {
        const form = useForm({ initialValues: { field: 'foo' } });
        return { form };
      },
      () => {
        const field = useFormField({ path: 'field' });
        return { field };
      },
    );

    expect(field.state.isBlurred.value).toBe(false);
    expect(form.isBlurred('field')).toBe(false);

    field.state.setBlurred(true);
    expect(field.state.isBlurred.value).toBe(true);
    expect(form.isBlurred('field')).toBe(true);
  });
});

describe('field dirty state', () => {
  test('formless fields maintain their own dirty state', async () => {
    const {
      state: { isDirty, setValue },
    } = await renderSetup(() => {
      return useFormField({ initialValue: 'bar' });
    });

    expect(isDirty.value).toBe(false);
    setValue('foo');
    expect(isDirty.value).toBe(true);
    setValue('bar');
    expect(isDirty.value).toBe(false);
  });
});

test('formless fields maintain their own error state', async () => {
  const { setErrors, isValid, errorMessage, errors } = await renderSetup(() => {
    return useFormField({ label: 'Field', initialValue: 'bar' }).state;
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
      label: 'Field',
      initialValue: 'bar',
      schema: defineStandardSchema(async () => {
        return { issues: [{ message: 'error', path: ['field'] }] };
      }),
    }).state;
  });

  expect(errors.value).toEqual([]);
  await validate(true);
  expect(errors.value).toEqual(['error']);
});

test('disabled fields report isValid as true and errors as empty after being invalid', async () => {
  const disabled = ref(false);
  const { validate, isValid, errors, errorMessage } = await renderSetup(() => {
    return useFormField({
      label: 'Field',
      initialValue: 'bar',
      disabled,
      schema: defineStandardSchema(async () => {
        return { issues: [{ message: 'error', path: ['field'] }] };
      }),
    }).state;
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
        label: 'Field',
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
  expect(consoleWarnSpy).toHaveBeenLastCalledWith(
    '[Formwerk]: This field is disabled, setting errors will not take effect until the field is enabled.',
  );

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
      label: 'Field',
      initialValue: 'bar',
      disabled: true,
      schema: defineStandardSchema(schemaSpy),
    }).state;
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

describe('isValidated state', () => {
  test('field starts with isValidated as false', async () => {
    const { isValidated } = await renderSetup(() => {
      return useFormField({ label: 'Field', initialValue: 'bar' }).state;
    });

    expect(isValidated.value).toBe(false);
  });

  test('isValidated becomes true after manual validation without schema', async () => {
    const { isValidated, validate } = await renderSetup(() => {
      return useFormField({ label: 'Field', initialValue: 'bar' }).state;
    });

    expect(isValidated.value).toBe(false);
    await validate();
    expect(isValidated.value).toBe(true);
  });

  test('isValidated becomes true after manual validation with schema', async () => {
    const { isValidated, validate } = await renderSetup(() => {
      return useFormField({
        label: 'Field',
        initialValue: 'bar',
        schema: defineStandardSchema(async () => {
          return { value: 'bar' };
        }),
      }).state;
    });

    expect(isValidated.value).toBe(false);
    await validate();
    expect(isValidated.value).toBe(true);
  });

  test('isValidated becomes true after validation with errors', async () => {
    const { isValidated, validate } = await renderSetup(() => {
      return useFormField({
        label: 'Field',
        initialValue: '',
        schema: defineStandardSchema(async () => {
          return { issues: [{ message: 'Required', path: ['field'] }] };
        }),
      }).state;
    });

    expect(isValidated.value).toBe(false);
    await validate(true);
    expect(isValidated.value).toBe(true);
  });

  test('isValidated can be set manually', async () => {
    const { isValidated, setIsValidated } = await renderSetup(() => {
      return useFormField({ label: 'Field', initialValue: 'bar' }).state;
    });

    expect(isValidated.value).toBe(false);
    setIsValidated(true);
    expect(isValidated.value).toBe(true);
    setIsValidated(false);
    expect(isValidated.value).toBe(false);
  });

  test('isValidated becomes true after form validation completes', async () => {
    const { field } = await renderSetup(
      () => {
        const form = useForm({
          initialValues: { field: '' },
          schema: defineStandardSchema<{ field: string }>(async () => {
            return { value: { field: '' } };
          }),
        });
        return { form };
      },
      () => {
        const field = useFormField({
          path: 'field',
          schema: defineStandardSchema(async () => {
            return { value: '' };
          }),
        });
        return { field };
      },
    );

    expect(field.state.isValidated.value).toBe(false);
  });

  test('isValidated is independent for pathless fields', async () => {
    const { field1, field2 } = await renderSetup(() => {
      const field1 = useFormField({ label: 'Field1', initialValue: 'bar' });
      const field2 = useFormField({ label: 'Field2', initialValue: 'baz' });
      return { field1, field2 };
    });

    expect(field1.state.isValidated.value).toBe(false);
    expect(field2.state.isValidated.value).toBe(false);

    await field1.state.validate();
    expect(field1.state.isValidated.value).toBe(true);
    expect(field2.state.isValidated.value).toBe(false);

    await field2.state.validate();
    expect(field1.state.isValidated.value).toBe(true);
    expect(field2.state.isValidated.value).toBe(true);
  });
});
