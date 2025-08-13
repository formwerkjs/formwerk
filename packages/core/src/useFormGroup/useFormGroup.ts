import { computed, inject, InjectionKey, provide, shallowRef, toValue } from 'vue';
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
import { normalizeProps, useUniqId, warn, useCaptureProps } from '../utils/common';
import { FormKey } from '../useForm';
import { useValidationProvider } from '../validation/useValidationProvider';
import { FormValidationMode } from '../useForm/formContext';
import { prefixPath as _prefixPath } from '../utils/path';
import { getConfig } from '../config';
import { createPathPrefixer, usePathPrefixer } from '../helpers/usePathPrefixer';
import { createDisabledContext } from '../helpers/createDisabledContext';
import { TransparentWrapper } from 'packages/core/dist/core';

export interface FormGroupProps<TInput extends FormObject = FormObject, TOutput extends FormObject = TInput> {
  /**
   * The name/path of the form group.
   */
  name: string;

  /**
   * The label for the form group.
   */
  label?: string;

  /**
   * The validation schema for the form group.
   */
  schema?: StandardSchema<TInput, TOutput>;

  /**
   * Whether the form group is disabled.
   */
  disabled?: boolean;

  /**
   * Whether HTML5 validation should be disabled for this form group.
   */
  disableHtmlValidation?: TransparentWrapper<boolean>;
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
) {
  const id = useUniqId(FieldTypePrefixes.FormGroup);
  const props = normalizeProps(_props, ['schema']);
  const pathPrefixer = usePathPrefixer();

  const getPath = () => {
    const path = toValue(_props.name);

    const prefixPath = pathPrefixer ? pathPrefixer.prefixPath(path) : path;

    if (!prefixPath) {
      return path;
    }

    return prefixPath;
  };
  const groupEl = shallowRef<HTMLInputElement>();
  const form = inject(FormKey, null);
  const parentGroup = inject(FormGroupKey, null);
  const isDisabled = createDisabledContext(props.disabled);
  const isHtmlValidationDisabled = () =>
    toValue(props.disableHtmlValidation) ?? form?.isHtmlValidationDisabled() ?? getConfig().disableHtmlValidation;
  const { validate, onValidationDispatch, defineValidationRequest, onValidationDone, dispatchValidateDone } =
    useValidationProvider({
      getValues: () => getValue(),
      getPath,
      schema: props.schema,
      type: 'GROUP',
    });

  const requestValidation = defineValidationRequest(async res => {
    // Clears Errors in that path before proceeding.
    form?.clearErrors(toValue(props.name));
    for (const entry of res.errors) {
      form?.setErrors(entry.path, entry.messages);
    }

    const parent = parentGroup || form;
    if (parent) {
      await parent.requestValidation();
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

  const groupProps = useCaptureProps<GroupProps>(() => {
    const isFieldSet = groupEl.value?.tagName === 'FIELDSET';

    return {
      id,
      ...(isFieldSet ? {} : labelledByProps.value),
      role: isFieldSet ? undefined : 'group',
    };
  }, groupEl);

  function getErrors() {
    return form?.getErrors(getPath()) ?? [];
  }

  function getValue(path?: string) {
    if (!path) {
      return form?.getValue(getPath()) ?? {};
    }

    return form?.getValue(prefixPath(path) || '');
  }

  const isValid = computed(() => getErrors().length === 0);
  const isTouched = computed(() => form?.isTouched(getPath()) ?? false);
  const isDirty = computed(() => form?.isDirty(getPath()) ?? false);

  function getError(path: string) {
    return form?.getErrors(prefixPath(path) ?? '')?.[0];
  }

  function displayError(name: string) {
    const msg = getError(name);
    const path = prefixPath(name) ?? '';

    return form?.isTouched(path) ? msg : undefined;
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
    /**
     * Reference to the group element.
     */
    groupEl,
    /**
     * Props for the label element.
     */
    labelProps,
    /**
     * Props for the group element.
     */
    groupProps,
    /**
     * Whether the form group is dirty.
     */
    isDirty,
    /**
     * Whether the form group is valid.
     */
    isValid,
    /**
     * Whether the form group is touched.
     */
    isTouched,
    /**
     * Whether the form group is disabled.
     */
    isDisabled,
    /**
     * Displays an error for a given field.
     */
    displayError,
    /**
     * Validates the form group.
     */
    validate,
    /**
     * Gets the errors for the form group.
     */
    getErrors,
    /**
     * Gets the group's value, passing in a path will return the value of that field.
     */
    getValue,
    /**
     * Gets the values for the form group.
     * @deprecated Use `getValue` without arguments instead.
     */
    getValues: () => getValue(),
    /**
     * Gets the error for a given field.
     */
    getError,
  };
}
