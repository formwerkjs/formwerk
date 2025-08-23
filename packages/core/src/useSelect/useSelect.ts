import { toValue } from 'vue';
import { useFormField, exposeField } from '../useFormField';
import { Arrayable, Reactivify } from '../types';
import { normalizeProps } from '../utils/common';
import { registerField } from '@formwerk/devtools';
import { SelectControlProps, useSelectControl } from './useSelectControl';

export interface SelectProps<TOption, TValue = TOption> extends SelectControlProps<TValue> {
  /**
   * The label text for the select field.
   */
  label: string;

  /**
   * Description text for the select field.
   */
  description?: string;
}

export function useSelect<TOption, TValue = TOption>(_props: Reactivify<SelectProps<TOption, TValue>, 'schema'>) {
  const props = normalizeProps(_props, ['schema']);
  const field = useFormField<Arrayable<TValue>>({
    label: props.label,
    description: props.description,
    path: props.name,
    initialValue: (toValue(props.modelValue) ?? toValue(props.value)) as Arrayable<TValue>,
    disabled: props.disabled,
    schema: props.schema,
    syncModel: false,
  });

  const { isPopupOpen, triggerProps, listBoxProps, listBoxEl, selectedOption, selectedOptions } = useSelectControl<
    TOption,
    TValue
  >(props as Reactivify<SelectControlProps<TValue>, 'schema'>, { field });

  if (__DEV__) {
    registerField(field, 'Select');
  }

  return exposeField(
    {
      /**
       * Whether the popup is open.
       */
      isPopupOpen,
      /**
       * Props for the trigger element.
       */
      triggerProps,
      /**
       * Props for the label element.
       */
      labelProps: field.labelProps,
      /**
       * Props for the listbox/popup element.
       */
      listBoxProps,
      /**
       * Props for the error message element.
       */
      errorMessageProps: field.errorMessageProps,
      /**
       * Props for the description element.
       */
      descriptionProps: field.descriptionProps,
      /**
       * Reference to the popup element.
       */
      listBoxEl,
      /**
       * The currently selected option.
       */
      selectedOption,
      /**
       * The currently selected options.
       */
      selectedOptions,
    },
    field,
  );
}
