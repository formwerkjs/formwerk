import { FormField } from '../useFormField';

export function exposeField<TValue>(field: FormField<TValue>) {
  return {
    displayError: field.displayError,
    errorMessage: field.errorMessage,
    errors: field.errors,
    fieldValue: field.fieldValue,
    isDirty: field.isDirty,
    isTouched: field.isTouched,
    isValid: field.isValid,
    isDisabled: field.isDisabled,
    setErrors: field.setErrors,
    setTouched: field.setTouched,
    setValue: field.setValue,
  };
}
