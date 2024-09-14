import { Ref, inject, nextTick, onMounted, shallowRef, watch, MaybeRefOrGetter, toValue } from 'vue';
import { useEventListener } from '../helpers/useEventListener';
import { FormKey } from '../useForm';
import { Arrayable, Maybe, ValidationResult } from '../types';
import { FormField } from '../useFormField';
import { isInputElement, normalizeArrayable } from '../utils/common';
import { FormGroupKey } from '../useFormGroup';
import { getConfig } from '../config';

type ElementReference = Ref<Arrayable<Maybe<HTMLElement>>>;

interface InputValidityOptions {
  inputEl?: ElementReference;
  disableHtmlValidation?: MaybeRefOrGetter<boolean | undefined>;
  field: FormField<any>;
  events?: string[];
}

export function useInputValidity(opts: InputValidityOptions) {
  const form = inject(FormKey, null);
  const formGroup = inject(FormGroupKey, null);
  const { setErrors, errorMessage, schema, validate: validateField, getPath } = opts.field;
  const validityDetails = shallowRef<ValidityState>();
  useMessageCustomValiditySync(errorMessage, opts.inputEl);
  const isHtmlValidationDisabled = () =>
    toValue(opts.disableHtmlValidation) ??
    (formGroup || form)?.isHtmlValidationDisabled() ??
    getConfig().validation.disableHtmlValidation;

  function validateNative(mutate?: boolean): ValidationResult {
    const baseReturns: Omit<ValidationResult, 'errors' | 'isValid'> = {
      type: 'FIELD',
      path: getPath() || '',
    };

    const inputs = normalizeArrayable(opts.inputEl?.value).filter(el => isInputElement(el));
    if (!inputs.length || isHtmlValidationDisabled()) {
      return {
        ...baseReturns,
        isValid: true,
        errors: [{ messages: [], path: getPath() || '' }],
      };
    }

    inputs.forEach(el => el.setCustomValidity(''));
    validityDetails.value = inputs[0].validity;
    const messages = normalizeArrayable(inputs.map(i => i.validationMessage) || ([] as string[])).filter(m => !!m);

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

  useEventListener(opts.inputEl, opts?.events || ['change', 'blur'], updateValidity);

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
    useEventListener(opts.inputEl, opts?.events || ['invalid'], () => validateNative(true));
  }

  /**
   * Validity is always updated on mount.
   */
  onMounted(() => {
    nextTick(() => _updateValidity());
  });

  return {
    validityDetails,
    updateValidity,
  };
}

/**
 * Syncs the message with the input's native validation message.
 */
function useMessageCustomValiditySync(message: Ref<string>, input?: ElementReference) {
  if (!input) {
    return;
  }

  function applySync(el: HTMLInputElement, msg: string) {
    const inputMsg = el.validationMessage;
    if (inputMsg !== msg) {
      el.setCustomValidity(msg || '');
    }
  }

  watch(message, msg => {
    normalizeArrayable(toValue(input))
      .filter(isInputElement)
      .forEach(el => applySync(el, msg));
  });
}
