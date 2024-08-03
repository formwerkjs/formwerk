import { FormField } from './useFormField';

export function useErrorDisplay(field: FormField<any>) {
  function displayError() {
    return field.isTouched.value ? field.errorMessage.value : '';
  }

  return { displayError };
}
