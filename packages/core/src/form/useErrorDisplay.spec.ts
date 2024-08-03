import { renderSetup } from '@test-utils/index';
import { useErrorDisplay } from './useErrorDisplay';
import { useFormField } from './useFormField';

test('displays field errors only if they are touched', async () => {
  const { setErrors, isValid, errorMessage, displayError, setTouched } = await renderSetup(() => {
    const field = useFormField({ initialValue: 'bar' });
    const { displayError } = useErrorDisplay(field);

    return { ...field, displayError };
  });

  expect(isValid.value).toBe(true);
  expect(errorMessage.value).toBe('');
  expect(displayError()).toBe('');

  setErrors('error');
  expect(errorMessage.value).toBe('error');
  expect(displayError()).toBe('');
  expect(isValid.value).toBe(false);

  setTouched(true);
  expect(displayError()).toBe('error');
});
