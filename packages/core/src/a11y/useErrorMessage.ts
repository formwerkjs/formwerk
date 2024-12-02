import { Simplify } from 'type-fest';
import { MaybeRefOrGetter, Ref, computed, toValue, inject, shallowRef } from 'vue';
import { WithId, AriaErrorMessageProps } from '../types';
import { FormKey } from '../useForm';
import { withRefCapture } from '../utils/common';
import { FormIdAttr } from '../constants';

export function createErrorProps(inputId: MaybeRefOrGetter<string>): Ref<Simplify<WithId<AriaErrorMessageProps>>> {
  return computed(() => ({
    id: `${toValue(inputId)}-r`,
    'aria-live': 'polite',
    'aria-atomic': true,
  }));
}

interface CreateAccessibleErrorMessageInit {
  inputId: MaybeRefOrGetter<string>;
  errorMessage: MaybeRefOrGetter<string | undefined>;
}

export interface ErrorableAttributes {
  'aria-invalid': boolean;
  'aria-errormessage': string | undefined;
}

export function useErrorMessage({ inputId, errorMessage }: CreateAccessibleErrorMessageInit) {
  const form = inject(FormKey, null);
  const errorMessageRef = shallowRef<HTMLElement>();
  // This props are meant to be bound to the error message element.
  const errorMessageProps = withRefCapture(createErrorProps(inputId), errorMessageRef);

  // These props are meant to be bound to the input element.
  const accessibleErrorProps = computed<ErrorableAttributes>(() => {
    const isInvalid = !!toValue(errorMessage);

    return {
      'aria-invalid': isInvalid,
      [FormIdAttr]: form?.id,
      'aria-errormessage': isInvalid ? errorMessageProps.value.id : undefined,
    };
  });

  return {
    errorMessageProps,
    accessibleErrorProps,
  };
}
