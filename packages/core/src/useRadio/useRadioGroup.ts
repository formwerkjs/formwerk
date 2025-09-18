import { InjectionKey, toValue, computed, onBeforeUnmount, reactive, provide, ref } from 'vue';
import { useInputValidity } from '../validation/useInputValidity';
import {
  Orientation,
  AriaLabelableProps,
  AriaDescribableProps,
  AriaValidatableProps,
  Direction,
  Reactivify,
  ControlProps,
  BuiltInControlTypes,
} from '../types';
import { useUniqId, getNextCycleArrIdx, normalizeProps, isEmpty, removeFirst, hasKeyCode } from '../utils/common';
import { useLocale } from '../i18n';
import { useFormField, exposeField, WithFieldProps } from '../useFormField';
import { FieldTypePrefixes } from '../constants';
import { useSyncModel } from '../reactivity/useModelSync';

export interface RadioGroupContext<TValue> {
  name: string;
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

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export const RadioGroupKey: InjectionKey<RadioGroupContext<any>> = Symbol('RadioGroupKey');

interface _RadioGroupProps<TValue = string> extends ControlProps<TValue> {
  /**
   * The orientation of the radio group (horizontal or vertical).
   */
  orientation?: Orientation;

  /**
   * The text direction of the radio group (ltr or rtl).
   */
  dir?: Direction;

  /**
   * Whether the radio group is readonly.
   */
  readonly?: boolean;

  /**
   * Whether to disable HTML5 form validation.
   */
  // eslint-disable-next-line @typescript-eslint/no-wrapper-object-types
  disableHtmlValidation?: Boolean;
}

export type RadioGroupProps<TValue = string> = WithFieldProps<_RadioGroupProps<TValue>>;

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

  const field = useFormField<TValue>({
    label: props.label,
    description: props.description,
    path: props.name,
    initialValue: toValue(props.modelValue) as TValue,
    disabled: props.disabled,
    schema: props.schema,
  });

  useSyncModel({
    model: field.state.fieldValue,
    modelName: 'modelValue',
    onModelPropUpdated: value => field.state.setValue(value as TValue),
  });

  field.registerControl({
    getControlId: () => groupId,
    getControlElement: () => undefined,
    getControlType: () => BuiltInControlTypes.RadioGroup,
  });

  useInputValidity({
    field: field.state,
    events: ['blur', 'click', ['keydown', e => hasKeyCode(e, 'Space')]],
    groupValidityBehavior: 'some',
    inputEl: computed(() => radios.value.map(r => r.getElem())),
    disableHtmlValidation: props.disableHtmlValidation,
  });

  const { fieldValue, setValue, setTouched, isDisabled } = field.state;

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
      ...field.labelledByProps.value,
      ...field.describedByProps.value,
      ...field.accessibleErrorProps.value,
      dir: toValue(props.dir) ?? direction.value,
      role: 'radiogroup',
      'aria-orientation': toValue(props.orientation) ?? undefined,
      onKeydown(e: KeyboardEvent) {
        if (isDisabled.value) {
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
    if (isDisabled.value || toValue(props.readonly)) {
      return;
    }

    setValue(value);
  }

  const context: RadioGroupContext<TValue> = reactive({
    name: computed(() => toValue(props.name) ?? groupId),
    readonly: computed(() => toValue(props.readonly) ?? false),
    required: computed(() => toValue(props.required) ?? false),
    modelValue: fieldValue,
    setGroupValue,
    setTouched,
    useRadioRegistration,
  });

  provide(RadioGroupKey, context);

  return exposeField(
    {
      /**
       * Props for the group element.
       */
      groupProps,

      /**
       * The id of the group element.
       */
      groupId,
    },
    field,
  );
}
