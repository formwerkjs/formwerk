import { computed, ref, Ref, toValue } from 'vue';
import { Maybe, Reactivify } from '../types';
import { useLabel } from '../a11y/useLabel';
import { normalizeProps, useUniqId, withRefCapture } from '../utils/common';
import { FieldTypePrefixes } from '../constants';
import { createDisabledContext } from '../helpers/createDisabledContext/createDisabledContext';

export interface OptionGroupProps {
  label: string;
  disabled?: boolean;
}

export function useOptionGroup(_props: Reactivify<OptionGroupProps>, elementRef?: Ref<Maybe<HTMLElement>>) {
  const groupEl = elementRef || ref<HTMLElement>();
  const props = normalizeProps(_props);
  const groupId = useUniqId(FieldTypePrefixes.OptionGroup);
  createDisabledContext(() => toValue(props.disabled));

  const { labelProps, labelledByProps } = useLabel({
    label: props.label,
    for: groupId,
    targetRef: groupEl,
  });

  const groupProps = computed(() => {
    return withRefCapture(
      {
        id: groupId,
        role: 'group',
        ...labelledByProps.value,
      },
      groupEl,
      elementRef,
    );
  });

  return {
    labelProps,
    groupProps,
    groupEl,
  };
}
