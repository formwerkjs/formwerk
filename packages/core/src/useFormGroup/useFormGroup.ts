import {
  computed,
  createBlock,
  defineComponent,
  Fragment,
  inject,
  InjectionKey,
  openBlock,
  provide,
  Ref,
  shallowRef,
  toValue,
  VNode,
} from 'vue';
import { useLabel } from '../a11y/useLabel';
import { FieldTypePrefixes } from '../constants';
import { AriaLabelableProps, AriaLabelProps, FormObject, Reactivify, TypedSchema } from '../types';
import { isEqual, normalizeProps, useUniqId, warn, withRefCapture } from '../utils/common';
import { FormKey } from '@core/useForm';

export interface FormGroupProps<TInput extends FormObject = FormObject, TOutput extends FormObject = TInput> {
  name: string;
  label?: string;
  schema?: TypedSchema<TInput, TOutput>;
}

interface GroupProps extends AriaLabelableProps {
  id: string;
  role?: 'group';
}

interface FormGroupContext {
  prefixPath: (path: string | undefined) => string | undefined;
}

export const FormGroupKey: InjectionKey<FormGroupContext> = Symbol('FormGroup');

export function useFormGroup<TInput extends FormObject = FormObject, TOutput extends FormObject = TInput>(
  _props: Reactivify<FormGroupProps<TInput, TOutput>>,
  elementRef?: Ref<HTMLElement>,
) {
  const id = useUniqId(FieldTypePrefixes.FormGroup);
  const props = normalizeProps(_props);
  const groupRef = elementRef || shallowRef<HTMLInputElement>();
  const form = inject(FormKey, null);
  if (!form) {
    warn('Form groups must have a parent form. Please make sure to call `useForm` at a parent component.');
  }

  const { labelProps, labelledByProps } = useLabel({
    for: id,
    label: props.label,
    targetRef: groupRef,
  });

  const groupProps = computed<GroupProps>(() => {
    const isFieldSet = groupRef.value?.tagName === 'FIELDSET';

    return withRefCapture(
      {
        id,
        ...(isFieldSet ? {} : labelledByProps.value),
        role: isFieldSet ? undefined : 'group',
      },
      groupRef,
      elementRef,
    );
  });

  const FormGroup = createInlineFormGroupComponent({ groupProps, labelProps });

  function getValues() {
    return form?.getFieldValue(toValue(props.name)) ?? {};
  }

  function getErrors() {
    const path = toValue(props.name);
    const allErrors = form?.getErrors() || [];

    return allErrors.filter(e => e.path.startsWith(path));
  }

  const isValid = computed(() => getErrors().length === 0);
  const isTouched = computed(() => form?.isFieldTouched(toValue(props.name)) ?? false);
  const isDirty = computed(() => {
    const path = toValue(props.name);

    return !isEqual(getValues(), form?.getFieldOriginalValue(path) ?? {});
  });

  function getError(name: string) {
    return form?.getFieldErrors(ctx.prefixPath(name) ?? '')?.[0];
  }

  function displayError(name: string) {
    const msg = getError(name);
    const path = ctx.prefixPath(name) ?? '';

    return form?.isFieldTouched(path) ? msg : undefined;
  }

  const ctx: FormGroupContext = {
    prefixPath(path: string | undefined) {
      return prefixGroupPath(toValue(props.name), path);
    },
  };

  provide(FormGroupKey, ctx);

  return {
    groupRef,
    labelProps,
    groupProps,
    FormGroup,
    isDirty,
    isValid,
    isTouched,
    getErrors,
    getValues,
    getError,
    displayError,
  };
}

interface InlineComponentProps {
  groupProps: GroupProps;
  labelProps: AriaLabelProps;
}

function createInlineFormGroupComponent({ groupProps, labelProps }: Reactivify<InlineComponentProps>) {
  const impl = defineComponent({
    setup(_, { slots }) {
      return () => (
        openBlock(),
        createBlock(Fragment),
        slots.default?.({ groupProps: toValue(groupProps), labelProps: toValue(labelProps) })
      );
    },
  });

  return impl as typeof impl & {
    new (): {
      $slots: {
        default: (arg: InlineComponentProps) => VNode[];
      };
    };
  };
}

function prefixGroupPath(prefix: string | undefined, path: string | undefined) {
  if (!path) {
    return path;
  }

  prefix = prefix ? `${prefix}.` : '';

  return `${prefix}${path}`;
}
