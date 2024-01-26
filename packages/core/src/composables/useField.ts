import {
  ComponentInternalInstance,
  MaybeRef,
  MaybeRefOrGetter,
  Ref,
  computed,
  getCurrentInstance,
  isRef,
  onBeforeUnmount,
  onMounted,
  provide,
  toValue,
  unref,
  watch,
} from 'vue';
import {
  FieldContext,
  FieldState,
  FormContext,
  GenericValidateFunction,
  InputType,
  PrivateFieldContext,
  PrivateFormContext,
  SchemaValidationMode,
  TypedSchema,
  ValidationOptions,
  YupSchema,
} from '../types/forms';
import { klona as deepCopy } from 'klona/full';
import { applyModelModifiers, isEqual, normalizeEventValue, withLatest } from '../utils';
import { isCallable, isObject, normalizeFormPath } from 'packages/shared';
import { extractLocators, getFromPath, injectWithSelf, isTypedSchema, isYupValidator, normalizeRules } from '../utils';
import { FieldContextKey, FormContextKey, IS_ABSENT } from '../symbols';
import { useFieldState } from './useFieldState';
import { validate as validateValue } from '../helpers/validate';

export type RuleExpression<TValue> =
  | string
  | Record<string, unknown>
  | GenericValidateFunction<TValue>
  | GenericValidateFunction<TValue>[]
  | TypedSchema<TValue>
  | YupSchema<TValue>
  | undefined;

export interface FieldOptions<TValue = unknown> {
  initialValue?: MaybeRef<TValue>;
  validateOnValueUpdate: boolean;
  validateOnMount?: boolean;
  bails?: boolean;
  type?: InputType;
  /**
   * @deprecated Use `checkedValue` instead.
   */
  valueProp?: MaybeRefOrGetter<TValue>;
  checkedValue?: MaybeRefOrGetter<TValue>;
  uncheckedValue?: MaybeRefOrGetter<TValue>;
  label?: MaybeRefOrGetter<string | undefined>;
  controlled?: boolean;
  /**
   * @deprecated Use `controlled` instead, controlled is opposite of standalone.
   */
  standalone?: boolean;
  keepValueOnUnmount?: MaybeRefOrGetter<boolean | undefined>;
  /**
   * @deprecated Pass the model prop name to `syncVModel` instead.
   */
  modelPropName?: string;
  syncVModel?: boolean | string;
  form?: FormContext;
}

/**
 * Creates a field composite.
 */
export function useField<TValue = unknown>(
  path: MaybeRefOrGetter<string>,
  rules?: MaybeRef<RuleExpression<TValue>>,
  opts?: Partial<FieldOptions<TValue>>,
): FieldContext<TValue> {
  return _useField(path, rules, opts);
}

/**
 * Normalizes partial field options to include the full options
 */
function normalizeOptions<TValue>(opts: Partial<FieldOptions<TValue>> | undefined): FieldOptions<TValue> {
  const defaults = (): Partial<FieldOptions<TValue>> => ({
    initialValue: undefined,
    validateOnMount: false,
    bails: true,
    label: undefined,
    validateOnValueUpdate: true,
    keepValueOnUnmount: undefined,
    syncVModel: false,
    controlled: true,
  });

  const isVModelSynced = !!opts?.syncVModel;
  const modelPropName = typeof opts?.syncVModel === 'string' ? opts.syncVModel : opts?.modelPropName || 'modelValue';
  const initialValue =
    isVModelSynced && !('initialValue' in (opts || {}))
      ? getCurrentModelValue(getCurrentInstance(), modelPropName)
      : opts?.initialValue;

  if (!opts) {
    return { ...defaults(), initialValue } as FieldOptions<TValue>;
  }

  // TODO: Deprecate this in next major release
  const checkedValue = 'valueProp' in opts ? opts.valueProp : opts.checkedValue;
  const controlled = 'standalone' in opts ? !opts.standalone : opts.controlled;
  const syncVModel = opts?.modelPropName || opts?.syncVModel || false;

  return {
    ...defaults(),
    ...(opts || {}),
    initialValue,
    controlled: controlled ?? true,
    checkedValue,
    syncVModel,
  } as FieldOptions<TValue>;
}

