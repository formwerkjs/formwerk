import { computed, toValue } from 'vue';
import {
  AriaDescribableProps,
  AriaLabelableProps,
  AriaValidatableProps,
  InputEvents,
  Reactivify,
  TextInputBaseAttributes,
} from '../types';
import { hasKeyCode, normalizeProps } from '../utils/common';
import { useFormField, exposeField, FieldBaseProps } from '../useFormField';
import { registerField } from '@formwerk/devtools';
import { useTextControl } from '../useTextField/useTextControl';
import { TextControlProps } from '../useTextField/types';

export interface SearchInputDOMAttributes extends TextInputBaseAttributes {
  type?: 'search';
}

export interface SearchInputDOMProps
  extends SearchInputDOMAttributes,
    AriaLabelableProps,
    AriaDescribableProps,
    AriaValidatableProps,
    InputEvents {
  id: string;
}

export interface SearchFieldProps extends Omit<TextControlProps, 'type'>, FieldBaseProps<string> {
  /**
   * The label text for the clear button.
   */
  clearButtonLabel?: string;

  /**
   * Handler called when the search field is submitted via the Enter key.
   */
  onSubmit?: (value: string) => void;

  /**
   * Whether to disable HTML5 form validation.
   */
  // eslint-disable-next-line @typescript-eslint/no-wrapper-object-types
  disableHtmlValidation?: Boolean;
}

export function useSearchField(_props: Reactivify<SearchFieldProps, 'onSubmit' | 'schema'>) {
  const props = normalizeProps(_props, ['onSubmit', 'schema']);
  const field = useFormField<string | undefined>({
    label: props.label,
    description: props.description,
    path: props.name,
    initialValue: toValue(props.modelValue) ?? toValue(props.value),
    disabled: props.disabled,
    schema: props.schema,
    // TODO: Remove once all fields have controls
    syncModel: false,
  });

  function clear() {
    field.setValue('');
    field.setTouched(true);
    field.validate();
  }

  const { inputEl, inputProps } = useTextControl(
    {
      ...props,
      type: 'search',
    },
    {
      field,
      on: {
        onKeydown(e: Event) {
          if (hasKeyCode(e, 'Escape')) {
            e.preventDefault();
            if (isMutable()) {
              clear();
            }

            return;
          }

          if (hasKeyCode(e, 'Enter') && !inputEl.value?.form && props.onSubmit) {
            e.preventDefault();
            field.setTouched(true);
            if (field.isValid.value) {
              props.onSubmit(field.fieldValue.value || '');
            }
          }
        },
      },
    },
  );

  const isMutable = () => !toValue(props.readonly) && !field.isDisabled.value;

  const clearBtnProps = computed(() => {
    return {
      tabindex: '-1',
      type: 'button' as const,
      ariaLabel: toValue(props.clearButtonLabel) ?? 'Clear search',
      onClick() {
        if (isMutable()) {
          clear();
        }
      },
    };
  });

  if (__DEV__) {
    registerField(field, 'Search');
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

      /**
       * Props for the clear button.
       */
      clearBtnProps,
    },
    field,
  );
}
