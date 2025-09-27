import { computed, MaybeRefOrGetter, shallowRef, toValue } from 'vue';
import { useCaptureProps } from '../utils/common';
import { AriaDescriptionProps } from '../types';

export function createDescriptionProps(inputId: string): AriaDescriptionProps {
  return {
    id: `${inputId}-d`,
  };
}

interface CreateDescribedByInit {
  inputId: MaybeRefOrGetter<string>;
  description: MaybeRefOrGetter<string | undefined>;
}

export function useDescription({ inputId, description }: CreateDescribedByInit) {
  const descriptionRef = shallowRef<HTMLElement>();
  const descriptionProps = useCaptureProps(() => createDescriptionProps(toValue(inputId)), descriptionRef);

  const describedByProps = computed(() => {
    return {
      'aria-describedby': descriptionRef.value && toValue(description) ? descriptionProps.value.id : undefined,
    };
  });

  return {
    describedByProps,
    descriptionProps,
  };
}