function _useField<TValue = unknown>(
  path: MaybeRefOrGetter<string>,
  rules?: MaybeRef<RuleExpression<TValue>>,
  opts?: Partial<FieldOptions<TValue>>,
): FieldContext<TValue> {
  const {
    initialValue: modelValue,
    validateOnMount,
    bails,
    type,
    checkedValue,
    label,
    validateOnValueUpdate,
    uncheckedValue,
    controlled,
    keepValueOnUnmount,
    syncVModel,
    form: controlForm,
  } = normalizeOptions(opts);

  const injectedForm = controlled ? injectWithSelf(FormContextKey) : undefined;
  const form = (controlForm as PrivateFormContext | undefined) || injectedForm;
  const name = computed(() => normalizeFormPath(toValue(path)));

  const validator = computed(() => {
    const schema = toValue(form?.schema);
    if (schema) {
      return undefined;
    }

    const rulesValue = unref(rules);

    if (
      isYupValidator(rulesValue) ||
      isTypedSchema(rulesValue) ||
      isCallable(rulesValue) ||
      Array.isArray(rulesValue)
    ) {
      return rulesValue;
    }

    return normalizeRules(rulesValue);
  });

  const { id, value, initialValue, meta, setState, errors, flags } = useFieldState<TValue>(name, {
    modelValue,
    form,
    bails,
    label,
    type,
    validate: validator.value ? validate : undefined,
    schema: isTypedSchema(rules) ? (rules as any) : undefined,
  });

  const errorMessage = computed(() => errors.value[0]);

  if (syncVModel) {
    useVModel({
      value,
      prop: syncVModel,
      handleChange,
      shouldValidate: () => validateOnValueUpdate && !flags.pendingReset,
    });
  }

  /**
   * Handles common onBlur meta update
   */
  const handleBlur = (evt?: unknown, shouldValidate = false) => {
    meta.touched = true;
    if (shouldValidate) {
      validateWithStateMutation();
    }
  };

  async function validateCurrentValue(mode: SchemaValidationMode) {
    if (form?.validateSchema) {
      const { results } = await form.validateSchema(mode);

      return results[toValue(name)] ?? { valid: true, errors: [] };
    }

    if (validator.value) {
      return validateValue(value.value, validator.value, {
        name: toValue(name),
        label: toValue(label),
        values: form?.values ?? {},
        bails,
      });
    }

    return { valid: true, errors: [] };
  }

  const validateWithStateMutation = withLatest(
    async () => {
      meta.pending = true;
      meta.validated = true;

      return validateCurrentValue('validated-only');
    },
    result => {
      if (flags.pendingUnmount[field.id]) {
        return result;
      }

      setState({ errors: result.errors });
      meta.pending = false;
      meta.valid = result.valid;

      return result;
    },
  );

  const validateValidStateOnly = withLatest(
    async () => {
      return validateCurrentValue('silent');
    },
    result => {
      meta.valid = result.valid;

      return result;
    },
  );

  function validate(opts?: Partial<ValidationOptions>) {
    if (opts?.mode === 'silent') {
      return validateValidStateOnly();
    }

    return validateWithStateMutation();
  }

  // Common input/change event handler
  function handleChange(e: unknown, shouldValidate = true) {
    const newValue = normalizeEventValue(e) as TValue;
    setValue(newValue, shouldValidate);
  }

  // Runs the initial validation
  onMounted(() => {
    if (validateOnMount) {
      return validateWithStateMutation();
    }

    // validate self initially if no form was handling this
    // forms should have their own initial silent validation run to make things more efficient
    if (!form || !form.validateSchema) {
      validateValidStateOnly();
    }
  });

  function setTouched(isTouched: boolean) {
    meta.touched = isTouched;
  }

  function resetField(state?: Partial<FieldState<TValue>>) {
    const newValue = state && 'value' in state ? (state.value as TValue) : initialValue.value;

    setState({
      value: deepCopy(newValue),
      initialValue: deepCopy(newValue),
      touched: state?.touched ?? false,
      errors: state?.errors || [],
    });

    meta.pending = false;
    meta.validated = false;
    validateValidStateOnly();
  }

  const vm = getCurrentInstance();

  function setValue(newValue: TValue, shouldValidate = true) {
    value.value = vm && syncVModel ? applyModelModifiers<TValue>(newValue, vm.props.modelModifiers) : newValue;
    const validateFn = shouldValidate ? validateWithStateMutation : validateValidStateOnly;
    validateFn();
  }

  function setErrors(errors: string[] | string) {
    setState({ errors: Array.isArray(errors) ? errors : [errors] });
  }

  const valueProxy = computed({
    get() {
      return value.value;
    },
    set(newValue: TValue) {
      setValue(newValue, validateOnValueUpdate);
    },
  });

  const field: PrivateFieldContext<TValue> = {
    id,
    name,
    label,
    value: valueProxy,
    meta,
    errors,
    errorMessage,
    type,
    checkedValue,
    uncheckedValue,
    bails,
    keepValueOnUnmount,
    resetField,
    handleReset: () => resetField(),
    validate,
    handleChange,
    handleBlur,
    setState,
    setTouched,
    setErrors,
    setValue,
  };

  provide(FieldContextKey, field);

  if (isRef(rules) && typeof unref(rules) !== 'function') {
    watch(
      rules,
      (value, oldValue) => {
        if (isEqual(value, oldValue)) {
          return;
        }

        meta.validated ? validateWithStateMutation() : validateValidStateOnly();
      },
      {
        deep: true,
      },
    );
  }

  // if no associated form return the field API immediately
  if (!form) {
    return field;
  }

  // associate the field with the given form

  // extract cross-field dependencies in a computed prop
  const dependencies = computed(() => {
    const rulesVal = validator.value;
    // is falsy, a function schema or a yup schema
    if (
      !rulesVal ||
      isCallable(rulesVal) ||
      isYupValidator(rulesVal) ||
      isTypedSchema(rulesVal) ||
      Array.isArray(rulesVal)
    ) {
      return {};
    }

    return Object.keys(rulesVal).reduce(
      (acc, rule: string) => {
        const deps = extractLocators(rulesVal[rule])
          .map((dep: any) => dep.__locatorRef)
          .reduce(
            (depAcc, depName) => {
              const depValue = getFromPath(form.values, depName) || form.values[depName];

              if (depValue !== undefined) {
                depAcc[depName] = depValue;
              }

              return depAcc;
            },
            {} as Record<string, unknown>,
          );

        Object.assign(acc, deps);

        return acc;
      },
      {} as Record<string, unknown>,
    );
  });

  // Adds a watcher that runs the validation whenever field dependencies change
  watch(dependencies, (deps, oldDeps) => {
    // Skip if no dependencies or if the field wasn't manipulated
    if (!Object.keys(deps).length) {
      return;
    }

    const shouldValidate = !isEqual(deps, oldDeps);
    if (shouldValidate) {
      meta.validated ? validateWithStateMutation() : validateValidStateOnly();
    }
  });

  onBeforeUnmount(() => {
    const shouldKeepValue = toValue(field.keepValueOnUnmount) ?? toValue(form.keepValuesOnUnmount);
    const path = toValue(name);
    if (shouldKeepValue || !form || flags.pendingUnmount[field.id]) {
      form?.removePathState(path, id);

      return;
    }

    flags.pendingUnmount[field.id] = true;
    const pathState = form.getPathState(path);
    const matchesId =
      Array.isArray(pathState?.id) && pathState?.multiple
        ? pathState?.id.includes(field.id)
        : pathState?.id === field.id;
    if (!matchesId) {
      return;
    }

    if (pathState?.multiple && Array.isArray(pathState.value)) {
      const valueIdx = pathState.value.findIndex(i => isEqual(i, toValue(field.checkedValue)));
      if (valueIdx > -1) {
        const newVal = [...pathState.value];
        newVal.splice(valueIdx, 1);
        form.setFieldValue(path, newVal);
      }

      if (Array.isArray(pathState.id)) {
        pathState.id.splice(pathState.id.indexOf(field.id), 1);
      }
    } else {
      form.unsetPathValue(toValue(name));
    }

    form.removePathState(path, id);
  });

  return field;
}

