import { MaybeRefOrGetter, computed, ref, toValue } from 'vue';
import { Maybe, AriaLabelProps, AriaLabelableProps } from '../types';
import { createRefCapture } from '../utils/common';

interface LabelProps {
  for: MaybeRefOrGetter<string>;
  label: MaybeRefOrGetter<Maybe<string>>;
  targetRef?: MaybeRefOrGetter<HTMLElement | undefined>;
  handleClick?: () => void;
}

export function useLabel(props: LabelProps) {
  const labelRef = ref<HTMLElement>();
  const refCapture = createRefCapture(labelRef);

  const labelProps = computed<AriaLabelProps>(() => {
    return {
      ref: refCapture,
      id: `${toValue(props.for)}-l`,
      for: labelRef.value?.tagName === 'LABEL' ? toValue(props.for) : undefined,
      onClick: props.handleClick || undefined,
    } as AriaLabelProps;
  });

  const labelledByProps = computed<AriaLabelableProps>(() => {
    if (labelRef.value && toValue(props.label) && toValue(props.targetRef)) {
      return {
        'aria-labelledby': labelProps.value.id,
      };
    }

    return {
      'aria-label': toValue(props.label) || undefined,
    };
  });

  return { labelProps, labelledByProps };
}
