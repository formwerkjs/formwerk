import { toValue } from 'vue';
import { registerField } from '@formwerk/devtools';
import { normalizeProps, useUniqId } from '../utils/common';
import { Reactivify } from '../types/common';
import { useFormField, exposeField } from '../useFormField';
import { TextControlProps } from './types';
import { useTextControl } from './useTextControl';
import { FieldTypePrefixes } from '../constants';

export interface TextFieldProps extends TextControlProps {
  /**
   * The label of the text field.
   */
  label: string;
  /**
   * Description text that provides additional context about the field.
   */
  description?: string;
}

export function useTextField(_props: Reactivify<TextFieldProps, 'schema'>) {
  const props = normalizeProps(_props, ['schema']);
  const inputId = useUniqId(FieldTypePrefixes.TextField);
  const field = useFormField<string | undefined>({
    path: props.name,
    initialValue: toValue(props.modelValue) ?? toValue(props.value),
    disabled: props.disabled,
    schema: props.schema,
  });

  const { descriptionProps, describedByProps } = useDescription({
    inputId: init.inputId,
    description: init.description,
  });

  const { accessibleErrorProps, errorMessageProps } = useErrorMessage({
    inputId: init.inputId,
    errorMessage: errorMessage,
  });

  const { labelProps, labelledByProps } = useLabel({
    for: init.inputId,
    label: init.label,
    targetRef: () => controlContext.value?.inputEl.value,
  });

  const { inputEl, inputProps } = useTextControl(props, { field, inputId });

  if (__DEV__) {
    registerField(field, 'Text');
  }

  return exposeField(
    {
      /**
       * Reference to the input element.
       */
      inputEl,
      /**
       * Props for the input element.
       */
      inputProps,
    },
    field,
  );
}
