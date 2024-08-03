import { FormField } from './useFormField';

export function useErrorDisplay(field: FormField<any>) {
  function displayError(msg?: string) {
    const error = msg || field.errorMessage.value;

    return field.isTouched.value ? error : '';
  }

  return { displayError };
}
