import { MaybeRefOrGetter, computed, toValue, shallowRef } from 'vue';
import { Maybe, AriaLabelProps, AriaLabelableProps } from '../types';
import { createRefCapture, isLabelableElement, isLabelElement, warn } from '../utils/common';

interface LabelProps {
  for: MaybeRefOrGetter<string>;
  label: MaybeRefOrGetter<Maybe<string>>;
  targetRef?: MaybeRefOrGetter<Maybe<HTMLElement>>;
  handleClick?: () => void;
}

export function useLabel(props: LabelProps) {
  const labelRef = shallowRef<HTMLElement>();
  const refCapture = createRefCapture(labelRef);

  const shouldRenderFor = () => isLabelElement(labelRef.value) && isLabelableElement(toValue(props.targetRef));

  const labelProps = computed<AriaLabelProps>(() => {
    const hasFor = shouldRenderFor();

    if (__DEV__) {
      if (!hasFor && labelRef.value && isLabelElement(labelRef.value)) {
        warn(
          'Skipping `for` attribute on <label /> element because it is not associated with a labelable element.\nhttps://developer.mozilla.org/en-US/docs/Web/HTML/Guides/Content_categories#labelable',
        );
      }
    }

    return {
      ref: refCapture,
      id: `${toValue(props.for)}-l`,
      for: hasFor ? toValue(props.for) : undefined,
      onClick: props.handleClick || undefined,
    } as AriaLabelProps;
  });

  const labelledByProps = computed<AriaLabelableProps>(() => {
    if (shouldRenderFor()) {
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
