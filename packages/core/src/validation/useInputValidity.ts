import { Ref, inject, nextTick, onMounted, shallowRef, watch } from 'vue';
import { useEventListener } from '../helpers/useEventListener';
import { FormKey } from '../useForm';
import { Maybe } from '../types';
import { FormField } from '../useFormField';

interface InputValidityOptions {
  inputRef?: Ref<HTMLInputElement | HTMLTextAreaElement | undefined>;
  field: FormField<any>;
  events?: string[];
}

export function useInputValidity(opts: InputValidityOptions) {
  const form = inject(FormKey, null);
  const { setErrors, errorMessage } = opts.field;
  const validityDetails = shallowRef<ValidityState>();
  const validationMode = form?.getValidationMode() ?? 'native';
  useMessageCustomValiditySync(errorMessage, opts.inputRef);

  function updateWithNativeValidity() {
    validityDetails.value = opts.inputRef?.value?.validity;
    setErrors(opts.inputRef?.value?.validationMessage || []);
  }

  function _updateValidity() {
    if (validationMode === 'native') {
      updateWithNativeValidity();
      return;
    }

    form?.requestValidation();
  }

  async function updateValidity() {
    await nextTick();
    _updateValidity();
  }

  useEventListener(opts.inputRef, opts?.events || ['change', 'blur'], updateValidity);

  if (validationMode === 'native') {
    form?.onNativeValidationDispatch(updateWithNativeValidity);
    useEventListener(opts.inputRef, opts?.events || ['invalid'], updateWithNativeValidity);
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

/**
 * Syncs the message with the input's native validation message.
 */
function useMessageCustomValiditySync(
  message: Ref<string>,
  input?: Ref<Maybe<HTMLInputElement | HTMLTextAreaElement>>,
) {
  if (!input) {
    return;
  }

  watch(message, msg => {
    const inputMsg = input?.value?.validationMessage;
    if (inputMsg !== msg) {
      input?.value?.setCustomValidity(msg || '');
    }
  });
}
