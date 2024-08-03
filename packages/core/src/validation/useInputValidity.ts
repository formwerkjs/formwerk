import { Ref, inject, nextTick, onMounted, shallowRef } from 'vue';
import { useEventListener } from '../helpers/useEventListener';
import { FormField, FormKey } from '../form';

interface InputValidityOptions {
  inputRef?: Ref<HTMLInputElement | HTMLTextAreaElement | undefined>;
  field: FormField<any>;
  events?: string[];
}

export function useInputValidity(opts: InputValidityOptions) {
  const { setErrors } = opts.field;
  const validityDetails = shallowRef<ValidityState>();
  const form = inject(FormKey, null);

  function updateValiditySync() {
    validityDetails.value = opts.inputRef?.value?.validity;
    // TODO: Only do that if native field/validation is enabled
    setErrors(opts.inputRef?.value?.validationMessage || []);
  }

  async function updateValidity() {
    await nextTick();
    updateValiditySync();
  }

  useEventListener(opts.inputRef, opts?.events || ['invalid', 'change', 'blur'], updateValidity);

  form?.onSubmitted(updateValiditySync);

  /**
   * Validity is always updated on mount.
   */
  onMounted(() => {
    nextTick(updateValidity);
  });

  return {
    validityDetails,
    updateValidity,
  };
}
