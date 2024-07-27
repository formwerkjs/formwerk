import { renderSetup } from '@test-utils/index';
import { useFormField } from './useFormField';
import { useForm } from './useForm';

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
