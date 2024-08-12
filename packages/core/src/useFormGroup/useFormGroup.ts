import { computed, Ref, shallowRef } from 'vue';
import { useLabel } from '../a11y/useLabel';
import { FieldTypePrefixes } from '../constants';
import { FormObject, Reactivify, TypedSchema } from '../types';
import { normalizeProps, useUniqId, withRefCapture } from '../utils/common';

export interface FormGroupProps<TInput extends FormObject = FormObject, TOutput extends FormObject = TInput> {
  label?: string;
  schema?: TypedSchema<TInput, TOutput>;
}

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

  const groupProps = computed(() => {
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

  return {
    groupRef,
    labelProps,
    groupProps,
  };
}
