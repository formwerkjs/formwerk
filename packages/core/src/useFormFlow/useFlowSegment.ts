import { computed, defineComponent, h, inject, provide, shallowRef } from 'vue';
import { FormFlowContextKey, FlowSegmentProps } from './types';
import { useUniqId, useCaptureProps } from '../utils/common';
import { FieldTypePrefixes } from '../constants';
import { useValidationProvider } from '../validation/useValidationProvider';
import { FormKey } from '../useForm';
import { GenericFormSchema } from '../types';
import { FormGroupContext, FormGroupKey } from '../useFormGroup';

export function useFlowSegment<TSchema extends GenericFormSchema>(props: FlowSegmentProps<TSchema>) {
  const element = shallowRef<HTMLElement>();
  const id = useUniqId(FieldTypePrefixes.FlowSegment);
  const formFlow = inject(FormFlowContextKey, null);
  if (!formFlow) {
    throw new Error('FormFlowSegment must be used within a FormFlow, did you forget to call `useFormFlow`?');
  }

  formFlow.registerSegment({ id, name: () => props.name ?? id });
  const form = inject(FormKey, null);

  const { validate, onValidationDispatch, defineValidationRequest, onValidationDone, dispatchValidateDone } =
    useValidationProvider({
      getValues: () => form?.getValues(),
      schema: props.schema,
      type: 'GROUP',
    });

  const requestValidation = defineValidationRequest(async res => {
    // Clears Errors in that path before proceeding.
    form?.clearErrors();
    for (const entry of res.errors) {
      form?.setErrors(entry.path, entry.messages);
    }

    dispatchValidateDone();
  });

  const ctx: FormGroupContext = {
    onValidationDispatch,
    onValidationDone,
    requestValidation,
    getValidationMode: () => (props.schema ? 'schema' : 'aggregate'),
    getHtmlValidationState: () => 'enabled',
  };

  const isActive = computed(() => formFlow.isSegmentActive(id));

  const segmentProps = useCaptureProps(() => {
    return {
      'data-form-segment-id': id,
      'data-active': isActive.value ? 'true' : undefined,
    };
  }, element);

  // Whenever the form is validated, only validate if the step is active.
  form?.onValidationDispatch(enqueue => {
    if (!isActive.value) {
      return;
    }

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

  // Form steps act as a form group, but they offer no path prefixing.
  provide(FormGroupKey, ctx);

  return {
    /**
     * Reference to the step element.
     */
    segmentElement: element,

    /**
     * Props for the step element.
     */
    segmentProps,

    /**
     * Whether the segment is active.
     */
    isActive,
  };
}

export const FormFlowSegment = /*#__PURE__*/ defineComponent({
  name: 'FormFlowSegment',
  props: ['as', 'schema', 'name'],
  setup(props, { attrs, slots }) {
    const { segmentProps, isActive } = useFlowSegment(props);

    return () =>
      h(
        props.as || 'div',
        {
          style: isActive.value ? undefined : { display: 'none' },
          ...attrs,
          ...segmentProps.value,
        },
        isActive.value ? slots.default?.() : [],
      );
  },
});
