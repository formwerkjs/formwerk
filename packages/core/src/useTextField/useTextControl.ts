import { shallowRef, toValue } from 'vue';
import { InputEvents, Reactivify } from '../types';
import { normalizeProps, propsToValues, useCaptureProps, useUniqId } from '../utils/common';
import { TextControlProps } from './types';
import { useInputValidity } from '../validation';
import { FormField, useFormFieldContext } from '../useFormField';
import { FieldTypePrefixes } from '../constants';
import { useVModelProxy } from '../reactivity/useVModelProxy';

interface FormControlContext {
  // oxlint-disable-next-line no-explicit-any
  field?: FormField<any>;
}

export function useTextControl(_props: Reactivify<TextControlProps>, ctx?: FormControlContext) {
  const inputEl = shallowRef<HTMLInputElement>();
  const inputId = useUniqId(FieldTypePrefixes.TextField);
  const props = normalizeProps(_props);
  const field = ctx?.field ?? useFormFieldContext();
  const data = useVModelProxy(field);

  if (field) {
    useInputValidity({
      inputEl,
      field,
      disableHtmlValidation: props.disableHtmlValidation,
      events: () => toValue(props.validateOn) ?? ['change', 'blur'],
    });

    field.registerControl({
      getControlElement: () => inputEl.value,
      getControlId: () => inputId,
    });
  }

  const handlers: InputEvents = {
    onInput(evt) {
      field?.setValue((evt.target as HTMLInputElement).value);
    },
    onChange(evt) {
      field?.setValue((evt.target as HTMLInputElement).value);
    },
    onBlur() {
      field?.setTouched(true);
    },
  };

  const inputProps = useCaptureProps(() => {
    return {
      ...propsToValues(props, ['name', 'type', 'placeholder', 'autocomplete', 'required', 'readonly']),
      ...handlers,
      id: inputId,
      ...field?.accessibleErrorProps.value,
      ...field?.describedByProps.value,
      ...field?.labelledByProps.value,
      value: field?.fieldValue.value,
      maxlength: toValue(props.maxLength),
      minlength: toValue(props.minLength),
      disabled: (field?.isDisabled.value ?? toValue(props.disabled)) ? true : undefined,
      // Maybe we need to find a better way to serialize RegExp to a pattern string
      pattern: inputEl.value?.tagName === 'TEXTAREA' ? undefined : toValue(props.pattern)?.toString(),
    };
  }, inputEl);

  return {
    /**
     * Props for the input element.
     */
    inputProps,
    /**
     * Ref to the input element.
     */
    inputEl,
    /**
     * A ref containing the model value.
     */
    data,
  };
}
