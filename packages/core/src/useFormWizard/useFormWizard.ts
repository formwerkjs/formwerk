import { computed, onMounted, provide, reactive, ref, shallowRef } from 'vue';
import { Simplify } from 'type-fest';
import { FormProps, useForm } from '../useForm';
import { FormObject } from '../types';
import { merge } from '../../../shared/src';
import { cloneDeep, withRefCapture } from '../utils/common';
import { useControlButtonProps } from '../helpers/useControlButtonProps';
import { FormWizardContextKey } from './types';
import { ConsumableData } from '../useForm/useFormActions';

type SchemalessFormProps<TInput extends FormObject> = Simplify<Omit<FormProps<any, TInput>, 'schema'>>;

export interface FormWizardProps<TInput extends FormObject> extends SchemalessFormProps<TInput> {
  nextLabel?: string;
  previousLabel?: string;
}

export function useFormWizard<TInput extends FormObject>(_props?: FormWizardProps<TInput>) {
  const currentStep = shallowRef<string>();
  const isLastStep = ref(false);
  const values = reactive<TInput>({} as TInput);
  const form = useForm({
    ..._props,
  });

  function beforeStepChange(applyChange: () => void) {
    merge(values, cloneDeep(form.values));
    applyChange();
  }

  function next() {
    if (isLastStep.value) {
      return;
    }

    beforeStepChange(() => {
      moveRelative(1);
    });
  }

  function previous() {
    beforeStepChange(() => {
      moveRelative(-1);
    });
  }

  const nextButtonProps = useControlButtonProps(() => ({
    'aria-label': _props?.nextLabel ?? 'Next',
    onClick: next,
  }));

  const previousButtonProps = useControlButtonProps(() => ({
    'aria-label': _props?.previousLabel ?? 'Previous',
    onClick: previous,
  }));

  provide(FormWizardContextKey, {
    isStepActive: (stepId: string) => currentStep.value === stepId,
  });

  const wizardElement = ref<HTMLElement>();

  const wizardProps = computed(() => withRefCapture({}, wizardElement));

  function moveRelative(delta: number) {
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
  }

  onMounted(() => {
    moveRelative(0);
  });

  function onDone(doneCb: (values: ConsumableData<TInput>) => void) {
    return form.handleSubmit(values => {
      doneCb(values as ConsumableData<TInput>);
    });
  }

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
