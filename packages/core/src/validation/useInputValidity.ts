import { Ref, nextTick, shallowRef } from 'vue';
import { useEventListener } from '../helpers/useEventListener';
import { FormField } from '../form';

interface InputValidityOptions {
  inputRef?: Ref<HTMLInputElement | HTMLTextAreaElement | undefined>;
  field: FormField<any>;
  events?: string[];
}

export function useInputValidity(opts: InputValidityOptions) {
  const { setErrors } = opts.field;
  const validityDetails = shallowRef<ValidityState>();

  async function updateValidity() {
    await nextTick();
    validityDetails.value = opts.inputRef?.value?.validity;
    // TODO: Only do that if native field/validation is enabled
    setErrors(opts.inputRef?.value?.validationMessage || []);
  }

  useEventListener(opts.inputRef, opts?.events || ['invalid', 'change', 'blur'], updateValidity);

  return {
    validityDetails,
    updateValidity,
  };
}
