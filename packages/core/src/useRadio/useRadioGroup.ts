import { InjectionKey, toValue, computed, onBeforeUnmount, reactive, provide } from 'vue';
import { useInputValidity } from '../validation/useInputValidity';
import { useLabel } from '../a11y/useLabel';
import {
  Orientation,
  AriaLabelableProps,
  AriaDescribableProps,
  AriaValidatableProps,
  Direction,
  Reactivify,
  Arrayable,
  TypedSchema,
} from '../types';
import { useUniqId, createDescribedByProps, getNextCycleArrIdx, normalizeProps, isEmpty } from '../utils/common';
import { useLocale } from '../i18n/useLocale';
import { useFormField } from '../useFormField';
import { FieldTypePrefixes } from '../constants';
import { useErrorDisplay } from '../useFormField/useErrorDisplay';

export interface RadioGroupContext<TValue> {
  name: string;
  disabled: boolean;
  readonly: boolean;
  required: boolean;

  readonly modelValue: TValue | undefined;
  setErrors(message: Arrayable<string>): void;
  setValue(value: TValue): void;
  setTouched(touched: boolean): void;
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
  dir?: Direction;
  label: string;
  description?: string;

  name?: string;
  modelValue?: TValue;

  disabled?: boolean;
  readonly?: boolean;
  required?: boolean;

  schema?: TypedSchema<TValue>;
}

interface RadioGroupDomProps extends AriaLabelableProps, AriaDescribableProps, AriaValidatableProps {
  role: 'radiogroup';
  dir: Direction;
  onKeydown(e: KeyboardEvent): void;
}

function getOrientationArrows(dir: Direction | undefined) {
  const nextKeys = ['ArrowDown'];
  const prevKeys = ['ArrowUp'];

  if (dir === 'rtl') {
    nextKeys.push('ArrowLeft');
    prevKeys.push('ArrowRight');

    return { prev: prevKeys, next: nextKeys };
  }

  nextKeys.push('ArrowRight');
  prevKeys.push('ArrowLeft');

  return { prev: prevKeys, next: nextKeys };
}

export function useRadioGroup<TValue = string>(_props: Reactivify<RadioGroupProps<TValue>, 'schema'>) {
  const props = normalizeProps(_props, ['schema']);
  const groupId = useUniqId(FieldTypePrefixes.RadioButtonGroup);
  const { direction } = useLocale();

  const radios: RadioItemContext[] = [];
  const { labelProps, labelledByProps } = useLabel({
    for: groupId,
    label: props.label,
  });

  const field = useFormField<TValue>({
    path: props.name,
    initialValue: toValue(props.modelValue) as TValue,
    disabled: props.disabled,
    schema: props.schema,
  });

  const { validityDetails } = useInputValidity({ field });
  const { displayError } = useErrorDisplay(field);
  const { fieldValue, setValue, isTouched, setTouched, errorMessage, errors } = field;

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

    const availableCandidates = radios.filter(radio => !radio.isDisabled());
    const nextCandidate = availableCandidates[getNextCycleArrIdx(currentIdx + 1, availableCandidates)];
    nextCandidate?.setChecked();
  }

  function handleArrowPrevious() {
    const currentIdx = radios.findIndex(radio => radio.isChecked());
    if (currentIdx === -1) {
      radios[0]?.setChecked();
      return;
    }

    const availableCandidates = radios.filter(radio => !radio.isDisabled());
    const prevCandidate = availableCandidates[getNextCycleArrIdx(currentIdx - 1, availableCandidates)];
    prevCandidate?.setChecked();
  }

  const radioGroupProps = computed<RadioGroupDomProps>(() => {
    return {
      ...labelledByProps.value,
      dir: toValue(props.dir) ?? direction.value,
      role: 'radiogroup',
      'aria-describedby': describedBy(),
      'aria-invalid': errorMessage.value ? true : undefined,
      onKeydown(e: KeyboardEvent) {
        if (toValue(props.disabled)) {
          return;
        }

        const { next, prev } = getOrientationArrows(toValue(props.dir));

        if (next.includes(e.key)) {
          e.preventDefault();
          handleArrowNext();
          setTouched(true);

          return;
        }

        if (prev.includes(e.key)) {
          e.preventDefault();
          handleArrowPrevious();
          setTouched(true);

          return;
        }
      },
    };
  });

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
        return radios[0] === radio && isEmpty(fieldValue.value);
      },
    };
  }

  const context: RadioGroupContext<any> = reactive({
    name: computed(() => toValue(props.name) ?? groupId),
    disabled: computed(() => toValue(props.disabled) ?? false),
    readonly: computed(() => toValue(props.readonly) ?? false),
    required: computed(() => toValue(props.required) ?? false),
    modelValue: fieldValue,
    setErrors: field.setErrors,
    setValue,
    setTouched,
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
    isTouched,
    errors,
    validityDetails,

    setValue,
    setTouched,
    setErrors: field.setErrors,
    displayError,
  };
}
