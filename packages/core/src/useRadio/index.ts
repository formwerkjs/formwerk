import {
  InjectionKey,
  MaybeRefOrGetter,
  Ref,
  computed,
  inject,
  nextTick,
  onBeforeUnmount,
  provide,
  reactive,
  ref,
  toValue,
} from 'vue';
import { createDescribedByProps, createLabelProps, getNextCycleArrIdx, uniqId, withRefCapture } from '../utils/common';
import { useInputValidity } from '../composables/useInputValidity';
import { useFieldValue } from '../composables/useFieldValue';
import {
  AriaDescribableProps,
  AriaLabelableProps,
  AriaValidatableProps,
  InputBaseAttributes,
  InputEvents,
  PressEvents,
  RovingTabIndex,
} from '../types/common';

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

export type Direction = 'ltr' | 'rtl';

export interface RadioGroupProps<TValue = string> {
  orientation?: MaybeRefOrGetter<'horizontal' | 'vertical'>;
  dir?: MaybeRefOrGetter<'ltr' | 'rtl'>;
  label: MaybeRefOrGetter<string>;
  description?: MaybeRefOrGetter<string>;

  name?: MaybeRefOrGetter<string>;
  modelValue?: MaybeRefOrGetter<TValue>;

  disabled?: MaybeRefOrGetter<boolean>;
  readonly?: MaybeRefOrGetter<boolean>;
  required?: MaybeRefOrGetter<boolean>;
}

interface RadioGroupDomProps extends AriaLabelableProps, AriaDescribableProps, AriaValidatableProps {
  role: 'radiogroup';
  dir: Direction;
  onKeydown(e: KeyboardEvent): void;
}

const ORIENTATION_ARROWS: Record<'horizontal' | 'vertical', Record<Direction, string[]>> = {
  horizontal: { ltr: ['ArrowLeft', 'ArrowRight'], rtl: ['ArrowRight', 'ArrowLeft'] },
  vertical: { ltr: ['ArrowUp', 'ArrowDown'], rtl: ['ArrowUp', 'ArrowDown'] },
};

export function useRadioGroup<TValue = string>(props: RadioGroupProps<TValue>) {
  const groupId = uniqId();
  const getOrientationArrows = () =>
    ORIENTATION_ARROWS[toValue(props.orientation) ?? 'vertical'][toValue(props.dir) || 'ltr'];

  const radios: RadioItemContext[] = [];
  const labelProps = createLabelProps(groupId);
  const { fieldValue } = useFieldValue(toValue(props.modelValue));
  const { setValidity, errorMessage } = useInputValidity();
  const { describedBy, descriptionProps, errorMessageProps } = createDescribedByProps({
    inputId: groupId,
    errorMessage,
    description: props.description,
  });

  function handleArrowNext() {
    const currentIdx = radios.findIndex(radio => radio.isChecked());
    if (currentIdx < 0) {
      radios[0]?.setChecked();
      return;
    }

    const nextCandidate = radios[getNextCycleArrIdx(currentIdx + 1, radios)];
    nextCandidate?.setChecked();
  }

  function handleArrowPrevious() {
    const currentIdx = radios.findIndex(radio => radio.isChecked());
    if (currentIdx === -1) {
      radios[0]?.setChecked();
      return;
    }

    const prevCandidate = radios[getNextCycleArrIdx(currentIdx - 1, radios)];
    prevCandidate?.setChecked();
  }

  const radioGroupProps = computed<RadioGroupDomProps>(() => {
    return {
      dir: toValue(props.dir) ?? 'ltr',
      role: 'radiogroup',
      'aria-labelledby': labelProps.id,
      'aria-describedby': describedBy(),
      'aria-invalid': errorMessage.value ? true : undefined,
      onKeydown(e: KeyboardEvent) {
        const [prev, next] = getOrientationArrows();

        if (e.key === next) {
          e.preventDefault();
          handleArrowNext();
          return;
        }

        if (e.key === prev) {
          e.preventDefault();
          handleArrowPrevious();
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

export interface RadioFieldDomInputProps extends AriaLabelableProps, InputBaseAttributes {
  type: 'radio';
}

export interface RadioFieldDomProps extends AriaLabelableProps {
  tabindex: RovingTabIndex;
  'aria-checked'?: boolean;
  'aria-readonly'?: boolean;
  'aria-disabled'?: boolean;
  'aria-required'?: boolean;
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
    onChange() {
      group?.setValidity(inputRef.value?.validationMessage ?? '');
    },
    onInvalid() {
      group?.setValidity(inputRef.value?.validationMessage ?? '');
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
      nextTick(() => {
        group?.setValidity(inputRef.value?.validationMessage ?? '');
      });

      return true;
    },
  });

  const inputProps = computed<RadioFieldDomInputProps>(() =>
    withRefCapture(
      {
        type: 'radio',
        ...createBindings(true),
      },
      inputRef,
      elementRef,
    ),
  );

  const radioProps = computed<RadioFieldDomProps>(() =>
    withRefCapture(
      {
        role: 'radio',
        tabindex: checked.value ? '0' : registration?.canReceiveFocus() ? '0' : '-1',
        ...createBindings(false),
      },
      inputRef,
      elementRef,
    ),
  );

  return {
    inputRef,
    labelProps,
    inputProps,
    radioProps,
    isChecked: checked,
  };
}
