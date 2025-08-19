import { shallowRef, toValue } from 'vue';
import { InputEvents, Reactivify } from '../types';
import { propsToValues, useCaptureProps } from '../utils/common';
import { TextControlProps } from './types';
import { useInputValidity } from '../validation';
import { FieldState } from '../useFieldState';
import { FormField } from '../useFormField';

interface FormControlContext {
  inputId: string;
  field?: FormField;
  state?: FieldState<string | undefined>;
}

export function useTextControl(props: Reactivify<TextControlProps>, ctx?: FormControlContext) {
  const { state, field } = ctx ?? {};
  const inputEl = shallowRef<HTMLInputElement>();

  if (state) {
    useInputValidity({ inputEl, field: state, disableHtmlValidation: props.disableHtmlValidation });
  }

  if (field) {
    field.registerControl({
      getControlElement: () => inputEl.value,
      getControlId: () => toValue(ctx?.inputId),
    });
  }

  const handlers: InputEvents = {
    onInput(evt) {
      state?.setValue((evt.target as HTMLInputElement).value);
    },
    onChange(evt) {
      state?.setValue((evt.target as HTMLInputElement).value);
    },
    onBlur() {
      state?.setTouched(true);
    },
  };

  const inputProps = useCaptureProps(() => {
    return {
      ...propsToValues(props, ['name', 'type', 'placeholder', 'autocomplete', 'required', 'readonly']),
      ...handlers,
      id: toValue(ctx?.inputId) ?? undefined,
      ...field?.accessibleErrorProps.value,
      ...field?.describedByProps.value,
      ...field?.labelledByProps.value,
      value: state?.fieldValue.value,
      maxlength: toValue(props.maxLength),
      minlength: toValue(props.minLength),
      disabled: (state?.isDisabled.value ?? toValue(props.disabled)) ? true : undefined,
      // Maybe we need to find a better way to serialize RegExp to a pattern string
      pattern: inputEl.value?.tagName === 'TEXTAREA' ? undefined : toValue(props.pattern)?.toString(),
    };
  }, inputEl);

  return {
    inputProps,
    inputEl,
  };
}
