import { shallowRef, toValue } from 'vue';
import { FieldTypePrefixes } from '../constants';
import { ControlProps, Reactivify } from '../types';
import { resolveFieldState } from '../useFormField';
import { normalizeProps, propsToValues, useUniqId, useCaptureProps } from '../utils/common';
import { useInputValidity } from '../validation';
import { useFieldControllerContext } from '../useFormField/useFieldController';

export interface CustomControlProps<TValue = unknown> extends ControlProps<TValue> {
  /**
   * Whether the field is readonly.
   */
  readonly?: boolean;

  /**
   * The type of the control, used for devtools.
   */
  controlType?: string;
}

export function useCustomControl<TValue = unknown>(
  _props: Reactivify<CustomControlProps<TValue>, 'schema' | '_field' | 'controlType'>,
) {
  const props = normalizeProps(_props, ['schema', '_field', 'controlType']);
  const controlId = useUniqId(FieldTypePrefixes.CustomField);
  const controlEl = shallowRef<HTMLInputElement>();
  const field = resolveFieldState<TValue>(props);
  const controller = useFieldControllerContext(props);
  const { isDisabled } = field;
  const { updateValidity } = useInputValidity({ field });

  controller?.registerControl({
    getControlElement: () => controlEl.value,
    getControlId: () => controlId,
  });

  const controlProps = useCaptureProps(() => {
    return {
      ...propsToValues(props, ['name', 'readonly']),
      ...controller?.labelledByProps.value,
      ...controller?.describedByProps.value,
      ...controller?.accessibleErrorProps.value,
      'aria-readonly': toValue(props.readonly) ? ('true' as const) : undefined,
      'aria-disabled': isDisabled.value ? ('true' as const) : undefined,
      id: controlId,
    };
  }, controlEl);

  return {
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

    /**
     * The field state.
     */
    field,
  };
}
