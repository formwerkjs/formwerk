import { computed, ref, Ref } from 'vue';
import { Maybe, Reactivify } from '../types';
import { useLabel } from '../a11y/useLabel';
import { normalizeProps, useUniqId, withRefCapture } from '../utils/common';
import { FieldTypePrefixes } from '../constants';

export interface OptionGroupProps {
  label: string;
}

export function useOptionGroup(_props: Reactivify<OptionGroupProps>, elementRef?: Ref<Maybe<HTMLElement>>) {
  const groupRef = elementRef || ref<HTMLElement>();
  const props = normalizeProps(_props);
  const groupId = useUniqId(FieldTypePrefixes.OptionGroup);

  const { labelProps, labelledByProps } = useLabel({
    label: props.label,
    for: groupId,
  });

  const groupProps = computed(() => {
    return withRefCapture(
      {
        id: groupId,
        role: 'group',
        ...labelledByProps.value,
      },
      groupRef,
      elementRef,
    );
  });

  return {
    labelProps,
    groupProps,
  };
}
