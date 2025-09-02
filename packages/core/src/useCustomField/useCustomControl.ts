import { shallowRef, toValue } from 'vue';
import { FieldTypePrefixes } from '../constants';
import { ControlProps, Reactivify } from '../types';
import { exposeField, resolveControlField } from '../useFormField';
import { normalizeProps, propsToValues, useUniqId, useCaptureProps } from '../utils/common';
import { useInputValidity } from '../validation';

export interface CustomControlProps<TValue = unknown> extends ControlProps<TValue> {
  /**
   * Whether the field is readonly.
   */
  readonly?: boolean;
}

export function useCustomControl<TValue = unknown>(
  _props: Reactivify<CustomControlProps<TValue>, 'schema' | '_field'>,
) {
  const props = normalizeProps(_props, ['schema', '_field']);
  const controlId = useUniqId(FieldTypePrefixes.CustomField);
  const controlEl = shallowRef<HTMLInputElement>();
  const field = resolveControlField<TValue>(props);
  const { labelledByProps, accessibleErrorProps, describedByProps, isDisabled } = field;
  const { updateValidity } = useInputValidity({ field });

  field.registerControl({
    getControlElement: () => controlEl.value,
    getControlId: () => controlId,
  });

  const controlProps = useCaptureProps(() => {
    return {
      ...propsToValues(props, ['name', 'readonly']),
      ...labelledByProps.value,
      ...describedByProps.value,
      ...accessibleErrorProps.value,
      'aria-readonly': toValue(props.readonly) ? ('true' as const) : undefined,
      'aria-disabled': isDisabled.value ? ('true' as const) : undefined,
      id: controlId,
    };
  }, controlEl);

  return exposeField(
    {
      /**
       * The id of the control element.
       */
      controlId,

      /**
       * Props for the control element/group.
       */
      controlProps,
      /**
       * Validates the field.
       */
      validate: updateValidity,
    },
    field,
  );
}
