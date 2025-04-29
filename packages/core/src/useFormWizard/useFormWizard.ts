import { computed, nextTick, onMounted, provide, reactive, ref, shallowRef } from 'vue';
import { Simplify } from 'type-fest';
import { FormProps, useForm } from '../useForm';
import { FormObject } from '../types';
import { merge } from '../../../shared/src';
import { cloneDeep, isFormElement, withRefCapture } from '../utils/common';
import { useControlButtonProps } from '../helpers/useControlButtonProps';
import { FormWizardContextKey } from './types';
import { asConsumableData, ConsumableData } from '../useForm/useFormActions';
import { createEventDispatcher } from '../utils/events';

type SchemalessFormProps<TInput extends FormObject> = Simplify<Omit<FormProps<any, TInput>, 'schema'>>;

export interface FormWizardProps<TInput extends FormObject> extends SchemalessFormProps<TInput> {
  nextLabel?: string;
  previousLabel?: string;
}

export function useFormWizard<TInput extends FormObject>(_props?: FormWizardProps<TInput>) {
  const currentStep = shallowRef<string>();
  const isLastStep = ref(false);
  const wizardElement = ref<HTMLElement>();
  const values = reactive<TInput>({} as TInput);
  const stepValues = new Map<string, TInput>();
  const form = useForm(_props);
  const [dispatchDone, onDone] = createEventDispatcher<ConsumableData<TInput>>('done');

  function beforeStepChange(applyChange: () => void) {
    if (currentStep.value) {
      merge(values, cloneDeep(form.values));
      stepValues.set(currentStep.value, cloneDeep(form.values) as TInput);
    }

    applyChange();
  }

  const next = form.handleSubmit(async () => {
    if (isLastStep.value) {
      dispatchDone(asConsumableData(cloneDeep(values) as TInput));
      return;
    }

    beforeStepChange(() => {
      moveRelative(1);
    });
  });

  function previous() {
    beforeStepChange(() => {
      moveRelative(-1);
    });
  }

  const nextButtonProps = useControlButtonProps(() => ({
    'aria-label': _props?.nextLabel ?? 'Next',
    type: 'submit',
    tabindex: '0',
    onClick: isFormElement(wizardElement.value) ? undefined : next,
  }));

  const previousButtonProps = useControlButtonProps(() => ({
    'aria-label': _props?.previousLabel ?? 'Previous',
    tabindex: '0',
    onClick: previous,
  }));

  provide(FormWizardContextKey, {
    isStepActive: (stepId: string) => currentStep.value === stepId,
  });

  function onSubmit(e: Event) {
    e.preventDefault();
    next();
  }

  const wizardProps = computed(() => {
    const isForm = isFormElement(wizardElement.value);

    return withRefCapture(
      {
        novalidate: isForm ? true : undefined,
        onSubmit: isForm ? onSubmit : undefined,
      },
      wizardElement,
    );
  });

  async function moveRelative(delta: number) {
    const steps = Array.from(wizardElement.value?.querySelectorAll(`[data-form-step]`) || []) as HTMLElement[];
    let idx = steps.findIndex(step => step.dataset.active);
    if (idx === -1) {
      idx = 0;
    }

    const newStepIndex = idx + delta;

    if (newStepIndex < 0 || newStepIndex >= steps.length) {
      return;
    }

    if (steps[newStepIndex]) {
      currentStep.value = steps[newStepIndex].dataset.formStepId;
    }

    isLastStep.value = newStepIndex === steps.length - 1;
    await nextTick();
    // restore field values
    if (currentStep.value && stepValues.has(currentStep.value)) {
      form.setValues(stepValues.get(currentStep.value) as TInput, { behavior: 'replace' });
    }
  }

  onMounted(() => {
    moveRelative(0);
  });

  return {
    values,
    isLastStep,
    wizardElement,
    wizardProps,
    nextButtonProps,
    previousButtonProps,
    next,
    previous,
    onDone,
  };
}
