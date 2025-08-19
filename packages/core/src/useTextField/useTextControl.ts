import { shallowRef, toValue } from 'vue';
import { InputEvents, Reactivify } from '../types';
import { FormField } from '../useFieldState';
import { propsToValues, useCaptureProps, useUniqId } from '../utils/common';
import { TextControlProps } from './types';
import { useInputValidity } from '../validation';
import { FieldTypePrefixes } from '../constants';

interface FormControlContext {
  inputId: string;
  field?: FormField<string | undefined>;
}

export function useTextControl(props: Reactivify<TextControlProps>, ctx?: FormControlContext) {
  const { field } = ctx ?? {};
  const inputEl = shallowRef<HTMLInputElement>();
  const inputId = toValue(ctx?.inputId) ?? useUniqId(FieldTypePrefixes.TextField);

  if (field) {
    useInputValidity({ inputEl, field, disableHtmlValidation: props.disableHtmlValidation });
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
    inputProps,
    inputId,
    inputEl,
  };
}
