import { MaybeRefOrGetter, Ref, computed, ref, toValue } from 'vue';
import {
  AriaDescribableProps,
  AriaLabelableProps,
  AriaValidatableProps,
  InputEvents,
  Numberish,
  TextInputBaseAttributes,
} from '@core/types/common';
import { createDescribedByProps, createLabelProps, propsToValues, uniqId, withRefCapture } from '@core/utils/common';
import { useFieldValue } from '@core/composables/useFieldValue';
import { useInputValidity } from '@core/composables/useInputValidity';
import { useSyncModel } from '@core/composables/useModelSync';

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

export interface SearchFieldProps {
  label: MaybeRefOrGetter<string>;
  modelValue?: MaybeRefOrGetter<string>;
  description?: MaybeRefOrGetter<string>;

  onSubmit?: (value: string) => void;

  // TODO: Vue cannot resolve these types if they are mapped from up there
  name?: MaybeRefOrGetter<string>;
  value?: MaybeRefOrGetter<string>;
  maxLength?: MaybeRefOrGetter<Numberish>;
  minLength?: MaybeRefOrGetter<Numberish>;
  pattern?: MaybeRefOrGetter<string | undefined>;
  placeholder?: MaybeRefOrGetter<string | undefined>;

  required?: MaybeRefOrGetter<boolean>;
  readonly?: MaybeRefOrGetter<boolean>;
  disabled?: MaybeRefOrGetter<boolean>;
}

export function useSearchField(props: SearchFieldProps, elementRef?: Ref<HTMLInputElement>) {
  const inputId = uniqId();
  const inputRef = elementRef || ref<HTMLInputElement>();

  const { fieldValue } = useFieldValue<string>(toValue(props.modelValue));
  const { errorMessage, onInvalid, updateValidity, validityDetails, isInvalid } = useInputValidity(inputRef);

  useSyncModel({
    model: fieldValue,
    onModelPropUpdated: value => {
      fieldValue.value = value;
    },
  });

  const { labelProps, labelledByProps } = createLabelProps(inputId, props.label);
  const { errorMessageProps, descriptionProps, describedBy } = createDescribedByProps({
    inputId,
    errorMessage,
    description: props.description,
  });

  const clearBtnProps = {
    tabindex: '-1',
    type: 'button' as const,
    ariaLabel: 'Clear search',
    onClick() {
      fieldValue.value = '';
      updateValidity();
    },
  };

  const handlers: InputEvents = {
    onInput: (event: Event) => {
      fieldValue.value = (event.target as HTMLInputElement).value;
      updateValidity();
    },
    onChange: (event: Event) => {
      fieldValue.value = (event.target as HTMLInputElement).value;
      updateValidity();
    },
    onBlur() {
      updateValidity();
    },
    onKeydown(e: KeyboardEvent) {
      if (e.key === 'Escape') {
        e.preventDefault();
        fieldValue.value = '';
        updateValidity();
      }

      if (e.key === 'Enter' && !inputRef.value?.form && props.onSubmit) {
        e.preventDefault();
        if (!isInvalid.value) {
          props.onSubmit(fieldValue.value || '');
        }
      }
    },
    onInvalid,
  };

  const inputProps = computed<SearchInputDOMProps>(() =>
    withRefCapture(
      {
        ...propsToValues(props, ['name', 'pattern', 'placeholder', 'required', 'readonly', 'disabled']),
        ...labelledByProps(),
        id: inputId,
        value: fieldValue.value,
        type: 'search',
        maxlength: toValue(props.maxLength),
        minlength: toValue(props.minLength),
        'aria-describedby': describedBy(),
        'aria-invalid': errorMessage.value ? true : undefined,
        ...handlers,
      },
      inputRef,
      elementRef,
    ),
  );

  return {
    inputRef,
    inputProps,
    labelProps,
    fieldValue,
    errorMessage,
    errorMessageProps,
    descriptionProps,
    clearBtnProps,
    validityDetails,
    isInvalid,
  };
}
