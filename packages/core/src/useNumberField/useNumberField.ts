import { toValue } from 'vue';
import { fromNumberish, normalizeProps } from '../utils/common';
import { AriaDescribableProps, AriaLabelableProps, InputEvents, AriaValidatableProps, Reactivify } from '../types';
import { exposeField, FieldBaseProps, useFormField } from '../useFormField';
import { registerField } from '@formwerk/devtools';
import { NumberControlProps, useNumberControl } from './useNumberControl';

export interface NumberInputDOMAttributes {
  name?: string;
}

export interface NumberInputDOMProps
  extends NumberInputDOMAttributes,
    AriaLabelableProps,
    AriaDescribableProps,
    AriaValidatableProps,
    InputEvents {
  id: string;
}

export type NumberFieldProps = NumberControlProps & FieldBaseProps<number>;

export function useNumberField(_props: Reactivify<NumberFieldProps, 'schema'>) {
  const props = normalizeProps(_props, ['schema']);
  const field = useFormField<number>({
    label: props.label,
    description: props.description,
    path: props.name,
    initialValue: toValue(props.modelValue) ?? fromNumberish(props.value),
    disabled: props.disabled,
    schema: props.schema,
    // TODO: Remove once all fields have controls
    syncModel: false,
  });

  const control = useNumberControl(props, { field });

  if (__DEV__) {
    registerField(field, 'Number');
  }

  return exposeField(
    {
      ...control,
      /**
       * Props for the label element.
       */
      labelProps: field.labelProps,
      /**
       * Props for the description element.
       */
      descriptionProps: field.descriptionProps,

      /**
       * Props for the error message element.
       */
      errorMessageProps: field.errorMessageProps,
    },
    field,
  );
}
