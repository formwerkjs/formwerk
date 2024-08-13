import {
  computed,
  createBlock,
  defineComponent,
  Fragment,
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
import { normalizeProps, useUniqId, withRefCapture } from '../utils/common';

export interface FormGroupProps<TInput extends FormObject = FormObject, TOutput extends FormObject = TInput> {
  name?: string;
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
