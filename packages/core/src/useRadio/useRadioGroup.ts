import { InjectionKey, toValue, computed, onBeforeUnmount, reactive, provide, ref } from 'vue';
import { useInputValidity } from '../validation/useInputValidity';
import { useLabel } from '../a11y/useLabel';
import {
  Orientation,
  AriaLabelableProps,
  AriaDescribableProps,
  AriaValidatableProps,
  Direction,
  Reactivify,
  StandardSchema,
} from '../types';
import {
  useUniqId,
  createDescribedByProps,
  getNextCycleArrIdx,
  normalizeProps,
  isEmpty,
  createAccessibleErrorMessageProps,
  removeFirst,
  hasKeyCode,
} from '../utils/common';
import { useLocale } from '../i18n';
import { useFormField } from '../useFormField';
import { FieldTypePrefixes } from '../constants';
import { exposeField } from '../utils/exposers';

export interface RadioGroupContext<TValue> {
  name: string;
  disabled: boolean;
  readonly: boolean;
  required: boolean;

  readonly modelValue: TValue | undefined;

  setGroupValue(value: TValue): void;
  setTouched(touched: boolean): void;
  useRadioRegistration(radio: RadioRegistration): { canReceiveFocus(): boolean };
}

export interface RadioRegistration {
  id: string;
  isChecked(): boolean;
  isDisabled(): boolean;
  setChecked(): boolean;
  getElem(): HTMLElement | undefined;
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

  schema?: StandardSchema<TValue>;

  disableHtmlValidation?: boolean;
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

  const radios = ref<RadioRegistration[]>([]);
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

  const { validityDetails } = useInputValidity({
    field,
    events: ['blur', 'click', ['keydown', e => hasKeyCode(e, 'Space')]],
    groupValidityBehavior: 'some',
    inputEl: computed(() => radios.value.map(r => r.getElem())),
    disableHtmlValidation: props.disableHtmlValidation,
  });

  const { fieldValue, setValue, setTouched, errorMessage } = field;

  const { descriptionProps, describedByProps } = createDescribedByProps({
    inputId: groupId,
    description: props.description,
  });

  const { accessibleErrorProps, errorMessageProps } = createAccessibleErrorMessageProps({
    inputId: groupId,
    errorMessage,
  });

  function handleArrowNext() {
    let currentIdx = radios.value.findIndex(radio => radio.isChecked());
    if (currentIdx === -1 || radios.value.length <= 1) {
      radios.value.find(radio => !radio.isDisabled())?.setChecked();
      return;
    }

    const candidates = radios.value.filter(radio => !radio.isDisabled());
    currentIdx = candidates.findIndex(radio => radio.isChecked());
    if (currentIdx === -1) {
      candidates[0].setChecked();
      return;
    }

    const nextIdx = getNextCycleArrIdx(currentIdx + 1, candidates);
    candidates[nextIdx].setChecked();
  }

  function handleArrowPrevious() {
    let currentIdx = radios.value.findIndex(radio => radio.isChecked());
    if (currentIdx === -1 || radios.value.length <= 1) {
      radios.value.find(radio => !radio.isDisabled())?.setChecked();
      return;
    }

    const candidates = radios.value.filter(radio => !radio.isDisabled());
    currentIdx = candidates.findIndex(radio => radio.isChecked());
    if (currentIdx === -1) {
      candidates[0].setChecked();
      return;
    }

    const nextIdx = getNextCycleArrIdx(currentIdx - 1, candidates);
    candidates[nextIdx].setChecked();
  }

  const groupProps = computed<RadioGroupDomProps>(() => {
    return {
      ...labelledByProps.value,
      ...describedByProps.value,
      ...accessibleErrorProps.value,
      dir: toValue(props.dir) ?? direction.value,
      role: 'radiogroup',
      'aria-orientation': toValue(props.orientation) ?? undefined,
      onKeydown(e: KeyboardEvent) {
        if (toValue(props.disabled)) {
          return;
        }

        const { next, prev } = getOrientationArrows(toValue(props.dir));

        if (next.includes(e.code)) {
          e.preventDefault();
          handleArrowNext();
          setTouched(true);

          return;
        }

        if (prev.includes(e.code)) {
          e.preventDefault();
          handleArrowPrevious();
          setTouched(true);

          return;
        }
      },
    };
  });

  function useRadioRegistration(radio: RadioRegistration) {
    const id = radio.id;
    radios.value.push(radio);

    onBeforeUnmount(() => {
      removeFirst(radios.value, reg => reg.id === id);
    });

    return {
      canReceiveFocus() {
        return radios.value[0].id === radio.id && isEmpty(fieldValue.value);
      },
    };
  }

  function setGroupValue(value: TValue) {
    if (toValue(props.disabled) || toValue(props.readonly)) {
      return;
    }

    setValue(value);
  }

  const context: RadioGroupContext<any> = reactive({
    name: computed(() => toValue(props.name) ?? groupId),
    disabled: computed(() => toValue(props.disabled) ?? false),
    readonly: computed(() => toValue(props.readonly) ?? false),
    required: computed(() => toValue(props.required) ?? false),
    modelValue: fieldValue,
    setGroupValue,
    setTouched,
    useRadioRegistration,
  });

  provide(RadioGroupKey, context);

  return {
    descriptionProps,
    errorMessageProps,
    groupProps,
    labelProps,
    validityDetails,
    ...exposeField(field),
  };
}
