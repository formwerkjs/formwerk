import { MaybeRefOrGetter, computed, ref, toValue } from 'vue';
import { Maybe, AriaLabelProps, AriaLabelableProps } from '../types';
import { createRefCapture, isInputElement, isLabelElement } from '../utils/common';

interface LabelProps {
  for: MaybeRefOrGetter<string>;
  label: MaybeRefOrGetter<Maybe<string>>;
  targetRef?: MaybeRefOrGetter<Maybe<HTMLElement>>;
  handleClick?: () => void;
}

export function useLabel(props: LabelProps) {
  const labelRef = ref<HTMLElement>();
  const refCapture = createRefCapture(labelRef);

  const labelProps = computed<AriaLabelProps>(() => {
    return {
      ref: refCapture,
      id: `${toValue(props.for)}-l`,
      for: isLabelElement(labelRef.value) ? toValue(props.for) : undefined,
      onClick: props.handleClick || undefined,
    } as AriaLabelProps;
  });

  const labelledByProps = computed<AriaLabelableProps>(() => {
    if (isLabelElement(labelRef.value) && isInputElement(toValue(props.targetRef))) {
      return {};
    }

    if (labelRef.value && toValue(props.label) && toValue(props.targetRef)) {
      return {
        'aria-labelledby': toValue(props.label) && labelRef.value ? labelProps.value.id : undefined,
      };
    }

    return {
      'aria-label': toValue(props.label) || undefined,
    };
  });

  return { labelProps, labelledByProps };
}
