import { Ref, inject, nextTick, onMounted, shallowRef, watch } from 'vue';
import { useEventListener } from '../helpers/useEventListener';
import { FormKey } from '../useForm';
import { Maybe, ValidationResult } from '../types';
import { FormField } from '../useFormField';
import { cloneDeep, normalizeArrayable } from '../utils/common';
import { FormGroupKey } from '../useFormGroup';

interface InputValidityOptions {
  inputRef?: Ref<HTMLInputElement | HTMLTextAreaElement | undefined>;
  field: FormField<any>;
  events?: string[];
}

export function useInputValidity(opts: InputValidityOptions) {
  const form = inject(FormKey, null);
  const formGroup = inject(FormGroupKey, null);
  const { setErrors, errorMessage, schema, validate: validateField, getPath, fieldValue } = opts.field;
  const validityDetails = shallowRef<ValidityState>();
  const validationMode = form?.getValidationMode() ?? 'native';
  useMessageCustomValiditySync(errorMessage, opts.inputRef);

  function validateNative(mutate?: boolean): ValidationResult {
    validityDetails.value = opts.inputRef?.value?.validity;
    const messages = normalizeArrayable(opts.inputRef?.value?.validationMessage || ([] as string[])).filter(Boolean);
    if (mutate) {
      setErrors(messages);
    }

    return {
      type: 'FIELD',
      path: getPath() || '',
      output: cloneDeep(fieldValue.value),
      isValid: !messages.length,
      errors: [{ messages, path: getPath() || '' }],
    };
  }

  function _updateValidity() {
    if (validationMode === 'native') {
      return schema ? validateField(true) : validateNative(true);
    }

    (formGroup || form)?.requestValidation();
  }

  async function updateValidity() {
    await nextTick();
    _updateValidity();
  }

  useEventListener(opts.inputRef, opts?.events || ['change', 'blur'], updateValidity);

  // It shouldn't mutate the field if the validation is sourced by the form.
  // The form will handle the mutation later once it aggregates all the results.
  (formGroup || form)?.onValidationDispatch(enqueue => {
    if (schema) {
      enqueue(validateField(false));
      return;
    }

    if (validationMode === 'native') {
      enqueue(Promise.resolve(validateNative(false)));
      return;
    }
  });

  if (validationMode === 'native') {
    // It should self-mutate the field errors because this is fired by a native validation and not sourced by the form.
    useEventListener(opts.inputRef, opts?.events || ['invalid'], () => validateNative(true));
  }

  /**
   * Validity is always updated on mount.
   */
  onMounted(() => {
    nextTick(_updateValidity);
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
