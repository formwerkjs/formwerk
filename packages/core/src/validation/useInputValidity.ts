import { Ref, inject, nextTick, onMounted, shallowRef, watch, MaybeRefOrGetter, toValue } from 'vue';
import { useEventListener } from '../helpers/useEventListener';
import { FormKey } from '../useForm';
import { Maybe, ValidationResult } from '../types';
import { FormField } from '../useFormField';
import { isInputElement, normalizeArrayable } from '../utils/common';
import { FormGroupKey } from '../useFormGroup';
import { getConfig } from '../config';

interface InputValidityOptions {
  inputRef?: Ref<Maybe<HTMLElement>>;
  disableHtmlValidation?: MaybeRefOrGetter<boolean | undefined>;
  field: FormField<any>;
  events?: string[];
}

export function useInputValidity(opts: InputValidityOptions) {
  const form = inject(FormKey, null);
  const formGroup = inject(FormGroupKey, null);
  const { setErrors, errorMessage, schema, validate: validateField, getPath } = opts.field;
  const validityDetails = shallowRef<ValidityState>();
  useMessageCustomValiditySync(errorMessage, opts.inputRef);
  const isHtmlValidationDisabled = () =>
    toValue(opts.disableHtmlValidation) ??
    (formGroup || form)?.isHtmlValidationDisabled() ??
    getConfig().validation.disableHtmlValidation;

  function validateNative(mutate?: boolean): ValidationResult {
    const baseReturns: Omit<ValidationResult, 'errors' | 'isValid'> = {
      type: 'FIELD',
      path: getPath() || '',
    };

    const inputEl = opts.inputRef?.value;
    if (!isInputElement(inputEl) || isHtmlValidationDisabled()) {
      return {
        ...baseReturns,
        isValid: true,
        errors: [{ messages: [], path: getPath() || '' }],
      };
    }

    inputEl.setCustomValidity('');
    validityDetails.value = inputEl.validity;
    const messages = normalizeArrayable(inputEl.validationMessage || ([] as string[])).filter(Boolean);

    if (mutate) {
      setErrors(messages);
    }

    return {
      ...baseReturns,
      isValid: !messages.length,
      errors: [{ messages, path: getPath() || '' }],
    };
  }

  async function _updateValidity() {
    let result = validateNative(true);
    if (schema && result.isValid) {
      result = await validateField(true);
    }

    if (!result.isValid) {
      return;
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
    const result = validateNative(false);
    if (schema && result.isValid) {
      enqueue(validateField(false));
      return;
    }

    enqueue(Promise.resolve(result));
  });

  if (!schema) {
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
function useMessageCustomValiditySync(message: Ref<string>, input?: Ref<Maybe<HTMLElement>>) {
  if (!input) {
    return;
  }

  watch(message, msg => {
    if (!isInputElement(input.value)) {
      return;
    }

    const inputMsg = input?.value?.validationMessage;
    if (inputMsg !== msg) {
      input?.value?.setCustomValidity(msg || '');
    }
  });
}
