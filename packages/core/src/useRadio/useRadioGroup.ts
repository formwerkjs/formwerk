import { InjectionKey, toValue, computed, onBeforeUnmount, reactive, provide } from 'vue';
import { useFieldValue } from '../composables/useFieldValue';
import { useInputValidity } from '../composables/useInputValidity';
import { useLabel } from '../composables/useLabel';
import { useSyncModel } from '../composables/useModelSync';
import {
  Orientation,
  AriaLabelableProps,
  AriaDescribableProps,
  AriaValidatableProps,
  Direction,
  Reactivify,
} from '../types';
import { uniqId, createDescribedByProps, getNextCycleArrIdx } from '../utils/common';

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
  orientation?: Orientation;
  dir?: 'ltr' | 'rtl';
  label: string;
  description?: string;

  name?: string;
  modelValue?: TValue;

  disabled?: boolean;
  readonly?: boolean;
  required?: boolean;
}

interface RadioGroupDomProps extends AriaLabelableProps, AriaDescribableProps, AriaValidatableProps {
  role: 'radiogroup';
  dir: Direction;
  onKeydown(e: KeyboardEvent): void;
}

const ORIENTATION_ARROWS: Record<Orientation, Record<Direction, string[]>> = {
  horizontal: { ltr: ['ArrowLeft', 'ArrowRight'], rtl: ['ArrowRight', 'ArrowLeft'] },
  vertical: { ltr: ['ArrowUp', 'ArrowDown'], rtl: ['ArrowUp', 'ArrowDown'] },
};

export function useRadioGroup<TValue = string>(props: Reactivify<RadioGroupProps<TValue>>) {
  const groupId = uniqId();
  const getOrientationArrows = () =>
    ORIENTATION_ARROWS[toValue(props.orientation) ?? 'vertical'][toValue(props.dir) || 'ltr'];

  const radios: RadioItemContext[] = [];
  const { labelProps, labelledByProps } = useLabel({
    for: groupId,
    label: props.label,
  });

  const { fieldValue } = useFieldValue(toValue(props.modelValue));
  useSyncModel({
    model: fieldValue,
    onModelPropUpdated: value => {
      fieldValue.value = value;
    },
  });

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
      ...labelledByProps.value,
      dir: toValue(props.dir) ?? 'ltr',
      role: 'radiogroup',
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
