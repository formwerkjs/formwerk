import { Ref, inject, nextTick, onMounted, shallowRef, watch } from 'vue';
import { useEventListener } from '../helpers/useEventListener';
import { FormField, FormKey } from '../form';

interface InputValidityOptions {
  inputRef?: Ref<HTMLInputElement | HTMLTextAreaElement | undefined>;
  field: FormField<any>;
  events?: string[];
}

export function useInputValidity(opts: InputValidityOptions) {
  const { setErrors, errorMessage } = opts.field;
  const validityDetails = shallowRef<ValidityState>();
  const form = inject(FormKey, null);
  const validationMode = form?.getValidationMode() ?? 'native';

  function updateValiditySync() {
    validityDetails.value = opts.inputRef?.value?.validity;

    if (validationMode === 'native') {
      setErrors(opts.inputRef?.value?.validationMessage || []);
    }
  }

  async function updateValidity() {
    await nextTick();
    updateValiditySync();
  }

  useEventListener(opts.inputRef, opts?.events || ['invalid', 'change', 'blur'], updateValidity);

  form?.onValidateTriggered(updateValiditySync);

  if (opts.inputRef) {
    watch(errorMessage, msg => {
      const inputMsg = opts.inputRef?.value?.validationMessage;
      if (inputMsg !== msg) {
        opts.inputRef?.value?.setCustomValidity(msg || '');
      }
    });
  }

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
