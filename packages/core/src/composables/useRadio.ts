import {
  InjectionKey,
  MaybeRefOrGetter,
  Ref,
  computed,
  inject,
  onBeforeUnmount,
  provide,
  reactive,
  ref,
  toValue,
} from 'vue';
import { createDescriptionProps, createErrorProps, createLabelProps, uniqId } from '../utils/common';
import { useInputValidity } from './useInputValidity';
import { useFieldValue } from './useFieldValue';
import { InputEvents, PressEvents } from '../types/common';

export interface RadioGroupContext<TValue> {
  name: string;
  disabled: boolean;
  readonly: boolean;
  required: boolean;

  readonly modelValue: TValue | undefined;
  setValidity(message: string): void;
  setValue(value: TValue): void;

  useRadioRegistration(radio: RadioItemContext): { canReceiveFocus(): boolean };
}

export interface RadioItemContext {
  isChecked(): boolean;
  isDisabled(): boolean;
  setChecked(): boolean;
}

export const RadioGroupKey: InjectionKey<RadioGroupContext<any>> = Symbol('RadioGroupKey');

export interface RadioGroupProps<TValue = string> {
  orientation?: MaybeRefOrGetter<'horizontal' | 'vertical'>;
  label: MaybeRefOrGetter<string>;
  description?: MaybeRefOrGetter<string>;

  name?: MaybeRefOrGetter<string>;
  modelValue?: MaybeRefOrGetter<TValue>;

  disabled?: MaybeRefOrGetter<boolean>;
  readonly?: MaybeRefOrGetter<boolean>;
  required?: MaybeRefOrGetter<boolean>;
}

const ORIENTATION_ARROWS: Record<'horizontal' | 'vertical', [string, string]> = {
  horizontal: ['ArrowLeft', 'ArrowRight'],
  vertical: ['ArrowUp', 'ArrowDown'],
};

export function useRadioGroup<TValue = string>(props: RadioGroupProps<TValue>) {
  const groupId = uniqId();
  const getOrientationArrows = () => ORIENTATION_ARROWS[toValue(props.orientation) ?? 'vertical'];

  const radios: RadioItemContext[] = [];
  const labelProps = createLabelProps(groupId);
  const descriptionProps = createDescriptionProps(groupId);
  const errorMessageProps = createErrorProps(groupId);
  const { fieldValue } = useFieldValue(toValue(props.modelValue));
  const { setValidity, errorMessage } = useInputValidity();

  function focusAndCheckNext() {
    const checkedIdx = radios.findIndex(radio => radio.isChecked());
    let nextCandidate: RadioItemContext | undefined;
    for (let i = checkedIdx + 1; i < radios.length; i++) {
      if (!radios[i].isDisabled()) {
        nextCandidate = radios[i];
        break;
      }
    }

    nextCandidate?.setChecked();
  }

  function focusAndCheckPrev() {
    const checkedIdx = radios.findIndex(radio => radio.isChecked());
    let prevCandidate: RadioItemContext | undefined;
    for (let i = checkedIdx - 1; i >= 0; i--) {
      if (!radios[i].isDisabled()) {
        prevCandidate = radios[i];
        break;
      }
    }

    prevCandidate?.setChecked();
  }

  const radioGroupProps = computed(() => {
    return {
      role: 'radiogroup',
      'aria-labelledby': labelProps.id,
      'aria-describedby': errorMessage.value
        ? errorMessageProps.id
        : props.description
          ? descriptionProps.id
          : undefined,
      'aria-invalid': errorMessage.value ? true : undefined,
      onKeydown(e: KeyboardEvent) {
        const [prev, next] = getOrientationArrows();

        if (e.key === next) {
          e.preventDefault();
          focusAndCheckNext();
          return;
        }

        if (e.key === prev) {
          e.preventDefault();
          focusAndCheckPrev();
          return;
        }
      },
    };
  });

  function setValue(value: TValue) {
    fieldValue.value = value;
  }

  function registerRadio(radio: RadioItemContext) {
    radios.push(radio);
  }

  function unregisterRadio(radio: RadioItemContext) {
    const idx = radios.indexOf(radio);
    if (idx >= 0) {
      radios.splice(idx, 1);
    }
  }

  function useRadioRegistration(radio: RadioItemContext) {
    registerRadio(radio);

    onBeforeUnmount(() => {
      unregisterRadio(radio);
    });

    return {
      canReceiveFocus() {
        return radios[0] === radio && fieldValue.value === undefined;
      },
    };
  }

  const context: RadioGroupContext<any> = reactive({
    name: computed(() => toValue(props.name) ?? groupId),
    disabled: computed(() => toValue(props.disabled) ?? false),
    readonly: computed(() => toValue(props.readonly) ?? false),
    required: computed(() => toValue(props.required) ?? false),
    modelValue: fieldValue,
    setValidity,
    setValue,
    useRadioRegistration,
  });

  provide(RadioGroupKey, context);

  return {
    labelProps,
    descriptionProps,
    errorMessageProps,
    fieldValue,
    radioGroupProps,
    errorMessage,
  };
}

export interface RadioFieldProps<TValue = string> {
  label: MaybeRefOrGetter<string>;
  value: TValue;

  disabled?: MaybeRefOrGetter<boolean>;
}

export function useRadioField<TValue = string>(
  props: RadioFieldProps<TValue>,
  elementRef?: Ref<HTMLInputElement | undefined>,
) {
  const inputId = uniqId();
  const group: RadioGroupContext<TValue> | null = inject(RadioGroupKey, null);
  const inputRef = elementRef || ref<HTMLInputElement>();
  const checked = computed(() => group?.modelValue === props.value);
  const labelProps = createLabelProps(inputId);

  const handlers: InputEvents & PressEvents = {
    onClick(e) {
      group?.setValue(props.value);
    },
    onKeydown(e) {
      if (e.code === 'Space') {
        e.preventDefault();
        group?.setValue(props.value);
      }
    },
  };

  const isDisabled = () => toValue(props.disabled || group?.disabled) ?? false;

  function focus() {
    inputRef.value?.focus();
  }

  function createBindings(isInput: boolean) {
    return {
      id: inputId,
      name: group?.name,
      [isInput ? 'checked' : 'aria-checked']: checked.value || undefined,
      [isInput ? 'readonly' : 'aria-readonly']: group?.readonly || undefined,
      [isInput ? 'disabled' : 'aria-disabled']: isDisabled() || undefined,
      [isInput ? 'required' : 'aria-required']: group?.required,
      'aria-labelledby': labelProps.id,
      ...handlers,
    };
  }

  const registration = group?.useRadioRegistration({
    isChecked: () => checked.value,
    isDisabled,
    setChecked: () => {
      group?.setValue(props.value);
      focus();

      return true;
    },
  });

  const inputProps = computed(() => ({
    type: 'radio',
    ...createBindings(true),
  }));

  const radioProps = computed(() => ({
    role: 'radio',
    ref: (element: any) => {
      inputRef.value = element;
    },
    tabindex: checked.value ? '0' : registration?.canReceiveFocus() ? '0' : '-1',
    ...createBindings(false),
  }));

  return {
    inputRef,
    labelProps,
    inputProps,
    radioProps,
    isChecked: checked,
  };
}
