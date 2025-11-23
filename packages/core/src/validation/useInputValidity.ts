import { Ref, inject, nextTick, onMounted, shallowRef, watch, MaybeRefOrGetter, toValue } from 'vue';
import { EventExpression, useEventListener } from '../helpers/useEventListener';
import { type FormContext, FormKey } from '../useForm';
import { Arrayable, Maybe, ValidationResult } from '../types';
import { FieldState } from '../useFormField';
import { isInputElement, normalizeArrayable, toPrimitiveBooleanValue, warn } from '../utils/common';
import { FormGroupContext, FormGroupKey } from '../useFormGroup';
import { getConfig } from '../config';
import { checkLocaleMismatch } from '../i18n';

type ElementReference = Ref<Arrayable<Maybe<HTMLElement>>>;

interface InputValidityOptions {
  inputEl?: ElementReference;
  // eslint-disable-next-line @typescript-eslint/no-wrapper-object-types
  disableHtmlValidation?: MaybeRefOrGetter<Boolean | undefined>;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  field: FieldState<any>;
  events?: MaybeRefOrGetter<Arrayable<EventExpression>>;
  groupValidityBehavior?: 'some' | 'every';
}

export function useInputValidity(opts: InputValidityOptions) {
  const form = inject(FormKey, null);
  const formGroup = inject(FormGroupKey, null);
  const { setErrors, errorMessage, schema, validate: validateField, getPath } = opts.field;
  const validityDetails = shallowRef<ValidityState>();
  useMessageCustomValiditySync(errorMessage, opts.inputEl, form, formGroup);
  const isHtmlValidationDisabled = () =>
    toPrimitiveBooleanValue(opts.disableHtmlValidation) ??
    (formGroup || form)?.isHtmlValidationDisabled() ??
    getConfig().disableHtmlValidation;

  function validateNative(mutate?: boolean): ValidationResult {
    nextTick(() => {
      opts.field.setIsValidated(true);
    });

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

    let messages: string[] = [];
    let validityIdx = -1;
    for (let i = 0; i < inputs.length; i++) {
      const input = inputs[i];
      // We have to reset the custom validity to make way for the native validation message to be picked up.
      input.setCustomValidity('');
      if (opts.groupValidityBehavior === 'some' && input.validity.valid) {
        messages = [];
        validityIdx = i;
        break;
      }

      if (input.validationMessage) {
        messages.push(input.validationMessage);
        validityIdx = i;
      }
    }

    if (mutate) {
      setErrors(messages);
    }

    validityIdx = validityIdx === -1 ? 0 : validityIdx;
    validityDetails.value = inputs[validityIdx].validity;

    if (__DEV__) {
      const { matches, configLocale, userLocale } = checkLocaleMismatch();
      if (!matches && messages.length) {
        warn(
          `HTML validation messages were generated using the browser's language (${userLocale}) and it does not match your site's language (${configLocale}). Consider disabling HTML Validation messages.`,
        );
      }
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

  watch(opts.field.isDisabled, async () => {
    await nextTick();
    validateNative(true);
  });

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

  // TODO: is this the best approach?
  if (!opts.inputEl) {
    watch(opts.field.fieldValue, updateValidity);
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
function useMessageCustomValiditySync(
  message: Ref<string>,
  input?: ElementReference,
  form?: FormContext | null,
  formGroup?: FormGroupContext | null,
) {
  if (!input) {
    return;
  }

  function applySync(el: HTMLInputElement, msg: string) {
    const inputMsg = el.validationMessage;
    if (inputMsg !== msg) {
      el.setCustomValidity(msg || '');
    }
  }

  function syncMessage(msg: string) {
    normalizeArrayable(toValue(input))
      .filter(isInputElement)
      .forEach(el => applySync(el, msg));
  }

  const syncMessageInline = () => syncMessage(message.value);

  (formGroup || form)?.onValidationDone(syncMessageInline);

  watch(message, syncMessage);
}