function getCurrentModelValue<TValue = unknown>(vm: ComponentInternalInstance | null, propName: string) {
  if (!vm) {
    return undefined;
  }

  return vm.props[propName] as TValue;
}

interface ModelOpts<TValue> {
  prop: string | boolean;
  value: Ref<TValue>;
  handleChange: FieldContext['handleChange'];
  shouldValidate: () => boolean;
}

function useVModel<TValue = unknown>({ prop, value, handleChange, shouldValidate }: ModelOpts<TValue>) {
  const vm = getCurrentInstance();
  /* istanbul ignore next */
  if (!vm || !prop) {
    if (__DEV__) {
      console.warn('Failed to setup model events because `useField` was not called in setup.');
    }
    return;
  }

  const propName = typeof prop === 'string' ? prop : 'modelValue';
  const emitName = `update:${propName}`;

  // Component doesn't have a model prop setup (must be defined on the props)
  if (!(propName in vm.props)) {
    return;
  }

  watch(value, newValue => {
    if (isEqual(newValue, getCurrentModelValue(vm, propName))) {
      return;
    }

    vm.emit(emitName, newValue);
  });

  watch(
    () => getCurrentModelValue<TValue>(vm, propName),
    propValue => {
      if ((propValue as any) === IS_ABSENT && value.value === undefined) {
        return;
      }

      const newValue = (propValue as any) === IS_ABSENT ? undefined : propValue;
      if (isEqual(newValue, value.value)) {
        return;
      }

      handleChange(newValue, shouldValidate());
    },
  );
}
