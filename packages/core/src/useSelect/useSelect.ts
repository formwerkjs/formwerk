import { computed, InjectionKey, provide, toValue } from 'vue';
import { useFormField } from '../useFormField';
import { AriaLabelableProps, Arrayable, Orientation, Reactivify, TypedSchema } from '../types';
import {
  createAccessibleErrorMessageProps,
  createDescribedByProps,
  isEqual,
  normalizeArrayable,
  normalizeProps,
  toggleValueSelection,
  useUniqId,
} from '../utils/common';
import { useInputValidity } from '../validation';
import { useListBox } from './useListBox';
import { useLabel } from '../a11y/useLabel';
import { FieldTypePrefixes } from '../constants';
import { useErrorDisplay } from '../useFormField/useErrorDisplay';

export interface SelectProps<TOption> {
  label: string;
  name?: string;
  description?: string;

  modelValue?: Arrayable<TOption>;
  disabled?: boolean;

  options: TOption[];
  multiple?: boolean;
  orientation?: Orientation;

  schema?: TypedSchema<Arrayable<TOption>>;
}

export interface SelectTriggerDomProps extends AriaLabelableProps {
  id: string;
  'aria-haspopup': 'listbox';
  'aria-expanded': boolean;
}

export interface SelectionContext<TValue> {
  isValueSelected(value: TValue): boolean;
  getOptionIndex(value: TValue): number;
  isMultiple(): boolean;
  toggleOption(value: TValue, force?: boolean): void;
  toggleIdx(idx: number, force?: boolean): void;
}

export const SelectionContextKey: InjectionKey<SelectionContext<unknown>> = Symbol('SelectionContextKey');

const MENU_OPEN_KEYS = ['Enter', 'Space', 'ArrowDown', 'ArrowUp'];

export function useSelect<TOption>(_props: Reactivify<SelectProps<TOption>, 'schema'>) {
  const inputId = useUniqId(FieldTypePrefixes.Select);
  const props = normalizeProps(_props, ['schema']);
  const field = useFormField<Arrayable<TOption>>({
    path: props.name,
    initialValue: toValue(props.modelValue) as Arrayable<TOption>,
    disabled: props.disabled,

    schema: props.schema,
  });

  const { labelProps, labelledByProps } = useLabel({
    label: props.label,
    for: inputId,
  });

  const { listBoxProps, isOpen } = useListBox<TOption>(props);
  const { updateValidity } = useInputValidity({ field });
  const { fieldValue, setValue, isTouched, errorMessage } = field;
  const { displayError } = useErrorDisplay(field);
  const { descriptionProps, describedByProps } = createDescribedByProps({
    inputId,
    description: props.description,
  });
  const { accessibleErrorProps, errorMessageProps } = createAccessibleErrorMessageProps({
    inputId,
    errorMessage,
  });

  function getSelectedIdx() {
    return toValue(props.options).findIndex(opt => isEqual(opt, fieldValue.value));
  }

  const selectionCtx: SelectionContext<TOption> = {
    isMultiple: () => toValue(props.multiple) ?? false,
    isValueSelected(value: TOption): boolean {
      const selectedOptions = normalizeArrayable(fieldValue.value ?? []);

      return selectedOptions.some(opt => isEqual(opt, value));
    },
    getOptionIndex(value: TOption) {
      const opts = toValue(props.options) || [];

      return opts.findIndex(opt => isEqual(opt, value));
    },
    toggleIdx(idx: number, force?: boolean) {
      const opts = toValue(props.options) || [];

      this.toggleOption(opts[idx], force);
    },
    toggleOption(optionValue: TOption, force?: boolean) {
      const isMultiple = toValue(props.multiple);
      if (!isMultiple) {
        setValue(optionValue);
        updateValidity();
        isOpen.value = false;
        return;
      }

      const nextValue = toggleValueSelection<TOption>(fieldValue.value ?? [], optionValue, force);
      setValue(nextValue);
      updateValidity();
    },
  };

  provide(SelectionContextKey, selectionCtx);

  function setSelectedByRelativeIdx(relativeIdx: number) {
    const options = toValue(props.options);
    // Clamps selection between 0 and the array length
    const nextIdx = Math.max(0, Math.min(options.length - 1, getSelectedIdx() + relativeIdx));
    const option = options[nextIdx];
    selectionCtx.toggleOption(option);
  }

  const handlers = {
    onClick() {
      isOpen.value = !isOpen.value;
    },
    onKeydown(e: KeyboardEvent) {
      if (!isOpen.value && MENU_OPEN_KEYS.includes(e.code)) {
        e.preventDefault();
        isOpen.value = true;
        return;
      }

      if (!selectionCtx.isMultiple() && !isOpen.value) {
        if (e.code === 'ArrowLeft') {
          e.preventDefault();
          setSelectedByRelativeIdx(-1);
          return;
        }

        if (e.code === 'ArrowRight') {
          e.preventDefault();
          setSelectedByRelativeIdx(1);
          return;
        }
      }
    },
  };

  const triggerProps = computed<SelectTriggerDomProps>(() => {
    return {
      ...labelledByProps.value,
      ...describedByProps.value,
      ...accessibleErrorProps.value,
      id: inputId,
      tabindex: '0',
      'aria-haspopup': 'listbox',
      'aria-expanded': isOpen.value,
      ...handlers,
    };
  });

  return {
    isOpen,
    triggerProps,
    labelProps,
    listBoxProps,
    fieldValue,
    errorMessage,
    isTouched,
    errorMessageProps,
    descriptionProps,
    displayError,
  };
}
