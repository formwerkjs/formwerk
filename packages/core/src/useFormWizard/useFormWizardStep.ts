import { computed, defineComponent, h, inject, provide, ref } from 'vue';
import { FormWizardContextKey, FormWizardStepProps } from './types';
import { useUniqId, withRefCapture } from '../utils/common';
import { FieldTypePrefixes } from '../constants';
import { useValidationProvider } from '../validation/useValidationProvider';
import { FormKey } from '../useForm';
import { GenericFormSchema } from '../types';
import { FormGroupContext, FormGroupKey } from '../useFormGroup';

export function useFormWizardStep<TSchema extends GenericFormSchema>(props: FormWizardStepProps<TSchema>) {
  const element = ref<HTMLElement>();
  const id = useUniqId(FieldTypePrefixes.FormWizardStep);
  const wizard = inject(FormWizardContextKey, null);
  if (!wizard) {
    throw new Error('FormWizardStep must be used within a FormWizard');
  }

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
    isHtmlValidationDisabled: () => false,
  };

  const isActive = computed(() => wizard.isStepActive(id));

  const stepProps = computed(() => {
    return withRefCapture(
      {
        'data-form-step': true,
        'data-form-step-id': id,
        'data-active': isActive.value ? 'true' : undefined,
      },
      element,
    );
  });

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
    stepEl: element,
    /**
     * Props for the step element.
     */
    stepProps,
    /**
     * Whether the step is active.
     */
    isActive,
  };
}

export const FormWizardStep = /*#__PURE__*/ defineComponent({
  name: 'FormWizardStep',
  props: ['as', 'schema'],
  setup(props, { attrs, slots }) {
    const { stepProps, isActive } = useFormWizardStep(props);

    return () => h(props.as || 'div', { ...attrs, ...stepProps.value }, isActive.value ? slots.default?.() : []);
  },
});
