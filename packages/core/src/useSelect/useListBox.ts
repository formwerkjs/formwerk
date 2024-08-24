import { Orientation, Reactivify } from '../types';
import { computed, ref, Ref, shallowRef, toValue } from 'vue';
import { getNextCycleArrIdx, isEqual, normalizeProps, withRefCapture } from '../utils/common';

export interface ListBoxProps<TOption> {
  options: TOption[];
  multiple?: boolean;
  orientation?: Orientation;
}

export interface ListBoxDomProps {
  role: 'listbox';
  'aria-multiselectable'?: boolean;
}

export function useListBox<TOption>(_props: Reactivify<ListBoxProps<TOption>>, elementRef?: Ref<HTMLElement>) {
  const listBoxRef = elementRef ?? ref();
  const props = normalizeProps(_props);
  const getOptions = () => toValue(props.options) ?? [];
  const highlightedOption = shallowRef<TOption>();

  function highlightNext() {
    const options = getOptions();
    if (!highlightedOption.value) {
      highlightedOption.value = options[0];
      return;
    }

    const currentIdx = options.findIndex(opt => isHighlighted(opt));
    const nextIdx = getNextCycleArrIdx(currentIdx + 1, options);
    highlightedOption.value = options[nextIdx];
  }

  function highlightPrev() {
    const options = getOptions();
    if (!highlightedOption.value) {
      highlightedOption.value = options[0];
      return;
    }

    const currentIdx = options.findIndex(opt => isHighlighted(opt));
    const nextIdx = getNextCycleArrIdx(currentIdx - 1, options);
    highlightedOption.value = options[nextIdx];
  }

  function isHighlighted(opt: TOption) {
    return isEqual(opt, highlightedOption.value);
  }

  const listBoxProps = computed<ListBoxDomProps>(() => {
    return withRefCapture(
      {
        role: 'listbox',
        'aria-multiselectable': toValue(props.multiple) ?? undefined,
      },
      listBoxRef,
      elementRef,
    );
  });

  return {
    listBoxProps,
    highlightedOption,
    isHighlighted,
    highlightNext,
    highlightPrev,
  };
}
