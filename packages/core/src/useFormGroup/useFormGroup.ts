import { computed, inject, InjectionKey, provide, Ref, shallowRef, toValue } from 'vue';
import { useLabel } from '../a11y/useLabel';
import { FieldTypePrefixes } from '../constants';
import {
  AriaLabelableProps,
  FormObject,
  GroupValidationResult,
  Reactivify,
  StandardSchema,
  ValidationResult,
} from '../types';
import { isEqual, normalizeProps, useUniqId, warn, withRefCapture } from '../utils/common';
import { FormKey } from '../useForm';
import { useValidationProvider } from '../validation/useValidationProvider';
import { FormValidationMode } from '../useForm/formContext';
import { prefixPath as _prefixPath } from '../utils/path';
import { getConfig } from '../config';
import { createPathPrefixer } from '../helpers/usePathPrefixer';

export interface FormGroupProps<TInput extends FormObject = FormObject, TOutput extends FormObject = TInput> {
  name: string;
  label?: string;
  schema?: StandardSchema<TInput, TOutput>;
  disableHtmlValidation?: boolean;
}

interface GroupProps extends AriaLabelableProps {
  id: string;
  role?: 'group';
}

export interface FormGroupContext<TOutput extends FormObject = FormObject> {
  onValidationDispatch(cb: (enqueue: (promise: Promise<ValidationResult>) => void) => void): void;
  onValidationDone(cb: () => void): void;
  requestValidation(): Promise<GroupValidationResult<TOutput>>;
  getValidationMode(): FormValidationMode;
  isHtmlValidationDisabled(): boolean;
}

export const FormGroupKey: InjectionKey<FormGroupContext> = Symbol('FormGroup');

export function useFormGroup<TInput extends FormObject = FormObject, TOutput extends FormObject = TInput>(
  _props: Reactivify<FormGroupProps<TInput, TOutput>, 'schema'>,
  elementRef?: Ref<HTMLElement>,
) {
  const id = useUniqId(FieldTypePrefixes.FormGroup);
  const props = normalizeProps(_props, ['schema']);
  const getPath = () => toValue(props.name);
  const groupEl = elementRef || shallowRef<HTMLInputElement>();
  const form = inject(FormKey, null);
  const isHtmlValidationDisabled = () =>
    toValue(props.disableHtmlValidation) ?? form?.isHtmlValidationDisabled() ?? getConfig().disableHtmlValidation;
  const { validate, onValidationDispatch, defineValidationRequest, onValidationDone, dispatchValidateDone } =
    useValidationProvider({
      getValues,
      getPath,
      schema: props.schema,
      type: 'GROUP',
    });

  const requestValidation = defineValidationRequest(res => {
    // Clears Errors in that path before proceeding.
    form?.clearErrors(toValue(props.name));
    for (const entry of res.errors) {
      form?.setFieldErrors(entry.path, entry.messages);
    }

    dispatchValidateDone();
  });

  if (!form) {
    warn('Form groups must have a parent form. Please make sure to call `useForm` at a parent component.');
  }

  const { labelProps, labelledByProps } = useLabel({
    for: id,
    label: props.label,
    targetRef: groupEl,
  });

  const groupProps = computed<GroupProps>(() => {
    const isFieldSet = groupEl.value?.tagName === 'FIELDSET';

    return withRefCapture(
      {
        id,
        ...(isFieldSet ? {} : labelledByProps.value),
        role: isFieldSet ? undefined : 'group',
      },
      groupEl,
      elementRef,
    );
  });

  function getValues(): TInput {
    return form?.getFieldValue(getPath()) ?? {};
  }

  function getErrors() {
    const path = getPath();
    const allErrors = form?.getErrors() || [];

    return allErrors.filter(e => e.path.startsWith(path));
  }

  const isValid = computed(() => getErrors().length === 0);
  const isTouched = computed(() => form?.isFieldTouched(getPath()) ?? false);
  const isDirty = computed(() => {
    const path = getPath();

    return !isEqual(getValues(), form?.getFieldOriginalValue(path) ?? {});
  });

  function getError(name: string) {
    return form?.getFieldErrors(prefixPath(name) ?? '')?.[0];
  }

  function displayError(name: string) {
    const msg = getError(name);
    const path = prefixPath(name) ?? '';

    return form?.isFieldTouched(path) ? msg : undefined;
  }

  function prefixPath(path: string | undefined) {
    return _prefixPath(getPath(), path);
  }

  createPathPrefixer(prefixPath);

  const ctx: FormGroupContext = {
    onValidationDispatch,
    onValidationDone,
    requestValidation,
    getValidationMode: () => (props.schema ? 'schema' : 'aggregate'),
    isHtmlValidationDisabled,
  };

  // Whenever the form is validated, it is deferred to the form group to do that.
  // Fields should not validate in response to their form triggering a validate and instead should follow the field group event
  form?.onValidationDispatch(enqueue => {
    enqueue(
      validate().then(result => {
        return {
          ...result,
          errors: result.errors,
        };
      }),
    );
  });

  // When the form is done validating, the form group should also signal the same to its children.
  form?.onValidationDone(dispatchValidateDone);

  provide(FormGroupKey, ctx);

  return {
    groupEl,
    labelProps,
    groupProps,
    isDirty,
    isValid,
    isTouched,
    getErrors,
    getValues,
    getError,
    displayError,
    validate,
  };
}
