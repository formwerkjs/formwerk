import { FormField } from '../useFormField';
import { StandardSchema } from './forms';

export interface ControlApi {
  getControlElement(): HTMLElement | undefined;
  getControlId(): string | undefined;
}

export interface ControlProps<TValue = unknown, TInitialValue = TValue> {
  /**
   * The name of the field.
   */
  name?: string;

  /**
   * The field to use for the control. Internal usage only.
   */
  _field?: FormField<TValue | undefined>;

  /**
   * Schema for field validation.
   */
  schema?: StandardSchema<TValue>;

  /**
   * The v-model value of the field.
   */
  modelValue?: TValue | undefined;

  /**
   * The initial value of the field.
   */
  value?: TInitialValue;

  /**
   * Whether the field is disabled.
   */
  disabled?: boolean;

  /**
   * Whether the field is required.
   */
  required?: boolean;
}
